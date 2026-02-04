/**
 * @fileoverview Analytics Helper Utility
 * @description Convenient wrapper around analyticsService for controller usage
 */

const analyticsService = require('../services/analytics.service');
const logger = require('../services/logger.service');

/**
 * Track analytics event (convenience wrapper)
 * 
 * Usage in controllers:
 * ```
 * const { trackEvent } = require('../utils/analytics.helper');
 * 
 * await trackEvent(req, 'food:item_viewed', {
 *   foodId: food._id,
 *   partnerId: food.foodPartner,
 *   price: food.price
 * });
 * ```
 * 
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type (from constants)
 * @param {Object} data - Event-specific data
 * @param {Object} options - Additional options (metadata, funnel, performance)
 */
const trackEvent = async (req, eventType, data = {}, options = {}) => {
  try {
    // Extract user context
    const userId = req.user?.id || req.user?._id;
    const userType = req.user ? (req.foodPartner ? 'FoodPartner' : 'User') : null;
    const sessionId = req.cookies?.sessionId || req.body?.sessionId;

    // Track the event
    await analyticsService.trackEvent({
      eventType,
      userId,
      userType,
      sessionId,
      data,
      metadata: options.metadata || {},
      funnel: options.funnel,
      performance: options.performance,
      error: options.error,
      request: req,
    });
  } catch (error) {
    // Don't throw - analytics failures shouldn't break the app
    logger.error('Failed to track analytics event in helper', {
      error: error.message,
      eventType,
      userId: req.user?.id,
    });
  }
};

/**
 * Track page view event
 * 
 * @param {Object} req - Express request object
 * @param {string} page - Page name
 * @param {Object} data - Additional page data
 */
const trackPageView = async (req, page, data = {}) => {
  const pageViewEvents = {
    home: 'page:home_viewed',
    food_list: 'page:food_list_viewed',
    food_detail: 'page:food_detail_viewed',
    partner_profile: 'page:partner_profile_viewed',
    cart: 'page:cart_viewed',
    checkout: 'page:checkout_viewed',
    orders: 'page:orders_viewed',
    profile: 'page:profile_viewed',
    explore: 'page:explore_viewed',
  };

  const eventType = pageViewEvents[page];
  if (!eventType) {
    logger.warn('Unknown page type for tracking', { page });
    return;
  }

  await trackEvent(req, eventType, data);
};

/**
 * Track search event
 * 
 * @param {Object} req - Express request object
 * @param {string} query - Search query
 * @param {number} resultsCount - Number of results
 * @param {Object} filters - Applied filters
 */
const trackSearch = async (req, query, resultsCount, filters = {}) => {
  await trackEvent(req, 'search:query_submitted', {
    query,
    resultsCount,
    filters,
    hasResults: resultsCount > 0,
  }, {
    funnel: {
      step: 'search',
      source: req.get('referer'),
    },
  });

  // Also track no-results as separate event
  if (resultsCount === 0) {
    await trackEvent(req, 'search:no_results', {
      query,
      filters,
    });
  }
};

/**
 * Track order event
 * 
 * @param {Object} req - Express request object
 * @param {string} orderEventType - Type of order event
 * @param {Object} order - Order object
 */
const trackOrder = async (req, orderEventType, order) => {
  const orderEvents = {
    created: 'order:created',
    confirmed: 'order:confirmed',
    preparing: 'order:preparing',
    ready: 'order:ready',
    delivered: 'order:delivered',
    cancelled: 'order:cancelled',
  };

  const eventType = orderEvents[orderEventType];
  if (!eventType) {
    logger.warn('Unknown order event type', { orderEventType });
    return;
  }

  await trackEvent(req, eventType, {
    orderId: order._id?.toString() || order.id,
    amount: order.totalPrice || order.total,
    items: order.items?.length || 1,
    status: order.status,
    partnerId: order.foodPartner?.toString() || order.foodPartner,
    paymentMethod: order.paymentMethod,
  }, {
    funnel: {
      step: 'order_complete',
    },
  });
};

/**
 * Track payment event
 * 
 * @param {Object} req - Express request object
 * @param {string} paymentEventType - Type of payment event (initiated, success, failed)
 * @param {Object} payment - Payment object
 */
const trackPayment = async (req, paymentEventType, payment) => {
  const paymentEvents = {
    initiated: 'payment:initiated',
    success: 'payment:success',
    failed: 'payment:failed',
    refunded: 'payment:refunded',
  };

  const eventType = paymentEvents[paymentEventType];
  if (!eventType) {
    logger.warn('Unknown payment event type', { paymentEventType });
    return;
  }

  await trackEvent(req, eventType, {
    paymentId: payment._id?.toString() || payment.id,
    amount: payment.amount,
    currency: payment.currency || 'INR',
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    orderId: payment.order?.toString() || payment.orderId,
    transactionId: payment.transactionId,
    errorMessage: payment.errorMessage,
  });
};

/**
 * Track cart event
 * 
 * @param {Object} req - Express request object
 * @param {string} cartEventType - Type of cart event
 * @param {Object} data - Cart data
 */
const trackCart = async (req, cartEventType, data) => {
  const cartEvents = {
    item_added: 'cart:item_added',
    item_removed: 'cart:item_removed',
    quantity_increased: 'cart:quantity_increased',
    quantity_decreased: 'cart:quantity_decreased',
    cleared: 'cart:cleared',
    checkout_started: 'cart:checkout_started',
  };

  const eventType = cartEvents[cartEventType];
  if (!eventType) {
    logger.warn('Unknown cart event type', { cartEventType });
    return;
  }

  await trackEvent(req, eventType, data, {
    funnel: {
      step: cartEventType === 'checkout_started' ? 'checkout' : 'add_to_cart',
    },
  });
};

/**
 * Track food item interaction
 * 
 * @param {Object} req - Express request object
 * @param {string} action - Action type (viewed, liked, saved, etc.)
 * @param {Object} food - Food object
 */
const trackFoodInteraction = async (req, action, food) => {
  const foodEvents = {
    viewed: 'food:item_viewed',
    liked: 'food:item_liked',
    unliked: 'food:item_unliked',
    saved: 'food:item_saved',
    unsaved: 'food:item_unsaved',
    shared: 'food:item_shared',
    commented: 'food:item_commented',
  };

  const eventType = foodEvents[action];
  if (!eventType) {
    logger.warn('Unknown food interaction type', { action });
    return;
  }

  await trackEvent(req, eventType, {
    foodId: food._id?.toString() || food.id,
    foodName: food.name,
    partnerId: food.foodPartner?.toString() || food.foodPartner,
    price: food.price,
    isOrderable: food.isOrderable,
  }, {
    funnel: {
      step: action === 'viewed' ? 'view_food' : undefined,
    },
  });
};

/**
 * Track partner interaction
 * 
 * @param {Object} req - Express request object
 * @param {string} action - Action type (followed, unfollowed, etc.)
 * @param {Object} partner - Partner object
 */
const trackPartnerInteraction = async (req, action, partner) => {
  const partnerEvents = {
    followed: 'partner:followed',
    unfollowed: 'partner:unfollowed',
    profile_viewed: 'page:partner_profile_viewed',
  };

  const eventType = partnerEvents[action];
  if (!eventType) {
    logger.warn('Unknown partner interaction type', { action });
    return;
  }

  await trackEvent(req, eventType, {
    partnerId: partner._id?.toString() || partner.id,
    partnerName: partner.name,
    followCount: partner.followCount,
  }, {
    funnel: {
      step: action === 'followed' ? 'follow_partner' : 'view_partner',
    },
  });
};

/**
 * Track error event
 * 
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const trackError = async (req, error, context = {}) => {
  await trackEvent(req, 'system:error', context, {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode || error.status,
    },
  });
};

module.exports = {
  trackEvent,
  trackPageView,
  trackSearch,
  trackOrder,
  trackPayment,
  trackCart,
  trackFoodInteraction,
  trackPartnerInteraction,
  trackError,
};
