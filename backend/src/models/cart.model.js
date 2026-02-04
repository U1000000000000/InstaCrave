const mongoose = require('mongoose');

/**
 * Cart Schema
 * 
 * Features:
 * - Supports both authenticated and anonymous users (via sessionId)
 * - Single food partner per cart (business rule)
 * - Automatic total calculation
 * - TTL-based expiration for abandoned carts
 */
const cartItemSchema = new mongoose.Schema({
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
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Maximum quantity per item is 99'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative'],
  },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  // User reference (optional for anonymous carts)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null,
    index: true, // For fast user cart lookups
  },
  
  // Session ID for anonymous users
  sessionId: {
    type: String,
    trim: true,
    index: true, // For fast session-based lookups
    sparse: true, // Allow null for authenticated carts
  },
  
  // Single food partner constraint
  foodPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'foodpartner',
    required: true,
    index: true,
  },
  
  foodPartnerName: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Cart items
  items: {
    type: [cartItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Cart must contain at least one item',
    },
  },
  
  // Calculated totals
  itemCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
    max: 10000, // Reasonable cart limit
    default: 0,
  },
  
  // Cart status
  status: {
    type: String,
    enum: ['active', 'merged', 'converted', 'abandoned', 'expired'],
    default: 'active',
    index: true,
  },
  
  // Expiration management
  expiresAt: {
    type: Date,
    required: true,
  },
  
  // Last activity tracking
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    userAgent: String,
    ip: String,
  },
}, {
  timestamps: true,
});

// =======================
// INDEXES (Performance)
// =======================

// Compound index for user cart lookup
cartSchema.index({ user: 1, status: 1 });

// Compound index for session cart lookup
cartSchema.index({ sessionId: 1, status: 1 });

// TTL index for automatic cleanup of expired carts
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for analytics queries
cartSchema.index({ createdAt: 1, status: 1 });

// =======================
// VIRTUALS
// =======================

// Check if cart belongs to authenticated user
cartSchema.virtual('isAuthenticated').get(function() {
  return !!this.user;
});

// Check if cart is expired
cartSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// =======================
// METHODS
// =======================

/**
 * Calculate and update cart totals
 */
cartSchema.methods.calculateTotals = function() {
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  return this;
};

/**
 * Add item to cart
 */
cartSchema.methods.addItem = function(foodItem, quantity) {
  const existingItem = this.items.find(item => {
    // Handle both populated and non-populated food references
    const itemFoodId = item.food._id ? item.food._id.toString() : item.food.toString();
    const newFoodId = foodItem._id.toString();
    return itemFoodId === newFoodId;
  });
  
  if (existingItem) {
    // Update existing item quantity
    existingItem.quantity += quantity;
    existingItem.subtotal = existingItem.price * existingItem.quantity;
  } else {
    // Add new item
    this.items.push({
      food: foodItem._id,
      foodName: foodItem.name,
      quantity,
      price: foodItem.price,
      subtotal: foodItem.price * quantity,
    });
  }
  
  this.calculateTotals();
  this.lastActivityAt = new Date();
  this.extendExpiration();
  
  return this;
};

/**
 * Update item quantity
 */
cartSchema.methods.updateItemQuantity = function(foodId, quantity) {
  // Handle both populated and non-populated food references
  const item = this.items.find(i => {
    const itemFoodId = i.food && i.food._id ? i.food._id.toString() : i.food.toString();
    return itemFoodId === foodId.toString();
  });
  
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    this.removeItem(foodId);
  } else {
    item.quantity = quantity;
    item.subtotal = item.price * item.quantity;
    this.calculateTotals();
    this.lastActivityAt = new Date();
    this.extendExpiration();
  }
  
  return this;
};

/**
 * Remove item from cart
 */
cartSchema.methods.removeItem = function(foodId) {
  this.items = this.items.filter(item => {
    const itemFoodId = item.food && item.food._id ? item.food._id.toString() : item.food.toString();
    return itemFoodId !== foodId.toString();
  });
  this.calculateTotals();
  this.lastActivityAt = new Date();
  return this;
};

/**
 * Clear all items from cart
 */
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.itemCount = 0;
  this.totalPrice = 0;
  this.lastActivityAt = new Date();
  
  return this;
};

/**
 * Extend cart expiration
 */
cartSchema.methods.extendExpiration = function() {
  const daysToExpire = this.user ? 30 : 7; // 30 days for auth, 7 for anonymous
  this.expiresAt = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);
  
  return this;
};

/**
 * Validate prices against current food prices
 */
cartSchema.methods.validatePrices = async function() {
  const foodIds = this.items.map(item => item.food);
  const Food = mongoose.model('food');
  const currentFoods = await Food.find({ _id: { $in: foodIds } }).select('_id price');
  
  let priceChanged = false;
  const priceChanges = [];
  
  for (const item of this.items) {
    const currentFood = currentFoods.find(f => f._id.toString() === item.food.toString());
    
    if (currentFood && currentFood.price !== item.price) {
      priceChanged = true;
      priceChanges.push({
        foodId: item.food,
        foodName: item.foodName,
        oldPrice: item.price,
        newPrice: currentFood.price,
      });
      
      item.price = currentFood.price;
      item.subtotal = item.price * item.quantity;
    }
  }
  
  if (priceChanged) {
    this.calculateTotals();
  }
  
  return { priceChanged, priceChanges };
};

/**
 * Convert cart to order format
 */
cartSchema.methods.toOrderFormat = function(deliveryAddress) {
  return {
    foodPartner: this.foodPartner,
    foodPartnerName: this.foodPartnerName,
    user: this.user,
    items: this.items.map(item => ({
      food: item.food,
      foodName: item.foodName,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
    totalPrice: this.totalPrice,
    deliveryAddress,
  };
};

// =======================
// STATIC METHODS
// =======================

/**
 * Find active cart for user
 */
cartSchema.statics.findActiveUserCart = async function(userId) {
  return this.findOne({ user: userId, status: 'active' })
    .populate('items.food')
    .populate('foodPartner');
};

/**
 * Find active cart for session
 */
cartSchema.statics.findActiveSessionCart = async function(sessionId) {
  return this.findOne({ sessionId, status: 'active' })
    .populate('items.food')
    .populate('foodPartner');
};

/**
 * Merge anonymous cart into user cart on login
 */
cartSchema.statics.mergeSessionCartToUser = async function(sessionId, userId) {
  const sessionCart = await this.findActiveSessionCart(sessionId);
  
  if (!sessionCart) {
    return null;
  }
  
  const userCart = await this.findActiveUserCart(userId);
  
  if (!userCart) {
    // Simply transfer session cart to user
    sessionCart.user = userId;
    sessionCart.sessionId = null;
    sessionCart.status = 'active';
    sessionCart.extendExpiration();
    await sessionCart.save();
    return sessionCart;
  }
  
  // Merge if same food partner
  if (userCart.foodPartner.toString() === sessionCart.foodPartner.toString()) {
    for (const item of sessionCart.items) {
      userCart.addItem({
        _id: item.food,
        name: item.foodName,
        price: item.price,
      }, item.quantity);
    }
    
    await userCart.save();
    
    // Mark session cart as merged
    sessionCart.status = 'merged';
    await sessionCart.save();
    
    return userCart;
  }
  
  // Keep user cart if different partners
  sessionCart.status = 'abandoned';
  await sessionCart.save();
  
  return userCart;
};

/**
 * Clean up expired or old carts (background job)
 */
cartSchema.statics.cleanupOldCarts = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const result = await this.updateMany(
    {
      status: 'active',
      $or: [
        { expiresAt: { $lt: new Date() } },
        { lastActivityAt: { $lt: thirtyDaysAgo } },
      ],
    },
    {
      $set: { status: 'expired' },
    }
  );
  
  return result;
};

// =======================
// HOOKS (Middleware)
// =======================

/**
 * Validate before save
 */
cartSchema.pre('save', function(next) {
  // Ensure either user or sessionId is set
  if (!this.user && !this.sessionId) {
    return next(new Error('Cart must have either user or sessionId'));
  }
  
  // Recalculate totals
  this.calculateTotals();
  
  // Validate max cart value
  if (this.totalPrice > 10000) {
    return next(new Error('Cart total exceeds maximum limit of $10,000'));
  }
  
  next();
});

/**
 * Update lastActivityAt on updates
 */
cartSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastActivityAt: new Date() });
  next();
});

const cartModel = mongoose.model('cart', cartSchema);

module.exports = cartModel;
