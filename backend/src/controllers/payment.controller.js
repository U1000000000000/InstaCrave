const PaymentService = require('../services/payment.service');
const logger = require('../services/logger.service');
const analyticsService = require('../services/analytics.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Payment Controller - Handles HTTP payment endpoints
 * 
 * Endpoints:
 * - POST /api/payments/initiate - Start payment process
 * - POST /api/payments/process - Process payment through gateway
 * - GET /api/payments/:id/status - Get payment status
 * - POST /api/payments/:id/refund - Process refund
 * - POST /api/payments/webhook - Handle gateway webhooks
 * 
 * Note: Validation is handled by validate middleware in routes
 */

/**
 * Initiate payment
 * 
 * POST /api/payments/initiate
 */
const initiatePayment = catchAsync(async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?._id || req.user?.id;
  const sessionId = req.cookies?.cart_session || req.headers['x-cart-session'];
  
  // Initiate payment (validation already done by middleware)
  const payment = await PaymentService.initiatePayment(
    userId,
    req.body.cartId,
    sessionId,
    {
      amount: req.body.amount,
      currency: req.body.currency,
      paymentMethod: req.body.paymentMethod,
      paymentGateway: req.body.paymentGateway || 'mock',
      deliveryAddress: req.body.deliveryAddress,
      idempotencyKey: req.get('Idempotency-Key') || req.get('X-Idempotency-Key') || req.get('x-idempotency-key'),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      deviceId: req.body.metadata?.deviceId,
      country: req.body.metadata?.country,
      timezone: req.body.metadata?.timezone,
    }
  );
  
  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'payment:initiated',
    userId: userId?.toString(),
    userType: 'User',
    data: {
      paymentId: payment._id.toString(),
      cartId: req.body.cartId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.paymentMethod,
      fraudScore: payment.fraudScore,
      gateway: payment.paymentGateway,
    },
    request: req,
  }).catch(err => logger.error('Failed to track payment_initiated', { error: err.message }));
  
  logger.performance('initiate_payment', Date.now() - startTime, {
    paymentId: payment._id.toString(),
  });
  
  res.status(201).json({
    success: true,
    data: {
      paymentId: payment._id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      fraudScore: payment.fraudScore,
      isBlocked: payment.isBlocked,
      createdAt: payment.createdAt,
    },
  });
});

/**
 * Process payment
 * 
 * POST /api/payments/process
 */
const processPayment = catchAsync(async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?._id || req.user?.id;
  
  // Process payment (validation already done by middleware)
  const payment = await PaymentService.processPayment(
    req.body.paymentId,
    req.body.cardData
  );
  
  // Populate order details for frontend
  await payment.populate('order');
  
  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'payment:completed',
    userId: userId?.toString(),
    userType: 'User',
    data: {
      paymentId: payment._id.toString(),
      orderId: payment.order?._id?.toString(),
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId: payment.transactionId,
      method: payment.paymentMethod,
    },
    request: req,
  }).catch(err => logger.error('Failed to track payment_completed', { error: err.message }));
  
  logger.performance('process_payment', Date.now() - startTime, {
    paymentId: payment._id.toString(),
  });
  
  res.status(200).json({
    success: true,
    data: {
      paymentId: payment._id,
      status: payment.status,
      amount: payment.amount,
      order: payment.order ? {
        _id: payment.order._id,
        orderNumber: payment.order.orderNumber,
        totalAmount: payment.order.total,
        status: payment.order.status,
      } : null,
      transactionId: payment.transactionId,
      errorMessage: payment.errorMessage || null,
      errorCode: payment.errorCode || null,
      processingCompletedAt: payment.processingCompletedAt,
    },
  });
});

/**
 * Get payment status
 * 
 * GET /api/payments/:paymentId/status
 */
const getPaymentStatus = catchAsync(async (req, res) => {
  const startTime = Date.now();
  
  // Get payment status (validation already done by middleware)
  const status = await PaymentService.getPaymentStatus(req.params.paymentId);
  
  if (!status) {
    throw new AppError('Payment not found', 404);
  }
  
  logger.performance('get_payment_status', Date.now() - startTime, {
    paymentId: req.params.paymentId,
  });
  
  res.status(200).json({
    success: true,
    data: status,
  });
});

/**
 * Refund payment
 * 
 * POST /api/payments/:paymentId/refund
 */
const refundPayment = catchAsync(async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.user || {};
  
  // Process refund (validation already done by middleware)
  const refund = await PaymentService.refundPayment(
    req.params.paymentId,
    req.body.amount,
    req.body.reason,
    req.body.notes
  );
  
  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'payment:refunded',
    userId: userId?.toString(),
    userType: 'User',
    data: {
      paymentId: req.params.paymentId,
      refundId: refund.refundId,
      amount: refund.amount,
      reason: refund.reason,
      notes: refund.notes,
    },
    request: req,
  }).catch(err => logger.error('Failed to track payment_refunded', { error: err.message }));
  
  logger.performance('refund_payment', Date.now() - startTime, {
    paymentId: req.params.paymentId,
  });
  
  res.status(200).json({
    success: true,
    data: {
      refundId: refund.refundId,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      createdAt: refund.createdAt,
    },
  });
});

/**
 * Handle payment gateway webhook
 * 
 * POST /api/payments/webhook
 */
const handleWebhook = catchAsync(async (req, res) => {
  const startTime = Date.now();
  
  // Validate webhook signature (from headers)
  const signature = req.get('X-Webhook-Signature') || req.get('x-webhook-signature');
  
  if (!signature) {
    logger.warn('Webhook received without signature', {
      event: req.body.event,
    });
    
    throw new AppError('Missing webhook signature', 401);
  }
  
  // Handle webhook (validation already done by middleware)
  const result = await PaymentService.handleWebhook(req.body, signature);
  
  // Track webhook event
  await analyticsService.trackEvent({
    eventType: `payment:webhook_${req.body.event}`,
    data: {
      transactionId: req.body.transactionId,
      webhookStatus: req.body.status,
      event: req.body.event,
    },
    request: req,
  }).catch(err => logger.error('Failed to track webhook', { error: err.message }));
  
  logger.performance('handle_webhook', Date.now() - startTime, {
    event: req.body.event,
  });
  
  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  initiatePayment,
  processPayment,
  getPaymentStatus,
  refundPayment,
  handleWebhook,
};
