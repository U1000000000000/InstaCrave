const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // User information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  userName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  sessionId: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Single item order (legacy)
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'food',
    sparse: true, // Allows null for multi-item orders
  },
  foodName: {
    type: String,
    required: function () {
      return !this.items || this.items.length === 0;
    },
    trim: true,
    maxlength: 100
  },
  quantity: {
    type: Number,
    required: function () {
      return !this.items || this.items.length === 0;
    },
    min: 1,
  },
  totalPrice: {
    type: Number,
    required: function () {
      return !this.items || this.items.length === 0;
    },
    min: 0
  },
  
  // Multi-item order (cart-based)
  items: [{
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'food',
      required: true,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  
  // Restaurant/Partner information
  foodPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'foodpartner',
  },
  foodPartnerName: {
    type: String,
    required: function () {
      return !this.items || this.items.length === 0;
    },
    trim: true,
    maxlength: 100
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'foodpartner',
  },
  restaurantName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Pricing (for multi-item orders)
  subtotal: {
    type: Number,
    min: 0,
    default: 0,
  },
  taxes: {
    type: Number,
    min: 0,
    default: 0,
  },
  deliveryFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  discount: {
    type: Number,
    min: 0,
    default: 0,
  },
  total: {
    type: Number,
    min: 0,
  },
  
  // Delivery
  deliveryAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Payment information
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'upi', 'cash_on_delivery'],
    default: 'cash_on_delivery',
  },
  
  // Transaction tracking (Step 5.3)
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  
  // Optimistic locking (Step 5.3)
  version: {
    type: Number,
    default: 1,
  },
  
  // Status history (audit trail)
  statusHistory: [{
    status: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
    },
    changedBy: {
      type: String,
      enum: ['user', 'partner', 'system', 'admin'],
    },
  }],
  
  // Notes
  orderNotes: {
    type: String,
    maxlength: 500,
  },
  cancellationReason: {
    type: String,
    maxlength: 500,
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    userAgent: String,
    ipAddress: String,
    createdVia: String,
    createdFromCart: Boolean,
    cartId: String,
  },
}, {
  timestamps: true,
});

// ===== INDEXES =====
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ foodPartner: 1, status: 1 });
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// ===== VIRTUALS =====
orderSchema.virtual('finalAmount').get(function() {
  // For single-item orders
  if (this.totalPrice) {
    return this.totalPrice;
  }
  // For multi-item orders
  return this.total || 0;
});

// ===== INSTANCE METHODS =====

/**
 * Check if order can be cancelled
 */
orderSchema.methods.canBeCancelled = function() {
  const CANCELLABLE_STATES = ['pending', 'confirmed'];
  return CANCELLABLE_STATES.includes(this.status);
};

/**
 * Check if order can transition to new status
 */
orderSchema.methods.canTransitionTo = function(newStatus) {
  const VALID_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };
  
  return VALID_TRANSITIONS[this.status]?.includes(newStatus) || false;
};

/**
 * Add status to history
 */
orderSchema.methods.addStatusHistory = function(newStatus, reason = null, changedBy = 'system') {
  if (!this.statusHistory) {
    this.statusHistory = [];
  }
  
  this.statusHistory.push({
    status: newStatus,
    previousStatus: this.status,
    changedAt: new Date(),
    reason,
    changedBy,
  });
};

// ===== STATIC METHODS =====

/**
 * Find orders with transaction support
 */
orderSchema.statics.findByIdWithLock = async function(orderId, session) {
  return this.findById(orderId).session(session);
};

/**
 * Find user's recent orders
 */
orderSchema.statics.findUserRecentOrders = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('food')
    .populate('foodPartner');
};

/**
 * Find partner's pending orders
 */
orderSchema.statics.findPartnerPendingOrders = function(partnerId) {
  return this.find({
    $or: [
      { foodPartner: partnerId },
      { restaurant: partnerId },
    ],
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
  })
    .sort({ createdAt: -1 })
    .populate('user')
    .populate('food');
};

// ===== MIDDLEWARE =====

/**
 * Pre-save middleware: Auto-calculate total for multi-item orders
 */
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0 && !this.total) {
    this.total = this.subtotal + this.taxes + this.deliveryFee - this.discount;
  }
  next();
});

/**
 * Pre-save middleware: Prevent modification of completed orders
 */
orderSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified('status')) {
    const FINAL_STATES = ['delivered', 'cancelled'];
    if (FINAL_STATES.includes(this.status)) {
      // Allow metadata updates but not status changes
      if (this.isModified('status') && this.constructor._originalStatus && 
          FINAL_STATES.includes(this.constructor._originalStatus)) {
        return next(new Error('Cannot modify completed orders'));
      }
    }
  }
  next();
});

const orderModel = mongoose.model('order', orderSchema);

module.exports = orderModel;