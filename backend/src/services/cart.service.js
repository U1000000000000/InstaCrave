const Cart = require('../models/cart.model');
const Food = require('../models/food.model');
const FoodPartner = require('../models/foodpartner.model');
const AppError = require('../utils/AppError');
const logger = require('./logger.service');
const { cache } = require('./redis.service');
const { uuidv4 } = require('../utils/uuid');

/**
 * Cart Service
 * 
 * Features:
 * - Redis caching
 * - Price validation
 * - Cart merging (anonymous to authenticated user)
 * - Stampede protection
 */
class CartService {
  constructor() {
    this.CACHE_TTL = 900; // 15 minutes
    this.CACHE_PREFIX = 'cart';
  }

  /**
   * Generate cache key for cart
   */
  _getCacheKey(identifier, type = 'user') {
    return `${this.CACHE_PREFIX}:${type}:${identifier}`;
  }

  /**
   * Get or create cart for user
   */
  async getUserCart(userId, options = {}) {
    // Skip cache for now - always fetch from DB to ensure Mongoose methods are available
    // TODO: Implement proper cache hydration if performance becomes an issue
    
    // Fetch from database
    let cart = await Cart.findActiveUserCart(userId);
    
    if (!cart && options.createIfNotExists) {
      // Don't create empty cart - will be created when first item is added
      return null;
    }
    
    return cart;
  }

  /**
   * Get or create cart for session (anonymous user)
   */
  async getSessionCart(sessionId, options = {}) {
    if (!sessionId) {
      throw new AppError('Session ID required for anonymous cart', 400);
    }
    
    // Skip cache for now - always fetch from DB to ensure Mongoose methods are available
    // TODO: Implement proper cache hydration if performance becomes an issue
    
    let cart = await Cart.findActiveSessionCart(sessionId);
    
    if (!cart && options.createIfNotExists) {
      return null;
    }
    
    return cart;
  }

  /**
   * Add item to cart
   */
  async addItemToCart({ userId, sessionId, foodId, quantity, metadata = {} }) {
    // Validate food item
    const food = await Food.findById(foodId).populate('foodPartner');
    
    if (!food) {
      throw new AppError('Food item not found', 404);
    }
    
    if (!food.isOrderable) {
      throw new AppError('This food item is not available for ordering', 400);
    }
    
    if (!food.price || food.price <= 0) {
      throw new AppError('Food item price is invalid', 400);
    }
    
    // Get or create cart
    let cart;
    
    if (userId) {
      cart = await this.getUserCart(userId);
    } else if (sessionId) {
      cart = await this.getSessionCart(sessionId);
    } else {
      throw new AppError('Either userId or sessionId required', 400);
    }
    
    // Create new cart if doesn't exist
    if (!cart) {
      cart = new Cart({
        user: userId || null,
        sessionId: userId ? null : sessionId,
        foodPartner: food.foodPartner._id,
        foodPartnerName: food.foodPartner.name,
        items: [],
        itemCount: 0,
        totalPrice: 0,
        status: 'active',
        expiresAt: new Date(Date.now() + (userId ? 30 : 7) * 24 * 60 * 60 * 1000),
        metadata: {
          source: metadata.source || 'web',
          userAgent: metadata.userAgent,
          ip: metadata.ip,
        },
      });
    } else {
      // Validate same food partner
      // Handle both populated and non-populated foodPartner
      const cartFoodPartnerId = cart.foodPartner._id || cart.foodPartner;
      const newFoodPartnerId = food.foodPartner._id;
      
      if (cartFoodPartnerId.toString() !== newFoodPartnerId.toString()) {
        throw new AppError(
          `Cart already contains items from ${cart.foodPartnerName}. Please checkout or clear cart first.`,
          400,
          {
            code: 'DIFFERENT_FOOD_PARTNER',
            currentPartner: cart.foodPartnerName,
            requestedPartner: food.foodPartner.name,
          }
        );
      }
    }
    
    // Add item using model method
    cart.addItem(food, quantity);
    
    // Save cart
    await cart.save();
    
    // Invalidate cache
    await this._invalidateCartCache(userId, sessionId);
    
    // Log analytics event
    logger.business('Cart item added', {
      cartId: cart._id,
      userId: userId || null,
      sessionId: sessionId || null,
      foodId,
      foodName: food.name,
      quantity,
      price: food.price,
      subtotal: food.price * quantity,
      cartTotal: cart.totalPrice,
      itemCount: cart.itemCount,
    });
    
    return cart;
  }

  /**
   * Update item quantity in cart
   */
  async updateCartItem({ userId, sessionId, foodId, quantity }) {
    const cart = userId 
      ? await this.getUserCart(userId)
      : await this.getSessionCart(sessionId);
    
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }
    
    if (quantity < 0) {
      throw new AppError('Quantity cannot be negative', 400);
    }
    
    if (quantity === 0) {
      return this.removeCartItem({ userId, sessionId, foodId });
    }
    
    // Update quantity
    cart.updateItemQuantity(foodId, quantity);
    
    await cart.save();
    
    // Invalidate cache
    await this._invalidateCartCache(userId, sessionId);
    
    logger.business('Cart item updated', {
      cartId: cart._id,
      userId: userId || null,
      sessionId: sessionId || null,
      foodId,
      quantity,
      cartTotal: cart.totalPrice,
    });
    
    return cart;
  }

  /**
   * Remove item from cart
   */
  async removeCartItem({ userId, sessionId, foodId }) {
    const cart = userId 
      ? await this.getUserCart(userId)
      : await this.getSessionCart(sessionId);
    
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }
    
    cart.removeItem(foodId);
    
    // If cart is empty, delete it
    if (cart.items.length === 0) {
      await cart.deleteOne();
      await this._invalidateCartCache(userId, sessionId);
      
      logger.business('Cart deleted (empty after item removal)', {
        cartId: cart._id,
        userId: userId || null,
        sessionId: sessionId || null,
      });
      
      return null;
    }
    
    await cart.save();
    
    // Invalidate cache
    await this._invalidateCartCache(userId, sessionId);
    
    logger.business('Cart item removed', {
      cartId: cart._id,
      userId: userId || null,
      sessionId: sessionId || null,
      foodId,
      cartTotal: cart.totalPrice,
    });
    
    return cart;
  }

  /**
   * Clear cart
   */
  async clearCart({ userId, sessionId }) {
    const cart = userId 
      ? await this.getUserCart(userId)
      : await this.getSessionCart(sessionId);
    
    if (!cart) {
      return null;
    }
    
    await cart.deleteOne();
    
    // Invalidate cache
    await this._invalidateCartCache(userId, sessionId);
    
    logger.business('Cart cleared', {
      cartId: cart._id,
      userId: userId || null,
      sessionId: sessionId || null,
    });
    
    return null;
  }

  /**
   * Validate cart prices against current database prices
   */
  async validateCartPrices({ userId, sessionId }) {
    const cart = userId 
      ? await this.getUserCart(userId)
      : await this.getSessionCart(sessionId);
    
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }
    
    const { priceChanged, priceChanges } = await cart.validatePrices();
    
    if (priceChanged) {
      await cart.save();
      await this._invalidateCartCache(userId, sessionId);
      
      logger.warn('Cart prices updated due to price changes', {
        cartId: cart._id,
        userId: userId || null,
        priceChanges,
      });
    }
    
    return {
      cart,
      priceChanged,
      priceChanges,
    };
  }

  /**
   * Merge session cart to user cart on login
   */
  async mergeSessionCartOnLogin(sessionId, userId) {
    if (!sessionId || !userId) {
      return null;
    }
    
    const mergedCart = await Cart.mergeSessionCartToUser(sessionId, userId);
    
    // Invalidate both caches
    await this._invalidateCartCache(userId, sessionId);
    
    if (mergedCart) {
      logger.business('Session cart merged to user cart', {
        userId,
        sessionId,
        cartId: mergedCart._id,
        itemCount: mergedCart.itemCount,
        totalPrice: mergedCart.totalPrice,
      });
    }
    
    return mergedCart;
  }

  /**
   * Convert cart to order (called during checkout)
   */
  async convertCartToOrder({ userId, sessionId, deliveryAddress }) {
    const cart = userId 
      ? await this.getUserCart(userId)
      : await this.getSessionCart(sessionId);
    
    if (!cart) {
      throw new AppError('Cart not found or empty', 404);
    }
    
    // Validate prices before checkout
    const { priceChanged, priceChanges } = await cart.validatePrices();
    
    if (priceChanged) {
      await cart.save();
      await this._invalidateCartCache(userId, sessionId);
      
      throw new AppError('Cart prices have changed. Please review your cart.', 400, {
        code: 'PRICE_CHANGED',
        priceChanges,
      });
    }
    
    // Convert to order format
    const orderData = cart.toOrderFormat(deliveryAddress);
    
    // Mark cart as converted
    cart.status = 'converted';
    await cart.save();
    
    // Invalidate cache
    await this._invalidateCartCache(userId, sessionId);
    
    logger.business('Cart converted to order', {
      cartId: cart._id,
      userId: userId || null,
      sessionId: sessionId || null,
      totalPrice: cart.totalPrice,
      itemCount: cart.itemCount,
    });
    
    return orderData;
  }

  /**
   * Get cart summary for quick display
   */
  async getCartSummary({ userId, sessionId }) {
    const cart = userId 
      ? await this.getUserCart(userId)
      : await this.getSessionCart(sessionId);
    
    if (!cart) {
      return {
        itemCount: 0,
        totalPrice: 0,
        hasCart: false,
      };
    }
    
    return {
      itemCount: cart.itemCount,
      totalPrice: cart.totalPrice,
      foodPartnerName: cart.foodPartnerName,
      hasCart: true,
      lastUpdated: cart.lastActivityAt,
    };
  }

  /**
   * Invalidate cart cache
   */
  async _invalidateCartCache(userId, sessionId) {
    const promises = [];
    
    if (userId) {
      promises.push(cache.del(this._getCacheKey(userId, 'user')));
    }
    
    if (sessionId) {
      promises.push(cache.del(this._getCacheKey(sessionId, 'session')));
    }
    
    try {
      await Promise.all(promises);
    } catch (error) {
      logger.warn('Failed to invalidate cart cache', { userId, sessionId, error: error.message });
    }
  }

  /**
   * Generate session ID for anonymous users
   */
  generateSessionId() {
    return uuidv4();
  }
}

module.exports = new CartService();
