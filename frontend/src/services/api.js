// CSRF token in-memory store
let csrfToken = null;

/**
 * Fetch CSRF token from backend and store in memory
 */
export async function fetchCsrfToken() {
  try {
    const res = await axios.get('/api/v1/csrf-token', { withCredentials: true });
    csrfToken = res.data?.csrfToken || null;
    return csrfToken;
  } catch (err) {
    csrfToken = null;
    return null;
  }
}

/**
 * Get current CSRF token (in memory)
 */
export function getCsrfToken() {
  return csrfToken;
}
/**
 * API Service
 * Centralized API communication with automatic token refresh handling
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { API_ENDPOINTS } from '../constants';

/**
 * ------------------------------------------------------------------
 * Refresh token coordination state
 * ------------------------------------------------------------------
 * isRefreshing:
 *   - Ensures only ONE refresh-token request runs at a time
 *
 * failedQueue:
 *   - Holds pending requests while refresh is in progress
 *   - These requests will be retried once refresh succeeds
 */
let isRefreshing = false;
let failedQueue = [];

/**
 * Resolves or rejects all queued requests once refresh completes
 */
const processQueue = (error = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

/**
 * ------------------------------------------------------------------
 * Axios instance configuration
 * ------------------------------------------------------------------
 * withCredentials: true
 *   - Required for HTTP-only cookie authentication
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * ------------------------------------------------------------------
 * Request interceptor
 * ------------------------------------------------------------------
 * Currently a pass-through, but kept for:
 *   - Logging
 *   - Future header injection
 *   - Tracing / correlation IDs
 */
api.interceptors.request.use(
  (config) => {
    // Attach CSRF token to all state-changing requests
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ------------------------------------------------------------------
 * Response interceptor
 * Handles expired access tokens (401) by refreshing the session
 * ------------------------------------------------------------------
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If there is no response or it's not a 401, propagate the error
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Do NOT attempt refresh for auth-related endpoints
    const isAuthEndpoint =
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/logout') ||
      originalRequest.url.includes('/auth/refresh-token');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Prevent infinite retry loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Mark this request as already retried reminder
    originalRequest._retry = true;

    /**
     * If a refresh request is already running,
     * queue this request and retry it once refresh completes
     */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    // Start refresh process
    isRefreshing = true;

    try {
      // Attempt to refresh session (cookies will be updated by backend)
      await api.post('/api/v1/auth/refresh-token');

      // Retry all queued requests
      processQueue();

      // Retry the original failed request
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed → reject all queued requests
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * ------------------------------------------------------------------
 * Authentication API calls
 * ------------------------------------------------------------------
 */
export const authApi = {
  checkAuth: () => api.get(API_ENDPOINTS.AUTH.ME),

  loginUser: (email, password) =>
    api.post(API_ENDPOINTS.AUTH.USER_LOGIN, { email, password }),

  registerUser: (data) =>
    api.post(API_ENDPOINTS.AUTH.USER_REGISTER, data),

  loginFoodPartner: (email, password) =>
    api.post(API_ENDPOINTS.AUTH.FOOD_PARTNER_LOGIN, { email, password }),

  registerFoodPartner: (formData) =>
    api.post(API_ENDPOINTS.AUTH.FOOD_PARTNER_REGISTER, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Robust logout:
   *   - Attempts to logout both user and food partner sessions
   *   - Failures are intentionally ignored
   */
  logout: async () => {
    try {
      await api.get(API_ENDPOINTS.AUTH.USER_LOGOUT);
    } catch {}
    try {
      await api.get(API_ENDPOINTS.AUTH.FOOD_PARTNER_LOGOUT);
    } catch {}
  },

  logoutUser: () => api.get(API_ENDPOINTS.AUTH.USER_LOGOUT),
  logoutFoodPartner: () => api.get(API_ENDPOINTS.AUTH.FOOD_PARTNER_LOGOUT),
};

/**
 * ------------------------------------------------------------------
 * Sessions API calls
 * ------------------------------------------------------------------
 */
export const sessionsApi = {
  listSessions: () => api.get('/api/v1/auth/sessions'),
  revokeSession: (sessionId) => api.delete(`/api/v1/auth/sessions/${sessionId}`),
};

/**
 * ------------------------------------------------------------------
 * Food API calls
 * ------------------------------------------------------------------
 */
export const foodApi = {
  getFollowedFoods: () => api.get(API_ENDPOINTS.FOOD.FOLLOWED),

  toggleSave: (foodId) =>
    api.post(API_ENDPOINTS.FOOD.SAVE, { foodId }),

  toggleLike: (foodId) =>
    api.post(API_ENDPOINTS.FOOD.LIKE, { foodId }),

  getComments: (foodId) =>
    api.get(`${API_ENDPOINTS.FOOD.COMMENT}?foodId=${foodId}`),

  postComment: (comment, foodId) =>
    api.post(API_ENDPOINTS.FOOD.COMMENT, { comment, foodId }),

  deleteComment: (commentId) =>
    api.post(API_ENDPOINTS.FOOD.DELETE_COMMENT, { commentId }),

  shareFood: (foodId) =>
    api.post(API_ENDPOINTS.FOOD.SHARE, { foodId }),

  getSavedFoods: () =>
    api.get(API_ENDPOINTS.FOOD.SAVE),
};

/**
 * ------------------------------------------------------------------
 * User API calls
 * ------------------------------------------------------------------
 */
export const userApi = {
  getComments: () => api.get(API_ENDPOINTS.USER.COMMENTS),
  getLikes: () => api.get(API_ENDPOINTS.USER.LIKES),
  getFollowing: () => api.get(API_ENDPOINTS.USER.FOLLOWING),
};

/**
 * ------------------------------------------------------------------
 * Food Partner API calls
 * ------------------------------------------------------------------
 */
export const foodPartnerApi = {
  toggleFollow: (foodpartner) =>
    api.post(API_ENDPOINTS.FOOD_PARTNER.FOLLOW, { foodpartner }),
};

/**
 * ------------------------------------------------------------------
 * Search API calls
 * ------------------------------------------------------------------
 */
export const searchApi = {
  search: (query, type = 'all') =>
    api.get(API_ENDPOINTS.SEARCH.BASE, {
      params: { query, type },
    }),

  getExploreContent: () =>
    api.get(API_ENDPOINTS.SEARCH.EXPLORE),
};

export default api;
