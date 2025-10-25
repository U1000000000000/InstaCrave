/**
 * Protected Route Component
 * Handles route protection and authentication-based rendering
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserBottomNav from './UserBottomNav';
import BottomNavFoodPartner from './BottomNavFoodPartner';
import LoadingSpinner from './LoadingSpinner';
import { USER_TYPES, ROUTES } from '../constants';

const ProtectedRoute = ({ 
  children, 
  requiredUserType, 
  fallbackPath, 
  allowGuest = false 
}) => {
  const { userType, loading, isAuthenticated } = useAuth();

    if (loading) {
    return <LoadingSpinner fullScreen message="Authenticating..." />;
  }

    if (!isAuthenticated && !allowGuest) {
        const loginPath = requiredUserType === USER_TYPES.FOOD_PARTNER 
      ? ROUTES.AUTH.FOOD_PARTNER_LOGIN 
      : ROUTES.AUTH.USER_LOGIN;
    return <Navigate to={loginPath} replace />;
  }

    if (requiredUserType && userType !== requiredUserType) {
    const defaultFallback = 
      userType === USER_TYPES.FOOD_PARTNER 
        ? ROUTES.FOOD_PARTNER.DASHBOARD 
        : ROUTES.USER.REELS;
    return <Navigate to={fallbackPath || defaultFallback} replace />;
  }

    if (allowGuest && isAuthenticated) {
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

    if (allowGuest && !isAuthenticated) {
    return (
      <>
        {children}
        <UserBottomNav />
      </>
    );
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredUserType: PropTypes.oneOf([USER_TYPES.USER, USER_TYPES.FOOD_PARTNER]),
  fallbackPath: PropTypes.string,
  allowGuest: PropTypes.bool,
};

export default ProtectedRoute;