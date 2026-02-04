import { useCallback } from 'react';
import api from '../services/api';

/**
 * Hook for tracking analytics events
 * Automatically includes page context and timestamp
 * 
 * @example
 * const analytics = useAnalytics();
 * 
 * // Track page view
 * analytics.trackPageView('Home');
 * 
 * // Track food view
 * analytics.trackFoodView(foodId);
 * 
 * // Track custom event
 * analytics.trackEvent('custom:event', { key: 'value' });
 */
export const useAnalytics = () => {
  const trackEvent = useCallback(async (eventType, data = {}, metadata = {}) => {
    try {
      await api.post('/api/v1/analytics/track', {
        eventType,
        data,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        },
      });
    } catch (error) {
      // Fail silently for analytics - don't disrupt user experience
      console.debug('Analytics tracking failed:', error);
    }
  }, []);

  const trackPageView = useCallback((pageName, additionalData = {}) => {
    trackEvent('page:viewed', { 
      pageName,
      path: window.location.pathname,
      ...additionalData 
    });
  }, [trackEvent]);

  const trackFoodView = useCallback((foodId, foodName = '') => {
    trackEvent('food:item_viewed', { foodId, foodName });
  }, [trackEvent]);

  const trackFoodLike = useCallback((foodId, isLiked) => {
    trackEvent(isLiked ? 'food:item_liked' : 'food:item_unliked', { foodId });
  }, [trackEvent]);

  const trackFoodSave = useCallback((foodId, isSaved) => {
    trackEvent(isSaved ? 'food:item_saved' : 'food:item_unsaved', { foodId });
  }, [trackEvent]);

  const trackFoodShare = useCallback((foodId, shareMethod = 'link') => {
    trackEvent('food:item_shared', { foodId, shareMethod });
  }, [trackEvent]);

  const trackOrderCreated = useCallback((orderId, foodId, amount, quantity) => {
    trackEvent('order:created', { orderId, foodId, amount, quantity });
  }, [trackEvent]);

  const trackPartnerFollow = useCallback((partnerId, isFollowing) => {
    trackEvent(isFollowing ? 'partner:followed' : 'partner:unfollowed', { partnerId });
  }, [trackEvent]);

  const trackSearch = useCallback((query, results = 0) => {
    trackEvent('search:performed', { query, resultCount: results });
  }, [trackEvent]);

  const trackComment = useCallback((foodId, commentLength) => {
    trackEvent('food:commented', { foodId, commentLength });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackFoodView,
    trackFoodLike,
    trackFoodSave,
    trackFoodShare,
    trackOrderCreated,
    trackPartnerFollow,
    trackSearch,
    trackComment,
  };
};

export default useAnalytics;
