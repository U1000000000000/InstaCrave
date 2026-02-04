/**
 * Protected Route Component
 * Handles route protection and authentication-based rendering
 */


import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { USER_TYPES, ROUTES } from '../constants';
import UserBottomNav from './UserBottomNav';
import BottomNavFoodPartner from './BottomNavFoodPartner';

const ProtectedRoute = ({ children, requiredUserType, fallbackPath, allowGuest = false }) => {
  const { status, userType } = useAuth();

  if (status === 'loading') {
    return <LoadingSpinner fullScreen message="Authenticating..." />;
  }
  if (status === 'unauthenticated' && !allowGuest) {
    let loginPath;
    if (requiredUserType === USER_TYPES.FOOD_PARTNER) {
      loginPath = ROUTES.AUTH.FOOD_PARTNER_LOGIN;
    } else {
      loginPath = ROUTES.AUTH.USER_LOGIN;
    }
    return <Navigate to={loginPath} replace />;
  }

  if (requiredUserType && userType !== requiredUserType) {
    let defaultFallback;
    if (userType === USER_TYPES.FOOD_PARTNER) {
      defaultFallback = ROUTES.FOOD_PARTNER.DASHBOARD;
    } else {
      defaultFallback = ROUTES.USER.REELS;
    }
    return <Navigate to={fallbackPath || defaultFallback} replace />;
  }

  if (allowGuest && status === 'authenticated') {
    return (
      <>
        {children}
        {userType === USER_TYPES.FOOD_PARTNER ? (
          <BottomNavFoodPartner />
        ) : (
          <UserBottomNav />
        )}
      </>
    );
  }

  if (allowGuest && status === 'unauthenticated') {
    return (
      <>
        {children}
        <UserBottomNav />
      </>
    );
  }

  return children;
};

export default ProtectedRoute;