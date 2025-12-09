/**
 * Application Constants
 * Centralized configuration for app-wide constants
 */

export const API_ENDPOINTS = {
  AUTH: {
    ME: '/api/auth/me',
    USER_LOGIN: '/api/auth/user/login',
    USER_REGISTER: '/api/auth/user/register',
    USER_LOGOUT: '/api/auth/user/logout',
    FOOD_PARTNER_LOGIN: '/api/auth/food-partner/login',
    FOOD_PARTNER_REGISTER: '/api/auth/food-partner/register',
    FOOD_PARTNER_LOGOUT: '/api/auth/food-partner/logout',
    LOGOUT: '/api/auth/logout',
  },
  FOOD: {
    FOLLOWED: '/api/food/followed',
    SAVE: '/api/food/save',
    LIKE: '/api/food/like',
    COMMENT: '/api/food/comment',
    DELETE_COMMENT: '/api/food/delete-comment',
    SHARE: '/api/food/share',
  },
  USER: {
    COMMENTS: '/api/user/comments',
    LIKES: '/api/user/likes',
    FOLLOWING: '/api/user/following',
  },
  FOOD_PARTNER: {
    FOLLOW: '/api/food-partner/follow',
  },
  ORDERS: {
    CREATE: '/api/orders',
    USER_ORDERS: '/api/orders',
    PARTNER_ORDERS: '/api/orders/partner',
    UPDATE_STATUS: '/api/orders',
  },
  SEARCH: {
    BASE: '/api/search',
    EXPLORE: '/api/search/explore',
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
