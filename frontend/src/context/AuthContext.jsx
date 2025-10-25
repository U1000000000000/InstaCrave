/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { authApi } from '../services/api';
import { USER_TYPES, STORAGE_KEYS } from '../constants';

const AuthContext = createContext(null);

/**
 * Custom hook to access auth context
 * @throws {Error} If used outside AuthProvider
 * @returns {object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Manages user authentication state
 */
export const AuthProvider = ({ children }) => {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  /**
   * Fetch current user authentication status
   */
  const fetchUserType = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.checkAuth();
      
      setUserType(response.data.type);
      setUser(response.data.user || null);
      setIsAuthenticated(true);
      
            if (response.data.user?._id) {
        localStorage.setItem(STORAGE_KEYS.USER_ID, response.data.user._id);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setUserType(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(error.response?.data?.message || 'Authentication failed');
      
            localStorage.removeItem(STORAGE_KEYS.USER_ID);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user and clear auth state
   */
  const logout = useCallback(async () => {
    try {
            if (userType === USER_TYPES.FOOD_PARTNER) {
        await authApi.logoutFoodPartner();
      } else if (userType === USER_TYPES.USER) {
        await authApi.logoutUser();
      } else {
                await authApi.logout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
            setUserType(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
            localStorage.removeItem(STORAGE_KEYS.USER_ID);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem('userId');       
            sessionStorage.clear();
      
                }
  }, [userType]);

  /**
   * Login user
   */
  const login = useCallback(async (credentials, type = USER_TYPES.USER) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = type === USER_TYPES.FOOD_PARTNER
        ? await authApi.loginFoodPartner(credentials.email, credentials.password)
        : await authApi.loginUser(credentials.email, credentials.password);
      
      setUserType(response.data.type);
      setUser(response.data.user || null);
      setIsAuthenticated(true);
      
      if (response.data.user?._id) {
        localStorage.setItem(STORAGE_KEYS.USER_ID, response.data.user._id);
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

    useEffect(() => {
    fetchUserType();
  }, [fetchUserType]);

  const value = {
    userType,
    user,
    loading,
    isAuthenticated,
    error,
    fetchUserType,
    logout,
    login,
    isFoodPartner: userType === USER_TYPES.FOOD_PARTNER,
    isUser: userType === USER_TYPES.USER,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};