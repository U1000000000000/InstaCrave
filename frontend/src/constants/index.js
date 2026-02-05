/**
 * Application Constants
 * Centralized configuration for app-wide constants
 */

export const API_ENDPOINTS = {
  AUTH: {
    ME: '/api/v1/auth/me',
    USER_LOGIN: '/api/v1/auth/user/login',
    USER_REGISTER: '/api/v1/auth/user/register',
    USER_LOGOUT: '/api/v1/auth/user/logout',
    FOOD_PARTNER_LOGIN: '/api/v1/auth/food-partner/login',
    FOOD_PARTNER_REGISTER: '/api/v1/auth/food-partner/register',
    FOOD_PARTNER_LOGOUT: '/api/v1/auth/food-partner/logout',
    LOGOUT: '/api/v1/auth/logout',
    WEBSOCKET_TOKEN: '/api/v1/auth/websocket-token',
  },
  FOOD: {
    BASE: '/api/v1/food',
    FOLLOWED: '/api/v1/food/followed',
    SAVE: '/api/v1/food/save',
    LIKE: '/api/v1/food/like',
    COMMENT: '/api/v1/food/comment',
    DELETE_COMMENT: '/api/v1/food/delete-comment',
    SHARE: '/api/v1/food/share',
  },
  USER: {
    BASE: '/api/v1/user',
    COMMENTS: '/api/v1/user/comments',
    LIKES: '/api/v1/user/likes',
    FOLLOWING: '/api/v1/user/follows',
  },
  FOOD_PARTNER: {
    BASE: '/api/v1/food-partner',
    FOLLOW: '/api/v1/food-partner/follow',
  },
  ORDERS: {
    CREATE: '/api/v1/orders',
    USER_ORDERS: '/api/v1/orders',
    PARTNER_ORDERS: '/api/v1/orders/partner',
    UPDATE_STATUS: '/api/v1/orders',
  },
  SEARCH: {
    BASE: '/api/v1/search',
    EXPLORE: '/api/v1/search/explore',
  },
  CART: {
    BASE: '/api/v1/cart',
    ITEMS: '/api/v1/cart/items',
    MERGE: '/api/v1/cart/merge',
    VALIDATE: '/api/v1/cart/validate',
    SUMMARY: '/api/v1/cart/summary',
  },
  PAYMENT: {
    INITIATE: '/api/v1/payment/initiate',
    PROCESS: '/api/v1/payment/process',
    VERIFY: '/api/v1/payment/verify',
  },
};

export const USER_TYPES = {
  USER: 'user',
  FOOD_PARTNER: 'food-partner',
};

export const ROUTES = {
  HOME: '/',
  AUTH: {
    USER_LOGIN: '/user/login',
    USER_REGISTER: '/user/register',
    FOOD_PARTNER_LOGIN: '/food-partner/login',
    FOOD_PARTNER_REGISTER: '/food-partner/register',
  },
  USER: {
    LOGIN: '/user/login',
    REGISTER: '/user/register',
    REELS: '/user/reels',
    SEARCH: '/user/search',
    PROFILE: '/user/profile',
    CART: '/user/cart',
    CHECKOUT: '/user/checkout',
    PAYMENT: '/user/payment',
  },
  FOOD_PARTNER: {
    LOGIN: '/food-partner/login',
    REGISTER: '/food-partner/register',
    DASHBOARD: '/food-partner/dashboard',
    PROFILE: '/food-partner/profile',
    CREATE_FOOD: '/create-food',
    CREATE: '/create-food',
  },
  GENERAL: {
    HOME: '/',
  },
  SAVED: '/saved',
};

export const DOUBLE_TAP_DELAY = 350;
export const MAX_TAP_DISTANCE = 30;
export const DESCRIPTION_TRUNCATE_LENGTH = 120;

export const ANIMATION = {
  FADE_DURATION: 0.2,
  HEART_POP_DURATION: 700,
  DEBOUNCE_DELAY: 300,
};

export const GRID = {
  COLUMNS: 3,
  PARTNER_PLACEMENT_CHANCE: 0.15,
  TALL_ITEM_CHANCE: 0.05,
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

export const DEFAULT_IMAGES = {
  PROFILE: 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210',
};

export const MESSAGES = {
  LOADING: 'Loading...',
  NO_RESULTS: 'No results found.',
  NO_VIDEOS: 'No videos yet.',
  NO_COMMENTS: 'No bites yet. Drop the first flavor!',
  CAUGHT_UP: "You're all caught up!",
  NOT_FOLLOWING: 'You are not following anyone.',
  ERROR: {
    GENERIC: 'Something went wrong. Please try again.',
    SEARCH: 'Error searching.',
    NETWORK: 'Network error. Please check your connection.',
  },
};

export const STORAGE_KEYS = {
  THEME: 'theme',
  USER_ID: 'userId',
  AUTH_TOKEN: 'authToken',
};

export const SEARCH_TYPES = [
  { label: 'All', value: 'all' },
  { label: 'Food Items', value: 'food' },
  { label: 'Food Partners', value: 'partner' },
];

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MIN_LENGTH: 3,
};
