const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { 
  isAuthenticated, 
  isOptional 
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  initiatePaymentSchema,
  processPaymentSchema,
  refundPaymentSchema,
  webhookSchema,
  emptyQuerySchema,
  emptyParamsSchema,
  paymentIdParamsSchema,
} = require('../validation/payment.validation');

/**
 * Payment Routes
 * 
 * Features:
 * - Cart-to-payment-to-order flow
 * - CSRF protection (applied globally)
 * - Rate limiting
 * - Webhook support
 * - Multiple payment methods
 */

// ===== SWAGGER DEFINITIONS =====

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Initiate payment process
 *     description: |
 *       Creates a payment record and prepares it for processing.
 *       
 *       Supports:
 *       - Authenticated users
 *       - Anonymous session-based users
 *       - Multiple payment methods (card, wallet, UPI, COD)
 *       - Fraud detection scoring
 *       - Idempotency for duplicate prevention
 *     
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cartId
 *               - paymentMethod
 *               - amount
 *               - deliveryAddress
 *             properties:
 *               cartId:
 *                 type: string
 *                 format: ObjectId
 *                 description: Cart ID from Step 5.1
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, wallet, upi, cash_on_delivery]
 *                 description: Payment method to use
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 maximum: 10000
 *                 description: Payment amount (must match cart total)
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, INR]
 *                 default: USD
 *               deliveryAddress:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Full delivery address
 *               paymentGateway:
 *                 type: string
 *                 enum: [mock, stripe, razorpay, paypal]
 *                 default: mock
 *               cardData:
 *                 type: object
 *                 description: Required if paymentMethod is 'card'
 *                 required:
 *                   - cardNumber
 *                   - cardholderName
 *                   - expiryMonth
 *                   - expiryYear
 *                   - cvv
 *                   - billingZipCode
 *                 properties:
 *                   cardNumber:
 *                     type: string
 *                     pattern: '^\d{13,19}$'
 *                     description: 13-19 digit card number
 *                     example: '4111111111111111'
 *                   cardholderName:
 *                     type: string
 *                     minLength: 2
 *                     maxLength: 100
 *                   expiryMonth:
 *                     type: string
 *                     pattern: '^(0[1-9]|1[0-2])$'
 *                     example: '12'
 *                   expiryYear:
 *                     type: string
 *                     pattern: '^\d{4}$'
 *                     example: '2025'
 *                   cvv:
 *                     type: string
 *                     pattern: '^\d{3,4}$'
 *                   billingZipCode:
 *                     type: string
 *               walletData:
 *                 type: object
 *                 description: Required if paymentMethod is 'wallet'
 *                 required:
 *                   - walletId
 *                   - pinCode
 *               upiData:
 *                 type: object
 *                 description: Required if paymentMethod is 'upi'
 *                 required:
 *                   - upiId
 *                   - pin
 *               metadata:
 *                 type: object
 *                 description: Device and location metadata for fraud detection
 *                 properties:
 *                   ipAddress:
 *                     type: string
 *                     format: ipv4
 *                   userAgent:
 *                     type: string
 *                   deviceId:
 *                     type: string
 *                   country:
 *                     type: string
 *                     length: 2
 *                   timezone:
 *                     type: string
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       format: ObjectId
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, success, failed, cancelled, refunded]
 *                       example: pending
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     fraudScore:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Fraud detection score (higher = riskier)
 *                     isBlocked:
 *                       type: boolean
 *                       description: Whether payment is blocked by fraud detection
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       403:
 *         description: Fraud detected or payment blocked
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Process payment through gateway
 *     description: |
 *       Processes payment through the payment gateway and creates order with Mongoose transactions.
 *       
 *       Transaction flow:
 *       1. Payment status → processing
 *       2. Gateway processes payment
 *       3. Order created from cart
 *       4. Cart cleared
 *       5. Payment status → success
 *       
 *       All steps are atomic - if any fails, entire transaction rolls back.
 *     
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *                 format: ObjectId
 *               cardData:
 *                 type: object
 *                 description: Optional card data for verification
 *     responses:
 *       200:
 *         description: Payment processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     orderId:
 *                       type: string
 *                       description: Created order ID
 *                     transactionId:
 *                       type: string
 *                     errorMessage:
 *                       type: string
 *                     errorCode:
 *                       type: string
 *       400:
 *         description: Payment processing failed
 *       403:
 *         description: Payment blocked by fraud detection
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @swagger
 * /api/payments/{paymentId}/status:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment status
 *     description: |
 *       Retrieves current payment status and transaction details.
 *       
 *       Safe operation - no side effects.
 *     
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     orderId:
 *                       type: string
 *                     transactionId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /api/payments/{paymentId}/refund:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Process refund
 *     description: |
 *       Processes refund for a successful payment.
 *       
 *       Supports:
 *       - Full refunds
 *       - Partial refunds
 *       - Multiple refunds until full amount is refunded
 *       - Reason tracking for audit trail
 *       
 *       Requirements:
 *       - Payment status must be 'success'
 *       - Refund amount cannot exceed remaining balance
 *     
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - reason
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *               reason:
 *                 type: string
 *                 enum: [user_request, order_cancellation, merchant_error, duplicate, other]
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Refund processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     refundId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *       400:
 *         description: Invalid refund request
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Payment gateway webhook
 *     description: |
 *       Receives webhooks from payment gateway.
 *       
 *       Webhook types:
 *       - payment.success
 *       - payment.failed
 *       - refund.completed
 *       - refund.failed
 *       
 *       Required header:
 *       - X-Webhook-Signature: HMAC-SHA256 signature
 *     
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - transactionId
 *               - status
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [payment.success, payment.failed, refund.completed, refund.failed]
 *               transactionId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *               refundId:
 *                 type: string
 *               status:
 *                 type: string
 *               reason:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed
 *       401:
 *         description: Invalid signature
 *       400:
 *         description: Invalid webhook payload
 */

// ===== ROUTES =====

// Initiate payment (POST /api/payments/initiate)
router.post(
  '/initiate',
  isOptional,
  paymentRateLimiter,
  validate({ body: initiatePaymentSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  paymentController.initiatePayment
);

// Process payment (POST /api/payments/process)
router.post(
  '/process',
  isOptional,
  paymentRateLimiter,
  validate({ body: processPaymentSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  paymentController.processPayment
);

// Get payment status (GET /api/payments/:paymentId/status)
router.get(
  '/:paymentId/status',
  isOptional,
  paymentRateLimiter,
  validate({ body: emptyQuerySchema, query: emptyQuerySchema, params: paymentIdParamsSchema }),
  paymentController.getPaymentStatus
);

// Process refund (POST /api/payments/:paymentId/refund)
router.post(
  '/:paymentId/refund',
  isOptional,
  paymentRateLimiter,
  validate({ body: refundPaymentSchema, query: emptyQuerySchema, params: paymentIdParamsSchema }),
  paymentController.refundPayment
);

// Webhook (POST /api/payments/webhook)
// Note: Webhook endpoint is typically public and doesn't require auth
router.post(
  '/webhook',
  validate({ body: webhookSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  paymentController.handleWebhook
);

module.exports = router;
