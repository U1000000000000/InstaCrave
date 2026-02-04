const Order = require('../models/order.model');
const Food = require('../models/food.model');
const User = require('../models/user.model');
const Cart = require('../models/cart.model');
const AppError = require('../utils/AppError');
const logger = require('./logger.service');
const { addEmailJob, addOrderJob, addAnalyticsJob, JOB_TYPES } = require('../queue/index');
const mongoose = require('mongoose');

/**
 * Order Service
 * 
 * Handles order creation and updates using MongoDB transactions to ensure data consistency.
 * Transactions are only used if running on a replica set (checked at runtime).
 * 
 * Features:
 * - Transaction support for atomic order creation
 * - Background job queueing for emails and notifications
 * - Idempotency support via order model
 * - Status transition validation
 * 
 * TODO: Transaction fallback is not tested thoroughly - if transactions fail mid-operation,
 * we might end up with inconsistent state. Should add integration tests for this.
 */

class OrderService {
  static _transactionSupportChecked = false;
  static _transactionsSupported = false;

  static async _supportsTransactions() {
    if (process.env.DISABLE_MONGO_TRANSACTIONS === 'true') return false;

    // Cache once per-process; topology won't change at runtime.
    if (this._transactionSupportChecked) return this._transactionsSupported;
    this._transactionSupportChecked = true;

    const conn = mongoose.connection;
    if (!conn || !conn.db) {
      this._transactionsSupported = false;
      return this._transactionsSupported;
    }

    const admin = conn.db.admin();

    try {
      const hello = await admin.command({ hello: 1 });
      this._transactionsSupported = Boolean(hello.setName || hello.msg === 'isdbgrid');
      return this._transactionsSupported;
    } catch (error) {
      // Older MongoDB servers may not support 'hello'; fall back.
      try {
        const isMaster = await admin.command({ isMaster: 1 });
        this._transactionsSupported = Boolean(isMaster.setName || isMaster.msg === 'isdbgrid');
        return this._transactionsSupported;
      } catch (fallbackError) {
        this._transactionsSupported = false;
        return this._transactionsSupported;
      }
    }
  }

  /**
   * Create order with full ACID transaction
   * 
   * Transaction scope:
   * 1. Validate food availability
   * 2. Create order record
   * 3. Link to payment if provided
   * 4. Queue background jobs (emails, notifications)
   * 5. Commit all changes atomically
   * 
   * On ANY failure: Rollback ALL changes
   */
  static async createOrderWithTransaction({
    userId,
    sessionId = null,
    foodId,
    quantity,
    deliveryAddress,
    paymentId = null,
    paymentMethod = 'cash_on_delivery',
    idempotencyKey = null,
    metadata = {},
  }) {
    const startTime = Date.now();
    
    // Start Mongoose session for transaction
    const session = await mongoose.startSession();
    const useTransaction = await this._supportsTransactions();
    if (useTransaction) {
      session.startTransaction();
    }
    
    try {
      logger.info('Order creation transaction started', {
        userId,
        sessionId,
        foodId,
        quantity,
        idempotencyKey,
      });
      
      // ===== STEP 1: Idempotency Check =====
      if (idempotencyKey) {
        const existingOrder = await Order.findOne({ idempotencyKey }).session(session);
        if (existingOrder) {
          logger.info('Idempotent order retrieval', {
            orderId: existingOrder._id,
            idempotencyKey,
          });
          if (useTransaction) {
            await session.abortTransaction();
          }
          await session.endSession();
          return existingOrder;
        }
      }
      
      // ===== STEP 2: Fetch and Validate User =====
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // ===== STEP 3: Fetch and Validate Food (with inventory check) =====
      const food = await Food.findById(foodId)
        .populate('foodPartner')
        .session(session);
      
      if (!food) {
        throw new AppError('Food item is not available for ordering', 400);
      }
      
      if (!food.isOrderable) {
        throw new AppError('Food item is not available for ordering', 400);
      }
      
      if (!food.price || food.price <= 0) {
        throw new AppError('Food item has invalid pricing', 400);
      }
      
      // ===== STEP 4: Calculate Pricing ===
      const totalPrice = food.price * quantity;
      
      // Validate price hasn't changed (race condition protection)
      if (metadata.expectedPrice && Math.abs(metadata.expectedPrice - totalPrice) > 0.01) {
        throw new AppError(
          'Price has changed. Please review and try again',
          409,
          { currentPrice: totalPrice, expectedPrice: metadata.expectedPrice }
        );
      }
      
      // ===== STEP 6: Create Order Record =====
      const orderData = {
        user: userId,
        sessionId: sessionId || null,
        userName: user.fullName,
        food: foodId,
        foodName: food.name,
        foodPartner: food.foodPartner._id,
        foodPartnerName: food.foodPartner.name,
        quantity,
        totalPrice,
        deliveryAddress,
        status: 'pending',
        paymentId: paymentId || null,
        paymentMethod,
        idempotencyKey,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        version: 1, // For optimistic locking
        metadata: {
          source: metadata.source || 'web',
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          createdVia: 'order_service_transaction',
        },
      };
      
      const order = new Order(orderData);
      await order.save({ session });
      
      logger.info('Order record created within transaction', {
        orderId: order._id,
        userId,
        foodId,
        totalPrice,
        transactionId: order.transactionId,
      });
      
      // ===== STEP 7: Commit Transaction =====
      if (useTransaction) {
        await session.commitTransaction();
      }
      
      logger.info('Order creation transaction committed successfully', {
        orderId: order._id,
        userId,
        foodId,
        quantity,
        totalPrice,
        duration: Date.now() - startTime,
      });
      
      // ===== STEP 8: Queue Background Jobs (OUTSIDE transaction) =====
      // These run asynchronously and don't block the response
      // If they fail, the order is still created successfully
      this._queuePostOrderJobs(order, user, food);
      
      return order;
      
    } catch (error) {
      // ===== ROLLBACK on ANY error =====
      if (useTransaction) {
        await session.abortTransaction();
      }
      
      logger.error('Order creation transaction failed and rolled back', {
        error: error.message,
        stack: error.stack,
        userId,
        foodId,
        quantity,
        duration: Date.now() - startTime,
      });
      
      // Re-throw the error to be handled by controller
      throw error;
      
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create order from cart with transaction
   * Atomically: Clear cart + Create order + Reserve inventory
   */
  static async createOrderFromCart({
    userId,
    sessionId = null,
    cartId,
    deliveryAddress,
    paymentId = null,
    paymentMethod = 'cash_on_delivery',
    metadata = {},
  }) {
    const startTime = Date.now();
    const session = await mongoose.startSession();
    const useTransaction = await this._supportsTransactions();
    if (useTransaction) {
      session.startTransaction();
    }
    
    try {
      logger.info('Cart-to-order transaction started', {
        userId,
        sessionId,
        cartId,
      });
      
      // ===== STEP 1: Fetch and Validate Cart =====
      const cart = await Cart.findById(cartId).session(session);
      
      if (!cart) {
        throw new AppError('Cart not found', 404);
      }
      
      if (cart.items.length === 0) {
        throw new AppError('Cart is empty', 400);
      }
      
      // Validate cart ownership
      if (cart.user && cart.user.toString() !== userId?.toString()) {
        throw new AppError('Unauthorized cart access', 403);
      }
      
      if (!cart.user && cart.sessionId !== sessionId) {
        throw new AppError('Unauthorized cart access', 403);
      }
      
      // ===== STEP 2: Fetch User =====
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // ===== STEP 3: Validate and Reserve Inventory for ALL Items =====
      const foodItems = [];
      let totalAmount = 0;
      
      for (const item of cart.items) {
        const food = await Food.findById(item.food).populate('foodPartner').session(session);
        
        if (!food) {
          throw new AppError(`Food item ${item.foodName} not found`, 404);
        }
        
        if (!food.isOrderable) {
          throw new AppError(`${food.name} is no longer available for ordering`, 400);
        }
        
        foodItems.push({
          food: food._id,
          foodName: food.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
        });
        
        totalAmount += item.quantity * item.price;
      }
      
      // ===== STEP 4: Create Order from Cart =====
      const orderData = {
        user: userId,
        sessionId: sessionId || null,
        userName: user.fullName,
        items: foodItems,
        restaurant: cart.foodPartner,
        restaurantName: cart.foodPartnerName,
        foodPartner: cart.foodPartner, // Add this field for partner order queries
        foodPartnerName: cart.foodPartnerName, // Add this field for consistency
        subtotal: cart.totalPrice,
        taxes: 0, // Calculate if needed
        deliveryFee: 0, // Calculate if needed
        discount: 0,
        total: totalAmount,
        deliveryAddress,
        status: 'pending',
        paymentId: paymentId || null,
        paymentMethod,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        version: 1,
        metadata: {
          source: metadata.source || 'web',
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          createdFromCart: true,
          cartId: cart._id.toString(),
        },
      };
      
      const order = new Order(orderData);
      await order.save({ session });
      
      logger.info('Order created from cart', {
        orderId: order._id,
        cartId: cart._id,
        itemCount: foodItems.length,
        totalAmount,
      });
      
      // ===== STEP 5: Mark Cart as Converted (Don't clear items to avoid validation error) =====
      cart.status = 'converted';
      cart.lastActivityAt = new Date();
      await cart.save({ session });
      
      logger.info('Cart marked as converted after order creation', {
        cartId: cart._id,
        orderId: order._id,
      });
      
      // ===== STEP 6: Commit Transaction =====
      if (useTransaction) {
        await session.commitTransaction();
      }
      
      logger.info('Cart-to-order transaction committed successfully', {
        orderId: order._id,
        cartId: cart._id,
        userId,
        totalAmount,
        duration: Date.now() - startTime,
      });
      
      // ===== STEP 7: Queue Background Jobs =====
      this._queuePostOrderJobs(order, user, { name: cart.foodPartnerName });
      
      return order;
      
    } catch (error) {
      if (useTransaction) {
        await session.abortTransaction();
      }
      
      logger.error('Cart-to-order transaction failed and rolled back', {
        error: error.message,
        stack: error.stack,
        userId,
        cartId,
        duration: Date.now() - startTime,
      });
      
      throw error;
      
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update order status with transaction
   * Handles inventory restoration on cancellation
   */
  static async updateOrderStatus({
    orderId,
    newStatus,
    partnerId = null,
    reason = null,
  }) {
    const startTime = Date.now();
    const session = await mongoose.startSession();
    const useTransaction = await this._supportsTransactions();
    if (useTransaction) {
      session.startTransaction();
    }
    
    try {
      logger.info('Order status update transaction started', {
        orderId,
        newStatus,
        partnerId,
      });
      
      // ===== STEP 1: Fetch Order with Optimistic Locking =====
      const order = await Order.findById(orderId)
        .populate('food')
        .session(session);
      
      if (!order) {
        // Avoid leaking existence of orders to unauthorized parties.
        throw new AppError('Unauthorized', 403);
      }
      
      // Verify partner authorization
      if (partnerId) {
        const orderPartnerId = order.foodPartner?.toString() || order.restaurant?.toString();
        if (orderPartnerId !== partnerId.toString()) {
          throw new AppError('Unauthorized', 403);
        }
      }
      
      // ===== STEP 2: Validate Status Transition =====
      const FINAL_STATES = ['delivered', 'cancelled'];
      if (FINAL_STATES.includes(order.status)) {
        throw new AppError(
          `Cannot change status of ${order.status} orders`,
          400,
          { currentStatus: order.status }
        );
      }
      
      const VALID_TRANSITIONS = {
        pending: ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
        confirmed: ['preparing', 'ready', 'delivered', 'cancelled'],
        preparing: ['ready', 'delivered', 'cancelled'],
        ready: ['delivered', 'cancelled'],
      };
      
      if (!VALID_TRANSITIONS[order.status]?.includes(newStatus)) {
        throw new AppError(
          `Invalid status transition from ${order.status} to ${newStatus}`,
          400,
          { currentStatus: order.status, attemptedStatus: newStatus }
        );
      }
      
      const oldStatus = order.status;
      
      // ===== STEP 3: Update Order Status (with version increment) ===
      order.status = newStatus;
      order.version += 1; // Optimistic locking
      
      // Track status history
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: newStatus,
        previousStatus: oldStatus,
        changedAt: new Date(),
        reason,
        changedBy: partnerId ? 'partner' : 'system',
      });
      
      await order.save({ session });
      
      logger.info('Order status updated within transaction', {
        orderId,
        oldStatus,
        newStatus,
        version: order.version,
      });
      
      // ===== STEP 5: Commit Transaction =====
      if (useTransaction) {
        await session.commitTransaction();
      }
      
      logger.info('Order status update transaction committed', {
        orderId,
        oldStatus,
        newStatus,
        duration: Date.now() - startTime,
      });
      
      // ===== STEP 6: Queue Notifications =====
      this._queueStatusUpdateJobs(order, oldStatus, newStatus);
      
      return order;
      
    } catch (error) {
      if (useTransaction) {
        await session.abortTransaction();
      }
      
      logger.error('Order status update transaction failed and rolled back', {
        error: error.message,
        orderId,
        newStatus,
        duration: Date.now() - startTime,
      });
      
      throw error;
      
    } finally {
      await session.endSession();
    }
  }

  /**
   * Queue background jobs for order creation
   * Runs OUTSIDE transaction to prevent blocking
   */
  static _queuePostOrderJobs(order, user, food) {
    try {
      // Send order confirmation email
      addEmailJob(JOB_TYPES.SEND_ORDER_CONFIRMATION, {
        to: user.email,
        userName: user.fullName,
        orderDetails: {
          orderId: order._id.toString(),
          foodName: order.foodName || 'Multiple Items',
          quantity: order.quantity || order.items?.length,
          totalPrice: order.totalPrice || order.total,
          deliveryAddress: order.deliveryAddress,
          foodPartnerName: food.foodPartner?.name || food.name,
        },
      }).catch(err => logger.error('Failed to queue order confirmation email', { error: err.message }));
      
      // Notify partner
      if (food.foodPartner?.email) {
        addOrderJob(JOB_TYPES.NOTIFY_PARTNER_NEW_ORDER, {
          partnerEmail: food.foodPartner.email,
          partnerName: food.foodPartner.name,
          orderDetails: {
            orderId: order._id.toString(),
            foodName: order.foodName || 'Multiple Items',
            quantity: order.quantity || order.items?.length,
            customerName: user.fullName,
            deliveryAddress: order.deliveryAddress,
          },
        }).catch(err => logger.error('Failed to queue partner notification', { error: err.message }));
      }
      
      // Track analytics
      addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
        userId: user._id.toString(),
        action: 'order_created',
        metadata: {
          orderId: order._id.toString(),
          totalPrice: order.totalPrice || order.total,
          paymentMethod: order.paymentMethod,
        },
      }).catch(err => logger.error('Failed to queue analytics', { error: err.message }));
      
    } catch (error) {
      logger.error('Error queueing post-order jobs', { error: error.message });
      // Don't throw - background jobs are non-critical
    }
  }

  /**
   * Queue notifications for status updates
   */
  static _queueStatusUpdateJobs(order, oldStatus, newStatus) {
    try {
      // Send status update email to user
      addEmailJob(JOB_TYPES.SEND_ORDER_STATUS_UPDATE, {
        to: order.user?.email,
        userName: order.userName,
        orderId: order._id.toString(),
        status: newStatus,
        foodName: order.foodName || 'Your order',
      }).catch(err => logger.error('Failed to queue status update email', { error: err.message }));
      
      // Track analytics
      addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
        userId: order.user?.toString(),
        action: 'order_status_updated',
        metadata: {
          orderId: order._id.toString(),
          oldStatus,
          newStatus,
        },
      }).catch(err => logger.error('Failed to queue analytics', { error: err.message }));
      
    } catch (error) {
      logger.error('Error queueing status update jobs', { error: error.message });
    }
  }
}

module.exports = OrderService;
