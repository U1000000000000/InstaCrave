const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Payment Model
 * 
 * Tracks payment transactions (using mock gateway).
 * 
 * Handles:
 * - Payment lifecycle (pending → processing → success/failed)
 * - Multiple payment methods (card, wallet, UPI, cash_on_delivery)
 * - Refund tracking
 * - Basic fraud scoring
 * - Idempotency keys
 * 
 * Note: This is a mock implementation. Not connected to real payment gateways.
 */

const refundSchema = new mongoose.Schema({
  refundId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    enum: ['user_request', 'order_cancellation', 'merchant_error', 'duplicate', 'other'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  gatewayRefundId: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: Date,
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  // User & Session identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    index: true,
    required: function() { return this.sessionId === null; },
  },
  
  sessionId: {
    type: String,
    sparse: true,
  },
  
  // Payment amount and currency
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be at least $0.01'],
    max: [10000, 'Amount cannot exceed $10,000'],
  },
  
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR'],
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'upi', 'cash_on_delivery', 'bank_transfer'],
    required: true,
  },
  
  // Cart reference (Step 5.1 integration)
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cart',
    required: true,
    index: true,
  },
  
  // Snapshot of cart items for record-keeping
  cartItems: [{
    food: mongoose.Schema.Types.ObjectId,
    foodName: String,
    quantity: Number,
    price: Number,
    subtotal: Number,
  }],
  
  deliveryAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  
  // Payment gateway configuration
  paymentGateway: {
    type: String,
    enum: ['mock', 'stripe', 'razorpay', 'paypal'],
    default: 'mock',
  },
  
  transactionId: {
    type: String,
    sparse: true,
  },
  
  // Idempotency key for duplicate prevention
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Payment lifecycle status
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true,
  },
  
  // Processing timestamps
  processingStartedAt: Date,
  processingCompletedAt: Date,
  
  // Gateway response (encrypted in production)
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    select: false, // Don't return by default for security
  },
  
  // Error tracking
  errorMessage: String,
  errorCode: String,
  retryCount: {
    type: Number,
    default: 0,
    max: 3,
  },
  
  // Order creation link
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order',
    sparse: true,
    index: true,
  },
  
  // Fraud detection
  fraudScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  
  fraudFlags: [{
    type: String,
    enum: [
      'duplicate_attempt',
      'velocity_exceeded',
      'amount_anomaly',
      'device_mismatch',
      'ip_mismatch',
      'high_risk_region',
      'test_card_pattern',
    ],
  }],
  
  isBlocked: {
    type: Boolean,
    default: false,
  },
  
  // Device and location info for fraud detection
  metadata: {
    deviceFingerprint: String,
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    country: String,
    timezone: String,
  },
  
  // Refund tracking
  refunds: [refundSchema],
  
  totalRefunded: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  canPartialRefund: Boolean,
  
  // Card info (tokens only, not real card data)
  cardTokenized: Boolean,
  last4Digits: String,
  cardBrand: String,
  expiryMonth: String,
  expiryYear: String,
  
  // Webhook tracking
  webhooksSent: [{
    event: String,
    status: String,
    sentAt: Date,
    retries: Number,
  }],
  
  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// ===== INDEXES =====

// Compound indexes for queries
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ cart: 1, status: 1 });
paymentSchema.index({ transactionId: 1, paymentGateway: 1 });
paymentSchema.index({ createdAt: 1, status: 1 });

// ===== VIRTUALS =====

paymentSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'success';
});

paymentSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

paymentSchema.virtual('isRefundable').get(function() {
  return this.status === 'success' && this.totalRefunded < this.amount;
});

paymentSchema.virtual('refundableAmount').get(function() {
  return this.amount - this.totalRefunded;
});

// ===== METHODS =====

/**
 * Generate idempotency key
 */
paymentSchema.statics.generateIdempotencyKey = function(userId, cartId, timestamp) {
  const seed = timestamp === undefined || timestamp === null ? '' : String(timestamp);
  const data = `${userId || 'anon'}-${cartId}-${seed}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Update payment status
 */
paymentSchema.methods.updateStatus = async function(newStatus, errorMessage = null, errorCode = null) {
  this.status = newStatus;
  
  if (newStatus === 'processing' && !this.processingStartedAt) {
    this.processingStartedAt = new Date();
  }
  
  if (['success', 'failed', 'cancelled'].includes(newStatus) && !this.processingCompletedAt) {
    this.processingCompletedAt = new Date();
  }
  
  if (errorMessage) this.errorMessage = errorMessage;
  if (errorCode) this.errorCode = errorCode;
  
  return this.save();
};

/**
 * Set fraud score and flags
 */
paymentSchema.methods.setFraudDetection = function(score, flags = []) {
  this.fraudScore = Math.min(100, Math.max(0, score));
  this.fraudFlags = [...new Set([...this.fraudFlags, ...flags])];
  
  // Block if score too high
  if (this.fraudScore >= 80) {
    this.isBlocked = true;
  }
  
  return this;
};

/**
 * Add fraud flag
 */
paymentSchema.methods.addFraudFlag = function(flag) {
  if (!this.fraudFlags.includes(flag)) {
    this.fraudFlags.push(flag);
    this.fraudScore = Math.min(100, this.fraudScore + 15);
  }
  return this;
};

/**
 * Create refund
 */
paymentSchema.methods.createRefund = function(amount, reason, notes = '') {
  if (amount > this.refundableAmount) {
    throw new Error('Refund amount exceeds available balance');
  }
  
  const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const refund = {
    refundId,
    amount,
    reason,
    notes,
    status: 'pending',
  };
  
  this.refunds.push(refund);
  this.totalRefunded += amount;
  
  if (this.totalRefunded >= this.amount) {
    this.status = 'refunded';
  }
  
  return refund;
};

/**
 * Complete refund
 */
paymentSchema.methods.completeRefund = function(refundId, gatewayRefundId) {
  const refund = this.refunds.find(r => r.refundId === refundId);
  
  if (!refund) {
    throw new Error('Refund not found');
  }
  
  refund.status = 'completed';
  refund.gatewayRefundId = gatewayRefundId;
  refund.processedAt = new Date();
  
  return this.save();
};

/**
 * Increment retry count
 */
paymentSchema.methods.incrementRetry = function() {
  this.retryCount = (this.retryCount || 0) + 1;
  return this;
};

/**
 * Check if can retry
 */
paymentSchema.methods.canRetry = function() {
  return this.retryCount < 3 && ['failed', 'pending'].includes(this.status);
};

/**
 * Check if fraud is blocking this payment
 */
paymentSchema.methods.isFraudBlocked = function() {
  return this.isBlocked || this.fraudScore >= 80;
};

/**
 * Get safe payment data (no sensitive info)
 */
paymentSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.gatewayResponse;
  delete obj.metadata;
  return {
    ...obj,
    card: obj.last4Digits ? {
      brand: this.cardBrand,
      last4: this.last4Digits,
      expiry: `${this.expiryMonth}/${this.expiryYear}`,
    } : null,
  };
};

// ===== STATIC METHODS =====

/**
 * Find pending payments for retry
 */
paymentSchema.statics.findRetryablePayments = async function() {
  return this.find({
    status: 'failed',
    retryCount: { $lt: 3 },
    processingCompletedAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
  });
};

/**
 * Find suspicious payments
 */
paymentSchema.statics.findSuspicious = async function() {
  return this.find({
    $or: [
      { isBlocked: true },
      { fraudScore: { $gte: 70 } },
      { fraudFlags: { $exists: true, $ne: [] } },
    ],
  });
};

/**
 * Get payment stats
 */
paymentSchema.statics.getStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);
  
  return stats;
};

// ===== HOOKS =====

/**
 * Before save validation
 */
paymentSchema.pre('save', function(next) {
  if (!this.user && !this.sessionId) {
    return next(new Error('Payment must have either user or sessionId'));
  }
  
  if (this.totalRefunded > this.amount) {
    return next(new Error('Total refunded cannot exceed payment amount'));
  }
  
  this.updatedAt = new Date();
  next();
});

const paymentModel = mongoose.model('payment', paymentSchema);

// Drop problematic unique index on refunds.refundId if it exists
// This index causes issues because it treats null as a duplicate value
paymentModel.collection.dropIndex('refunds.refundId_1').catch(() => {
  // Index may not exist, ignore error
});

module.exports = paymentModel;
