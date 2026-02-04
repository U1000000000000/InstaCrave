const cartService = require('../services/cart.service');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const responseUtil = require('../utils/response');
const logger = require('../services/logger.service');
const { addAnalyticsJob, JOB_TYPES } = require('../queue/index');

/**
 * Cart Controller - HTTP handlers for cart operations
 * 
 * Supports both authenticated and anonymous users
 * Uses cartService for business logic
 */

/**
 * Get user/session identifier from request
 */
function getCartIdentifier(req) {
  const userId = req.user?.id || null;
  const sessionId = req.cookies?.cart_session || req.headers['x-cart-session'] || null;
  
  return { userId, sessionId };
}

/**
 * Ensure session ID exists (for anonymous users)
 */
function ensureSessionId(req, res) {
  let sessionId = req.cookies?.cart_session || req.headers['x-cart-session'];
  
  if (!sessionId) {
    sessionId = cartService.generateSessionId();
    
    // Set session cookie
    res.cookie('cart_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
  
  return sessionId;
}

/**
 * Get cart metadata from request
 */
function getCartMetadata(req) {
  return {
    source: req.headers['x-client-type'] || 'web',
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  };
}

// ======================
// CART OPERATIONS
// ======================

/**
 * Get current cart
 * GET /api/v1/cart
 */
const getCart = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  
  // Ensure anonymous users have session ID
  const finalSessionId = userId ? null : (sessionId || ensureSessionId(req, res));
  
  const cart = userId
    ? await cartService.getUserCart(userId)
    : await cartService.getSessionCart(finalSessionId);
  
  if (!cart) {
    return responseUtil.sendItemResponse(res, {
      data: {
        items: [],
        itemCount: 0,
        totalPrice: 0,
        foodPartner: null,
        foodPartnerName: null,
      },
      message: 'Cart is empty',
    });
  }
  
  req.logger.info('Cart retrieved', {
    cartId: cart._id,
    userId: userId || null,
    sessionId: finalSessionId || null,
    itemCount: cart.itemCount,
    totalPrice: cart.totalPrice,
  });
  
  responseUtil.sendItemResponse(res, {
    data: cart,
    message: 'Cart retrieved successfully',
  });
});

/**
 * Get cart summary (lightweight endpoint for UI badges)
 * GET /api/v1/cart/summary
 */
const getCartSummary = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  const finalSessionId = userId ? null : (sessionId || ensureSessionId(req, res));
  
  const summary = await cartService.getCartSummary({
    userId,
    sessionId: finalSessionId,
  });
  
  responseUtil.sendItemResponse(res, {
    data: summary,
    message: 'Cart summary retrieved',
  });
});

/**
 * Add item to cart
 * POST /api/v1/cart/items
 */
const addItemToCart = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  const finalSessionId = userId ? null : (sessionId || ensureSessionId(req, res));
  
  // If user is authenticated and has a session cookie, clear it
  if (userId && sessionId) {
    res.clearCookie('cart_session');
  }
  
  const { foodId, quantity } = req.body;
  const metadata = getCartMetadata(req);
  
  const cart = await cartService.addItemToCart({
    userId,
    sessionId: finalSessionId,
    foodId,
    quantity,
    metadata,
  });
  
  // Track analytics event (async, non-blocking)
  try {
    await addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
      userId: userId || null,
      sessionId: finalSessionId || null,
      action: 'cart_item_added',
      metadata: {
        cartId: cart._id.toString(),
        foodId,
        quantity,
        cartTotal: cart.totalPrice,
        itemCount: cart.itemCount,
      },
    });
  } catch (analyticsError) {
    req.logger.warn('Failed to track cart analytics', {
      error: analyticsError.message,
      cartId: cart._id,
    });
  }
  
  req.logger.info('Item added to cart', {
    cartId: cart._id,
    userId: userId || null,
    sessionId: finalSessionId || null,
    foodId,
    quantity,
    itemCount: cart.itemCount,
    totalPrice: cart.totalPrice,
  });
  
  responseUtil.sendItemResponse(res, {
    data: cart,
    message: 'Item added to cart successfully',
  });
});

/**
 * Update cart item quantity
 * PATCH /api/v1/cart/items/:foodId
 */
const updateCartItem = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  const finalSessionId = userId ? null : sessionId;
  
  if (!userId && !finalSessionId) {
    throw new AppError('No active cart found', 404);
  }
  
  const { foodId } = req.params;
  const { quantity } = req.body;
  
  const cart = await cartService.updateCartItem({
    userId,
    sessionId: finalSessionId,
    foodId,
    quantity,
  });
  
  // Track analytics
  try {
    await addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
      userId: userId || null,
      sessionId: finalSessionId || null,
      action: 'cart_item_updated',
      metadata: {
        cartId: cart?._id?.toString(),
        foodId,
        quantity,
        cartTotal: cart?.totalPrice || 0,
      },
    });
  } catch (analyticsError) {
    req.logger.warn('Failed to track cart analytics', { error: analyticsError.message });
  }
  
  req.logger.info('Cart item updated', {
    cartId: cart?._id,
    userId: userId || null,
    foodId,
    quantity,
  });
  
  if (!cart) {
    return responseUtil.sendItemResponse(res, {
      data: null,
      message: 'Cart is now empty',
    });
  }
  
  responseUtil.sendItemResponse(res, {
    data: cart,
    message: 'Cart item updated successfully',
  });
});

/**
 * Remove item from cart
 * DELETE /api/v1/cart/items/:foodId
 */
const removeCartItem = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  const finalSessionId = userId ? null : sessionId;
  
  if (!userId && !finalSessionId) {
    throw new AppError('No active cart found', 404);
  }
  
  const { foodId } = req.params;
  
  const cart = await cartService.removeCartItem({
    userId,
    sessionId: finalSessionId,
    foodId,
  });
  
  // Track analytics
  try {
    await addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
      userId: userId || null,
      sessionId: finalSessionId || null,
      action: 'cart_item_removed',
      metadata: {
        foodId,
        cartId: cart?._id?.toString(),
        cartTotal: cart?.totalPrice || 0,
      },
    });
  } catch (analyticsError) {
    req.logger.warn('Failed to track cart analytics', { error: analyticsError.message });
  }
  
  req.logger.info('Cart item removed', {
    cartId: cart?._id,
    userId: userId || null,
    foodId,
  });
  
  if (!cart) {
    return responseUtil.sendItemResponse(res, {
      data: null,
      message: 'Cart is now empty',
    });
  }
  
  responseUtil.sendItemResponse(res, {
    data: cart,
    message: 'Item removed from cart successfully',
  });
});

/**
 * Clear cart
 * DELETE /api/v1/cart
 */
const clearCart = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  const finalSessionId = userId ? null : sessionId;
  
  if (!userId && !finalSessionId) {
    throw new AppError('No active cart found', 404);
  }
  
  await cartService.clearCart({
    userId,
    sessionId: finalSessionId,
  });
  
  // Track analytics
  try {
    await addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
      userId: userId || null,
      sessionId: finalSessionId || null,
      action: 'cart_cleared',
      metadata: {},
    });
  } catch (analyticsError) {
    req.logger.warn('Failed to track cart analytics', { error: analyticsError.message });
  }
  
  req.logger.info('Cart cleared', {
    userId: userId || null,
    sessionId: finalSessionId || null,
  });
  
  responseUtil.sendItemResponse(res, {
    data: null,
    message: 'Cart cleared successfully',
  });
});

/**
 * Validate cart prices
 * POST /api/v1/cart/validate
 */
const validateCartPrices = catchAsync(async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);
  const finalSessionId = userId ? null : sessionId;
  
  if (!userId && !finalSessionId) {
    throw new AppError('No active cart found', 404);
  }
  
  const { cart, priceChanged, priceChanges } = await cartService.validateCartPrices({
    userId,
    sessionId: finalSessionId,
  });
  
  req.logger.info('Cart prices validated', {
    cartId: cart._id,
    userId: userId || null,
    priceChanged,
    priceChangesCount: priceChanges?.length || 0,
  });
  
  if (priceChanged) {
    return res.status(200).json({
      success: true,
      message: 'Cart prices have been updated',
      data: {
        cart,
        priceChanges,
      },
      priceChanged: true,
    });
  }
  
  responseUtil.sendItemResponse(res, {
    data: { cart, priceChanged: false },
    message: 'Cart prices are up to date',
  });
});

/**
 * Merge session cart on login (called by auth controller)
 * POST /api/v1/cart/merge
 */
const mergeSessionCart = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError('User authentication required', 401);
  }
  
  const sessionId = req.cookies?.cart_session || req.headers['x-cart-session'];
  
  if (!sessionId) {
    return responseUtil.sendItemResponse(res, {
      data: null,
      message: 'No session cart to merge',
    });
  }
  
  const mergedCart = await cartService.mergeSessionCartOnLogin(sessionId, userId);
  
  // Clear session cookie since cart is now associated with user
  res.clearCookie('cart_session');
  
  req.logger.info('Session cart merged', {
    userId,
    sessionId,
    cartId: mergedCart?._id,
  });
  
  responseUtil.sendItemResponse(res, {
    data: mergedCart,
    message: mergedCart ? 'Cart merged successfully' : 'No cart to merge',
  });
});

module.exports = {
  getCart,
  getCartSummary,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCartPrices,
  mergeSessionCart,
};
