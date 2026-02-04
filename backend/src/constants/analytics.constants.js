/**
 * @fileoverview Analytics Event Type Constants
 * @description Centralized registry of all analytics event types
 *              Used for consistent event tracking across the application
 */

/**
 * Authentication & User Lifecycle Events
 */
const AUTH_EVENTS = {
  PAGE_VIEWED: 'page:viewed',
  USER_REGISTERED: 'auth:user_registered',
  PARTNER_REGISTERED: 'auth:partner_registered',
  USER_LOGGED_IN: 'auth:user_logged_in',
  USER_LOGGED_OUT: 'auth:user_logged_out',
  PASSWORD_RESET_REQUESTED: 'auth:password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth:password_reset_completed',
  EMAIL_VERIFIED: 'auth:email_verified',
  SESSION_REFRESHED: 'auth:session_refreshed',
  SESSION_EXPIRED: 'auth:session_expired',
};

/**
 * Page View & Navigation Events
 */
const PAGE_VIEW_EVENTS = {
  PAGE_VIEWED: 'page:viewed',
  HOME_VIEWED: 'page:home_viewed',
  FOOD_LIST_VIEWED: 'page:food_list_viewed',
  FOOD_DETAIL_VIEWED: 'page:food_detail_viewed',
  PARTNER_PROFILE_VIEWED: 'page:partner_profile_viewed',
  CART_VIEWED: 'page:cart_viewed',
  CHECKOUT_VIEWED: 'page:checkout_viewed',
  ORDERS_VIEWED: 'page:orders_viewed',
  PROFILE_VIEWED: 'page:profile_viewed',
  EXPLORE_VIEWED: 'page:explore_viewed',
};

/**
 * Search & Discovery Events
 */
const SEARCH_EVENTS = {
  SEARCH_PERFORMED: 'search:performed',
  SEARCH_QUERY_SUBMITTED: 'search:query_submitted',
  SEARCH_QUERY_SUBMITTED: 'search:query_submitted',
  SEARCH_RESULTS_VIEWED: 'search:results_viewed',
  SEARCH_RESULT_CLICKED: 'search:result_clicked',
  SEARCH_NO_RESULTS: 'search:no_results',
  SEARCH_FILTER_APPLIED: 'search:filter_applied',
  SEARCH_FILTER_CLEARED: 'search:filter_cleared',
  EXPLORE_LOADED: 'search:explore_loaded',
};

/**
 * Food Item Interaction Events
 */
const FOOD_EVENTS = {
  FOOD_VIEWED: 'food:item_viewed',
  FOOD_LIKED: 'food:item_liked',
  FOOD_UNLIKED: 'food:item_unliked',
  FOOD_SAVED: 'food:item_saved',
  FOOD_UNSAVED: 'food:item_unsaved',
  FOOD_SHARED: 'food:item_shared',
  FOOD_COMMENTED: 'food:item_commented',
  FOOD_CREATED: 'food:item_created',
  FOOD_UPDATED: 'food:item_updated',
  FOOD_DELETED: 'food:item_deleted',
};

/**
 * Cart & Checkout Events
 */
const CART_EVENTS = {
  ITEM_ADDED_TO_CART: 'cart:item_added',
  ITEM_REMOVED_FROM_CART: 'cart:item_removed',
  ITEM_QUANTITY_INCREASED: 'cart:quantity_increased',
  ITEM_QUANTITY_DECREASED: 'cart:quantity_decreased',
  CART_CLEARED: 'cart:cleared',
  CHECKOUT_STARTED: 'cart:checkout_started',
  CHECKOUT_ABANDONED: 'cart:checkout_abandoned',
};

/**
 * Order Lifecycle Events
 */
const ORDER_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_PREPARING: 'order:preparing',
  ORDER_READY: 'order:ready',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_VIEWED: 'order:viewed',
  ORDER_RATED: 'order:rated',
};

/**
 * Payment Events
 */
const PAYMENT_EVENTS = {
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_REFUNDED: 'payment:refunded',
  PAYMENT_METHOD_CHANGED: 'payment:method_changed',
  PAYMENT_RETRY: 'payment:retry',
};

/**
 * Partner Interaction Events
 */
const PARTNER_EVENTS = {
  PARTNER_FOLLOWED: 'partner:followed',
  PARTNER_UNFOLLOWED: 'partner:unfollowed',
  PARTNER_PROFILE_UPDATED: 'partner:profile_updated',
  PARTNER_FOOD_CREATED: 'partner:food_created',
  PARTNER_ORDERS_VIEWED: 'partner:orders_viewed',
  PARTNER_STATS_VIEWED: 'partner:stats_viewed',
};

/**
 * User Profile Events
 */
const USER_EVENTS = {
  PROFILE_UPDATED: 'user:profile_updated',
  PROFILE_IMAGE_CHANGED: 'user:profile_image_changed',
  PREFERENCES_UPDATED: 'user:preferences_updated',
  NOTIFICATION_SETTINGS_CHANGED: 'user:notification_settings_changed',
};

/**
 * System & Performance Events
 */
const SYSTEM_EVENTS = {
  ERROR_OCCURRED: 'system:error',
  API_SLOW_RESPONSE: 'system:slow_api',
  API_ERROR: 'system:api_error',
  CACHE_HIT: 'system:cache_hit',
  CACHE_MISS: 'system:cache_miss',
  RATE_LIMIT_EXCEEDED: 'system:rate_limit_exceeded',
  CSRF_TOKEN_INVALID: 'system:csrf_invalid',
  UNAUTHORIZED_ACCESS: 'system:unauthorized_access',
};

/**
 * Event Categories (for grouping)
 */
const EVENT_CATEGORIES = {
  PAGE_VIEW: 'page_view',
  INTERACTION: 'interaction',
  TRANSACTION: 'transaction',
  SYSTEM: 'system',
  ERROR: 'error',
  PERFORMANCE: 'performance',
};

/**
 * All event types (flattened for validation)
 */
const ALL_EVENT_TYPES = {
  ...AUTH_EVENTS,
  ...PAGE_VIEW_EVENTS,
  ...SEARCH_EVENTS,
  ...FOOD_EVENTS,
  ...CART_EVENTS,
  ...ORDER_EVENTS,
  ...PAYMENT_EVENTS,
  ...PARTNER_EVENTS,
  ...USER_EVENTS,
  ...SYSTEM_EVENTS,
};

/**
 * Event category mapping
 * Maps each event type to its category
 */
const EVENT_TYPE_TO_CATEGORY = {
  // Page views
  ...Object.fromEntries(Object.values(PAGE_VIEW_EVENTS).map(e => [e, EVENT_CATEGORIES.PAGE_VIEW])),
  
  // Interactions
  ...Object.fromEntries(Object.values(FOOD_EVENTS).map(e => [e, EVENT_CATEGORIES.INTERACTION])),
  ...Object.fromEntries(Object.values(PARTNER_EVENTS).map(e => [e, EVENT_CATEGORIES.INTERACTION])),
  ...Object.fromEntries(Object.values(SEARCH_EVENTS).map(e => [e, EVENT_CATEGORIES.INTERACTION])),
  
  // Transactions
  ...Object.fromEntries(Object.values(AUTH_EVENTS).map(e => [e, EVENT_CATEGORIES.TRANSACTION])),
  ...Object.fromEntries(Object.values(CART_EVENTS).map(e => [e, EVENT_CATEGORIES.TRANSACTION])),
  ...Object.fromEntries(Object.values(ORDER_EVENTS).map(e => [e, EVENT_CATEGORIES.TRANSACTION])),
  ...Object.fromEntries(Object.values(PAYMENT_EVENTS).map(e => [e, EVENT_CATEGORIES.TRANSACTION])),
  
  // System events
  'system:cache_hit': EVENT_CATEGORIES.SYSTEM,
  'system:cache_miss': EVENT_CATEGORIES.SYSTEM,
  
  // Performance events
  'system:slow_api': EVENT_CATEGORIES.PERFORMANCE,
  
  // Error events
  'system:error': EVENT_CATEGORIES.ERROR,
  'system:api_error': EVENT_CATEGORIES.ERROR,
  'system:rate_limit_exceeded': EVENT_CATEGORIES.ERROR,
  'system:csrf_invalid': EVENT_CATEGORIES.ERROR,
  'system:unauthorized_access': EVENT_CATEGORIES.ERROR,
};

/**
 * Funnel steps (for conversion tracking)
 */
const FUNNEL_STEPS = {
  // User acquisition funnel
  LANDING: 'landing',
  SIGNUP: 'signup',
  FIRST_SEARCH: 'first_search',
  FIRST_INTERACTION: 'first_interaction',
  FIRST_ORDER: 'first_order',
  
  // Order conversion funnel
  SEARCH: 'search',
  VIEW_FOOD: 'view_food',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT: 'checkout',
  PAYMENT: 'payment',
  ORDER_COMPLETE: 'order_complete',
  
  // Partner funnel
  DISCOVER_PARTNER: 'discover_partner',
  VIEW_PARTNER: 'view_partner',
  FOLLOW_PARTNER: 'follow_partner',
  ORDER_FROM_PARTNER: 'order_from_partner',
};

/**
 * Event to funnel step mapping
 */
const EVENT_TO_FUNNEL_STEP = {
  [PAGE_VIEW_EVENTS.HOME_VIEWED]: FUNNEL_STEPS.LANDING,
  [AUTH_EVENTS.USER_REGISTERED]: FUNNEL_STEPS.SIGNUP,
  [SEARCH_EVENTS.SEARCH_PERFORMED]: FUNNEL_STEPS.SEARCH,
  [FOOD_EVENTS.FOOD_VIEWED]: FUNNEL_STEPS.VIEW_FOOD,
  [CART_EVENTS.ITEM_ADDED_TO_CART]: FUNNEL_STEPS.ADD_TO_CART,
  [CART_EVENTS.CHECKOUT_STARTED]: FUNNEL_STEPS.CHECKOUT,
  [PAYMENT_EVENTS.PAYMENT_INITIATED]: FUNNEL_STEPS.PAYMENT,
  [ORDER_EVENTS.ORDER_CREATED]: FUNNEL_STEPS.ORDER_COMPLETE,
  [PARTNER_EVENTS.PARTNER_FOLLOWED]: FUNNEL_STEPS.FOLLOW_PARTNER,
};

/**
 * Get category for event type
 */
const getCategoryForEvent = (eventType) => {
  return EVENT_TYPE_TO_CATEGORY[eventType] || EVENT_CATEGORIES.INTERACTION;
};

/**
 * Get funnel step for event type
 */
const getFunnelStepForEvent = (eventType) => {
  return EVENT_TO_FUNNEL_STEP[eventType] || null;
};

/**
 * Validate event type
 */
const isValidEventType = (eventType) => {
  return Object.values(ALL_EVENT_TYPES).includes(eventType);
};

module.exports = {
  // Event type groups
  AUTH_EVENTS,
  PAGE_VIEW_EVENTS,
  SEARCH_EVENTS,
  FOOD_EVENTS,
  CART_EVENTS,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  PARTNER_EVENTS,
  USER_EVENTS,
  SYSTEM_EVENTS,
  
  // All event types
  ALL_EVENT_TYPES,
  
  // Categories
  EVENT_CATEGORIES,
  EVENT_TYPE_TO_CATEGORY,
  
  // Funnels
  FUNNEL_STEPS,
  EVENT_TO_FUNNEL_STEP,
  
  // Utilities
  getCategoryForEvent,
  getFunnelStepForEvent,
  isValidEventType,
};
