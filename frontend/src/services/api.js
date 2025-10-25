/**
 * API Service
 * Centralized API communication with error handling
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { API_ENDPOINTS } from '../constants';

/**
 * Create axios instance with default configuration
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, });

/**
 * Request interceptor for API calls
 */
api.interceptors.request.use(
  (config) => {
        return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for API calls
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
        if (error.response) {
            const status = error.response.status;
      
      if (status === 401) {
                console.error('Unauthorized access');
      } else if (status === 403) {
                console.error('Access forbidden');
      } else if (status === 404) {
                console.error('Resource not found');
      } else if (status >= 500) {
                console.error('Server error');
      }
    } else if (error.request) {
            console.error('Network error - no response received');
    } else {
            console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Authentication API calls
 */
export const authApi = {
  checkAuth: () => api.get(API_ENDPOINTS.AUTH.ME),
  loginUser: (email, password) =>
    api.post(API_ENDPOINTS.AUTH.USER_LOGIN, { email, password }),
  registerUser: (data) => api.post(API_ENDPOINTS.AUTH.USER_REGISTER, data),
  loginFoodPartner: (email, password) =>
    api.post(API_ENDPOINTS.AUTH.FOOD_PARTNER_LOGIN, { email, password }),
  registerFoodPartner: (formData) =>
    api.post(API_ENDPOINTS.AUTH.FOOD_PARTNER_REGISTER, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  logout: () => api.post(API_ENDPOINTS.AUTH.LOGOUT),
  logoutUser: () => api.get(API_ENDPOINTS.AUTH.USER_LOGOUT),
  logoutFoodPartner: () => api.get(API_ENDPOINTS.AUTH.FOOD_PARTNER_LOGOUT),
};

/**
 * Food API calls
 */
export const foodApi = {
  getFollowedFoods: () => api.get(API_ENDPOINTS.FOOD.FOLLOWED),
  toggleSave: (foodId) => api.post(API_ENDPOINTS.FOOD.SAVE, { foodId }),
  toggleLike: (foodId) => api.post(API_ENDPOINTS.FOOD.LIKE, { foodId }),
  getComments: (foodId) =>
    api.get(`${API_ENDPOINTS.FOOD.COMMENT}?foodId=${foodId}`),
  postComment: (comment, foodId) =>
    api.post(API_ENDPOINTS.FOOD.COMMENT, { comment, foodId }),
  deleteComment: (commentId) =>
    api.post(API_ENDPOINTS.FOOD.DELETE_COMMENT, { commentId }),
  shareFood: (foodId) => api.post(API_ENDPOINTS.FOOD.SHARE, { foodId }),
  getSavedFoods: () => api.get(API_ENDPOINTS.FOOD.SAVE),
};

/**
 * User API calls
 */
export const userApi = {
  getComments: () => api.get(API_ENDPOINTS.USER.COMMENTS),
  getLikes: () => api.get(API_ENDPOINTS.USER.LIKES),
  getFollowing: () => api.get(API_ENDPOINTS.USER.FOLLOWING),
};

/**
 * Food Partner API calls
 */
export const foodPartnerApi = {
  toggleFollow: (foodpartner) =>
    api.post(API_ENDPOINTS.FOOD_PARTNER.FOLLOW, { foodpartner }),
};

/**
 * Search API calls
 */
export const searchApi = {
  search: (query, type = 'all') =>
    api.get(API_ENDPOINTS.SEARCH.BASE, { params: { query, type } }),
  getExploreContent: () => api.get(API_ENDPOINTS.SEARCH.EXPLORE),
};

export default api;
