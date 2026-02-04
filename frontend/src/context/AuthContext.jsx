import { USER_TYPES } from '../constants';
/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */



import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, fetchCsrfToken } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);

  const checkAuth = async () => {
    try {
      await fetchCsrfToken(); // Always fetch CSRF token before auth check
      const res = await authApi.checkAuth();
      let userData = res.data.data;
      // Normalize: always provide _id
      if (userData && !userData._id && userData.id) {
        userData = { ...userData, _id: userData.id };
      }
      setUser(userData);
      setUserType(userData?.type || null);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setUserType(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Compatibility: login function
  const login = async (credentials, type) => {
    await fetchCsrfToken(); // Fetch CSRF token before login
    if (type === USER_TYPES.FOOD_PARTNER) {
      await authApi.loginFoodPartner(credentials.email, credentials.password);
    } else {
      await authApi.loginUser(credentials.email, credentials.password);
    }
    await checkAuth();
    // Notify WebSocket to reconnect with new auth state
    window.dispatchEvent(new Event('auth-state-changed'));
  };

  // Compatibility: loading and isAuthenticated
  const loading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const logout = async () => {
    try {
      await fetchCsrfToken(); // Fetch CSRF token before logout (best practice)
      await authApi.logout();
    } finally {
      setUser(null);
      setUserType(null);
      setStatus('unauthenticated');
      // Notify WebSocket to disconnect
      window.dispatchEvent(new Event('auth-state-changed'));
    }
  };

  return (
    <AuthContext.Provider value={{
      status,
      loading,
      isAuthenticated,
      user,
      userType,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};