const Payment = require('../models/payment.model');
const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const logger = require('../services/logger.service');
const mockGateway = require('./payment.gateway.mock');
const { emitOrderCreated } = require('./socket.service');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

/**
 * Payment Service
 * 
 * Handles payment operations via a mock gateway (not connected to real payment providers).
 * 
 * Handles:
 * - Payment initiation and processing
 * - Basic fraud scoring
 * - Idempotency via client-provided keys
 * - Retry logic with exponential backoff
 * - Refund processing
 */

class PaymentService {
  /**
   * Initiate payment - creates payment record and prepares for processing
   */
  static async initiatePayment(userId, cartId, sessionId, paymentData) {
    const startTime = Date.now();
    
    try {
      logger.info('Payment initiation started', {
        userId,
        cartId,
        sessionId,
        amount: paymentData.amount,
        method: paymentData.paymentMethod,
      });
      
      // Validate cart exists and belongs to user
      const cart = await Cart.findById(cartId);
      if (!cart) {
        logger.warn('Cart not found for payment initiation', { cartId });
        throw new AppError('Cart not found', 404);
      }
      
      // Check cart ownership
      // For authenticated users: cart.user must match userId
      // For anonymous users: cart.sessionId must match sessionId
      const isUserCart = cart.user && userId && cart.user.toString() === userId.toString();
      const isSessionCart = !cart.user && cart.sessionId && cart.sessionId === sessionId;
      
      if (!isUserCart && !isSessionCart) {
        logger.warn('Cart ownership validation failed', { 
          userId: userId?.toString(), 
          cartId, 
          cartUser: cart.user?.toString(), 
          cartSessionId: cart.sessionId,
          sessionId 
        });
        throw new AppError('Unauthorized cart access', 403);
      }
      
      // Validate amount matches cart total
      if (Math.abs(paymentData.amount - cart.total) > 0.01) {
        logger.warn('Payment amount mismatch', {
          cartId,
          paymentAmount: paymentData.amount,
          cartTotal: cart.total,
        });
        throw new AppError('Payment amount does not match cart total', 400);
      }
      
      // Check for duplicate payment within 5 minutes
      const recentPayment = await Payment.findOne({
        cart: cartId,
        status: { $in: ['pending', 'processing'] },
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
      });
      
      if (recentPayment) {
        logger.info('Duplicate payment attempt detected', {
          cartId,
          recentPaymentId: recentPayment._id,
        });
        return recentPayment;
      }
      
      // Real idempotency: allow client-provided Idempotency-Key header.
      // Controllers pass headers into paymentData (if present) via metadata.
      const idempotencyKeyHeader = paymentData?.idempotencyKey;
      const normalizedIdempotencyKey = idempotencyKeyHeader
        ? String(idempotencyKeyHeader).trim()
        : '';

      if (normalizedIdempotencyKey.length > 128) {
        throw new AppError('Idempotency-Key too long', 400);
      }

      const seed = normalizedIdempotencyKey || crypto.randomBytes(16).toString('hex');
      const idempotencyKey = Payment.generateIdempotencyKey(userId || sessionId, cartId, seed);
      
      // Check existing payment with idempotency key
      const existingPayment = await Payment.findOne({ idempotencyKey });
      if (existingPayment && existingPayment.status !== 'failed') {
        logger.info('Idempotent payment retrieval', {
          cartId,
          paymentId: existingPayment._id,
          status: existingPayment.status,
        });
        return existingPayment;
      }
      
      // Create payment record
      const payment = new Payment({
        user: userId || null,
        sessionId: sessionId || null,
        cart: cartId,
        cartItems: this._snapshotCartItems(cart),
        deliveryAddress: paymentData.deliveryAddress,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        paymentMethod: paymentData.paymentMethod,
        paymentGateway: paymentData.paymentGateway || 'mock',
        idempotencyKey,
        status: 'pending',
        metadata: {
          ipAddress: paymentData.ipAddress,
          userAgent: paymentData.userAgent,
          deviceId: paymentData.deviceId,
          country: paymentData.country,
          timezone: paymentData.timezone,
        },
      });
      
      // Perform fraud detection
      await this._detectFraud(payment, userId, sessionId);
      
      // Save payment
      await payment.save();
      
      logger.info('Payment initiated successfully', {
        paymentId: payment._id,
        cartId,
        amount: payment.amount,
        fraudScore: payment.fraudScore,
        duration: Date.now() - startTime,
      });
      
      return payment;
    } catch (error) {
      logger.error('Payment initiation failed', {
        error: error.message,
        userId,
        cartId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Process payment through gateway and create order
   */
  static async processPayment(paymentId, cardData = null) {
    const startTime = Date.now();
    
    const session = await Payment.startSession();
    session.startTransaction();
    
    try {
      logger.info('Payment processing started', { paymentId });
      
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
      
      // Check if already processed
      if (payment.status === 'success') {
        logger.info('Payment already processed (idempotent return)', { paymentId });
        await session.endSession();
        return payment;
      }
      
      if (payment.status === 'processing') {
        logger.warn('Payment already processing', { paymentId });
        throw new AppError('Payment is already being processed', 409);
      }
      
      // Check fraud blocking
      if (payment.isFraudBlocked()) {
        await payment.updateStatus('failed', 'Payment blocked due to fraud detection', 'FRAUD_BLOCKED');
        await payment.save({ session });
        
        logger.warn('Payment blocked by fraud detection', {
          paymentId,
          fraudScore: payment.fraudScore,
          fraudFlags: payment.fraudFlags,
        });
        
        await session.abortTransaction();
        await session.endSession();
        throw new AppError('Payment blocked due to fraud detection', 403);
      }
      
      // Mark as processing
      await payment.updateStatus('processing');
      await payment.save({ session });
      
      // Process with gateway
      let gatewayResponse;
      try {
        gatewayResponse = await mockGateway.processPayment({
          paymentId: payment._id.toString(),
          amount: payment.amount,
          currency: payment.currency,
          method: payment.paymentMethod,
          cardData,
          idempotencyKey: payment.idempotencyKey,
        });
        
        logger.info('Gateway response received', {
          paymentId,
          transactionId: gatewayResponse.transactionId,
          status: gatewayResponse.status,
        });
      } catch (gatewayError) {
        logger.error('Gateway processing failed', {
          paymentId,
          error: gatewayError.message,
        });
        
        payment.incrementRetry();
        await payment.updateStatus('failed', gatewayError.message, 'GATEWAY_ERROR');
        await payment.save({ session });
        
        await session.abortTransaction();
        await session.endSession();
        throw gatewayError;
      }
      
      // Check gateway response
      if (gatewayResponse.status !== 'success') {
        await payment.updateStatus('failed', gatewayResponse.message, gatewayResponse.code);
        payment.incrementRetry();
        await payment.save({ session });
        
        logger.warn('Gateway returned failed status', {
          paymentId,
          code: gatewayResponse.code,
          message: gatewayResponse.message,
        });
        
        await session.abortTransaction();
        await session.endSession();
        throw new AppError(`Payment failed: ${gatewayResponse.message}`, 402);
      }
      
      // Update payment with gateway response
      payment.transactionId = gatewayResponse.transactionId;
      payment.gatewayResponse = {
        status: gatewayResponse.status,
        transactionId: gatewayResponse.transactionId,
        timestamp: new Date(),
      };
      
      // Tokenize card if provided
      if (cardData) {
        payment.cardTokenized = true;
        payment.last4Digits = cardData.last4Digits;
        payment.cardBrand = cardData.brand;
        payment.expiryMonth = cardData.expiryMonth;
        payment.expiryYear = cardData.expiryYear;
      }
      
      // Convert cart to order within transaction
      const cart = await Cart.findById(payment.cart).session(session);
      if (!cart) {
        throw new Error('Cart no longer exists');
      }
      
      // Fetch user details if payment has a user
      let userName = 'Guest User';
      if (payment.user) {
        const User = require('../models/user.model');
        const user = await User.findById(payment.user).session(session);
        if (user) {
          userName = user.fullName || user.email || 'Guest User';
        }
      }
      
      // Create order from cart
      const order = new Order({
        user: payment.user || null,
        userName: userName,
        sessionId: payment.sessionId || null,
        items: cart.items.map(item => ({
          food: item.food,
          foodName: item.foodName,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        restaurant: cart.restaurant || cart.foodPartner,
        restaurantName: cart.foodPartnerName || 'Unknown Restaurant',
        foodPartner: cart.foodPartner,
        foodPartnerName: cart.foodPartnerName,
        deliveryAddress: payment.deliveryAddress,
        subtotal: cart.subtotal,
        taxes: cart.taxes,
        deliveryFee: cart.deliveryFee,
        discount: cart.discount,
        total: cart.total,
        paymentId: payment._id,
        paymentMethod: payment.paymentMethod,
        status: 'confirmed',
        orderNotes: 'Order created from payment processing',
      });
      
      await order.save({ session });
      
      logger.info('Order created from payment', {
        orderId: order._id,
        paymentId,
        total: order.total,
      });
      
      // Link payment to order
      payment.order = order._id;
      
      // Mark payment as successful
      await payment.updateStatus('success');
      await payment.save({ session });
      
      // Mark cart as converted (don't clear items to avoid validation error)
      cart.status = 'converted';
      cart.lastActivityAt = new Date();
      await cart.save({ session });
      
      await session.commitTransaction();
      
      logger.info('Payment processed successfully', {
        paymentId,
        orderId: order._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        duration: Date.now() - startTime,
      });
      
      // Emit real-time event to food partner
      try {
        // Populate order for WebSocket event
        const populatedOrder = await Order.findById(order._id)
          .populate('foodPartner')
          .populate('restaurant')
          .populate({
            path: 'items.food',
            model: 'food'
          });
        
        if (populatedOrder) {
          emitOrderCreated(populatedOrder);
          logger.info('Emitted order:created event for cart-based order', {
            orderId: order._id,
            partnerId: cart.foodPartner,
          });
        }
      } catch (wsError) {
        logger.error('Failed to emit WebSocket event for cart-based order', {
          error: wsError.message,
          orderId: order._id,
        });
      }
      
      // Log business event
      logger.business('payment_successful', {
        paymentId: payment._id.toString(),
        orderId: order._id.toString(),
        userId: payment.user?.toString(),
        amount: payment.amount,
        method: payment.paymentMethod,
      });
      
      return payment;
    } catch (error) {
      await session.abortTransaction();
      
      logger.error('Payment processing failed', {
        paymentId,
        error: error.message,
        duration: Date.now() - startTime,
      });
      
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Detect fraud using scoring system
   */
  static async _detectFraud(payment, userId, sessionId) {
    let fraudScore = 0;
    const fraudFlags = [];
    
    try {
      // Check for test card patterns
      if (payment.paymentMethod === 'card' && payment.metadata?.cardNumber) {
        if (payment.metadata.cardNumber.startsWith('4111')) {
          fraudScore += 5;
          fraudFlags.push('test_card_pattern');
        }
      }
      
      // Check for high-risk amounts
      if (payment.amount > 500) {
        fraudScore += 10;
        fraudFlags.push('amount_anomaly');
      }
      
      // Check for high-risk regions
      const highRiskRegions = ['XX', 'KP', 'IR', 'SY'];
      if (payment.metadata?.country && highRiskRegions.includes(payment.metadata.country)) {
        fraudScore += 20;
        fraudFlags.push('high_risk_region');
      }
      
      // Check for velocity attacks (multiple payments in short time)
      if (userId) {
        const recentPayments = await Payment.countDocuments({
          user: userId,
          createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
        });
        
        if (recentPayments > 3) {
          fraudScore += 15;
          fraudFlags.push('velocity_exceeded');
        }
      }
      
      // Check for duplicate attempts
      const similarPayments = await Payment.countDocuments({
        amount: payment.amount,
        'metadata.ipAddress': payment.metadata?.ipAddress,
        status: 'failed',
        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      
      if (similarPayments > 2) {
        fraudScore += 15;
        fraudFlags.push('duplicate_attempt');
      }
      
      payment.setFraudDetection(fraudScore, fraudFlags);
      
      if (fraudScore > 0) {
        logger.security('fraud_score_calculated', {
          paymentId: payment._id.toString(),
          fraudScore,
          fraudFlags,
        });
      }
    } catch (error) {
      logger.error('Fraud detection failed', {
        error: error.message,
        paymentId: payment._id.toString(),
      });
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findById(paymentId).lean();
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      logger.info('Payment status retrieved', {
        paymentId,
        status: payment.status,
      });
      
      return {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        orderId: payment.order,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to get payment status', {
        paymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process refund
   */
  static async refundPayment(paymentId, amount, reason, notes = '') {
    const startTime = Date.now();
    
    try {
      logger.info('Refund initiation started', {
        paymentId,
        amount,
        reason,
      });
      
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (!payment.isRefundable) {
        throw new Error('Payment cannot be refunded');
      }
      
      if (amount > payment.refundableAmount) {
        throw new Error(`Refund amount exceeds available balance of $${payment.refundableAmount}`);
      }
      
      // Create refund record
      const refund = payment.createRefund(amount, reason, notes);
      
      // Process with gateway
      const gatewayRefund = await mockGateway.processRefund({
        paymentId: payment._id.toString(),
        transactionId: payment.transactionId,
        amount,
        reason,
      });
      
      // Complete refund
      await payment.completeRefund(refund.refundId, gatewayRefund.refundId);
      
      logger.info('Refund processed successfully', {
        paymentId,
        refundId: refund.refundId,
        amount,
        duration: Date.now() - startTime,
      });
      
      logger.business('refund_processed', {
        paymentId: paymentId.toString(),
        refundId: refund.refundId,
        amount,
        reason,
      });
      
      return refund;
    } catch (error) {
      logger.error('Refund processing failed', {
        paymentId,
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Handle webhook from payment gateway
   */
  static async handleWebhook(webhookPayload, signature) {
    try {
      // Verify webhook signature
      const verified = this._verifyWebhookSignature(webhookPayload, signature);
      
      if (!verified) {
        logger.warn('Webhook signature verification failed', {
          event: webhookPayload.event,
        });
        throw new Error('Webhook signature verification failed');
      }
      
      logger.info('Webhook received and verified', {
        event: webhookPayload.event,
        transactionId: webhookPayload.transactionId,
      });
      
      const payment = await Payment.findOne({
        transactionId: webhookPayload.transactionId,
      });
      
      if (!payment) {
        logger.warn('Payment not found for webhook', {
          transactionId: webhookPayload.transactionId,
        });
        throw new Error('Payment not found');
      }
      
      // Handle different webhook events
      switch (webhookPayload.event) {
        case 'payment.success':
          if (payment.status === 'processing') {
            await payment.updateStatus('success');
            await payment.save();
          }
          break;
          
        case 'payment.failed':
          await payment.updateStatus('failed', webhookPayload.reason, webhookPayload.code);
          await payment.save();
          break;
          
        case 'refund.completed':
          const refund = payment.refunds.find(r => r.refundId === webhookPayload.refundId);
          if (refund) {
            refund.status = 'completed';
            await payment.save();
          }
          break;
      }
      
      // Track webhook
      payment.webhooksSent.push({
        event: webhookPayload.event,
        status: 'received',
        sentAt: new Date(),
        retries: 0,
      });
      
      await payment.save();
      
      logger.info('Webhook processed successfully', {
        paymentId: payment._id,
        event: webhookPayload.event,
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error.message,
        event: webhookPayload.event,
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static _verifyWebhookSignature(payload, signature) {
    // In production, use your gateway's actual signature verification
    // For mock, just verify format
    return signature && signature.length > 0;
  }

  /**
   * Snapshot cart items for record
   */
  static _snapshotCartItems(cart) {
    return cart.items.map(item => ({
      food: item.food,
      foodName: item.foodName || 'Unknown',
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));
  }

  /**
   * Retry failed payments
   */
  static async retryFailedPayments() {
    try {
      logger.info('Starting retry of failed payments');
      
      const failedPayments = await Payment.findRetryablePayments();
      
      let successCount = 0;
      for (const payment of failedPayments) {
        try {
          await this.processPayment(payment._id);
          successCount++;
        } catch (error) {
          logger.warn('Retry attempt failed', {
            paymentId: payment._id,
            error: error.message,
          });
        }
      }
      
      logger.info('Payment retry batch completed', {
        total: failedPayments.length,
        successful: successCount,
      });
      
      return { total: failedPayments.length, successful: successCount };
    } catch (error) {
      logger.error('Payment retry batch failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(startDate, endDate) {
    try {
      const stats = await Payment.getStats(startDate, endDate);
      
      logger.info('Payment statistics retrieved', {
        periodStart: startDate,
        periodEnd: endDate,
        statsCount: stats.length,
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get payment statistics', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = PaymentService;
