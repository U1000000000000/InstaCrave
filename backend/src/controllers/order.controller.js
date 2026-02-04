const orderModel = require('../models/order.model');
const foodModel = require('../models/food.model');
const userModel = require('../models/user.model');
const OrderService = require('../services/order.service');
const { emitOrderCreated, emitOrderStatusUpdated } = require('../services/socket.service');
const analyticsService = require('../services/analytics.service');

const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const responseUtil = require("../utils/response");
const logger = require('../services/logger.service');

const sanitizeHtml = require('sanitize-html');

// Background job queue imports
const { addEmailJob, addOrderJob, addAnalyticsJob, JOB_TYPES } = require('../queue/index');

/**
 * Create order with ACID transaction (Step 5.3)
 * 
 * Uses OrderService for:
 * - Order creation
 * - Rollback on ANY failure
 */
const createOrder = catchAsync(async (req, res) => {
  const { foodId, quantity, deliveryAddress, paymentMethod, idempotencyKey } = req.body;
  const userId = req.user.id;
  
  // Sanitize delivery address
  const cleanAddress = sanitizeHtml(deliveryAddress, { 
    allowedTags: [], 
    allowedAttributes: {} 
  });
  
  // FIXME: Payment method is hardcoded - need to integrate Stripe/Razorpay
  // Currently just accepting any string, no actual payment processing
  const order = await OrderService.createOrderWithTransaction({
    userId,
    foodId,
    quantity,
    deliveryAddress: cleanAddress,
    paymentMethod: paymentMethod || 'cash_on_delivery',
    idempotencyKey: idempotencyKey || null,
    metadata: {
      source: 'web',
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    },
  });
  
  logger.info('Order created successfully via transaction', {
    orderId: order._id,
    userId,
    foodId,
    quantity,
    transactionId: order.transactionId,
  });
  
  // Emit real-time event to food partner
  try {
    // Populate food and foodPartner for WebSocket event
    const populatedOrder = await orderModel.findById(order._id)
      .populate('food')
      .populate('foodPartner');
    
    if (populatedOrder) {
      emitOrderCreated(populatedOrder);
    }
  } catch (socketError) {
    // Log but don't fail the request
    logger.warn('Failed to emit order:created WebSocket event', {
      orderId: order._id,
      error: socketError.message,
    });
  }
  
  // Track controller-level analytics
  await analyticsService.trackEvent({
    eventType: 'order:created',
    userId: userId.toString(),
    userType: 'User',
    data: {
      orderId: order._id.toString(),
      foodId: foodId.toString(),
      quantity,
      total: order.totalPrice || order.total,
      paymentMethod: order.paymentMethod,
      source: 'web',
    },
    request: req,
  }).catch(err => logger.error('Failed to track order creation', { error: err.message }));
  
  responseUtil.sendItemResponse(res, {
    data: order,
    message: 'Order placed successfully',
  });
});


const getUserOrders = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const orders = await orderModel.find({ user: userId })
    .populate('food')
    .populate('foodPartner');
  const ordersWithDetails = orders.map(order => ({
    ...order.toObject(),
    foodPartnerId: order.foodPartner?._id?.toString() || order.foodPartner?.toString(),
    foodId: order.food?._id?.toString() || order.food?.toString(),
    foodPartnerProfileImage: order.foodPartner?.profileImage || '',
    foodPartnerAddress: order.foodPartner?.address || '',
  }));

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'order:user_list_viewed',
    userId: userId.toString(),
    userType: 'User',
    data: {
      ordersCount: ordersWithDetails.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track user orders view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: ordersWithDetails,
    message: 'User orders fetched successfully',
    // Optionally add pagination, filters, sort if implemented
  });
});


const getPartnerOrders = catchAsync(async (req, res) => {
  const partnerId = req.foodPartner.id;
  
  // Query for both single-item and cart-based orders
  // Single-item orders: have a 'food' field that references a food item by this partner
  // Cart-based orders: have 'foodPartner' or 'restaurant' field directly set to this partner
  const orders = await orderModel.find({
    $or: [
      { foodPartner: partnerId }, // Cart-based orders
      { restaurant: partnerId },  // Cart-based orders (alternate field)
    ]
  })
    .populate('food')
    .populate('foodPartner')
    .populate('restaurant')
    .populate({
      path: 'items.food',
      model: 'food'
    })
    .sort({ createdAt: -1 })
    .exec();
  
  // Additionally fetch single-item orders where food belongs to this partner
  const singleItemOrders = await orderModel.find()
    .populate({
      path: 'food',
      match: { foodPartner: partnerId },
    })
    .exec();
  
  const filteredSingleItemOrders = singleItemOrders.filter(order => order.food);
  
  // Combine both types of orders and remove duplicates
  const allOrders = [...orders, ...filteredSingleItemOrders];
  const uniqueOrders = Array.from(new Map(allOrders.map(order => [order._id.toString(), order])).values());
  
  // Sort by creation date (newest first)
  uniqueOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'order:partner_list_viewed',
    userId: partnerId.toString(),
    userType: 'FoodPartner',
    data: {
      ordersCount: uniqueOrders.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track partner orders view', { error: err.message }));
  
  responseUtil.sendListResponse(res, {
    data: uniqueOrders,
    message: 'Partner orders fetched successfully',
    // Optionally add pagination, filters, sort if implemented
  });
});

/**
 * Update order status with transaction (Step 5.3)
 * 
 * Uses OrderService for:
 * - Status validation
 * - Atomic updates
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const partnerId = req.foodPartner.id;
  
  // Get old status before update for WebSocket event
  const oldOrder = await orderModel.findById(id);
  const oldStatus = oldOrder?.status;
  
  // Update order status with transaction
  const order = await OrderService.updateOrderStatus({
    orderId: id,
    newStatus: status,
    partnerId,
    reason,
  });
  
  logger.info('Order status updated successfully via transaction', {
    orderId: id,
    newStatus: status,
    partnerId,
    version: order.version,
  });
  
  // Emit real-time event to user
  try {
    // Populate food for WebSocket event
    const populatedOrder = await orderModel.findById(order._id)
      .populate('food')
      .populate('user');
    
    if (populatedOrder && oldStatus) {
      emitOrderStatusUpdated(populatedOrder, oldStatus);
    }
  } catch (socketError) {
    // Log but don't fail the request
    logger.warn('Failed to emit order:statusUpdated WebSocket event', {
      orderId: order._id,
      error: socketError.message,
    });
  }
  
  // Track controller-level analytics
  await analyticsService.trackEvent({
    eventType: 'order:status_updated',
    userId: partnerId.toString(),
    userType: 'FoodPartner',
    data: {
      orderId: id.toString(),
      oldStatus,
      newStatus: status,
      reason,
    },
    request: req,
  }).catch(err => logger.error('Failed to track order status update', { error: err.message }));
  
  responseUtil.sendItemResponse(res, {
    data: order,
    message: 'Order status updated',
  });
});

module.exports = {
  createOrder,
  getUserOrders,
  getPartnerOrders,
  updateOrderStatus,
};