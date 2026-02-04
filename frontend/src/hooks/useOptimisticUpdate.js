import { useState, useCallback } from 'react';
import { showError } from '../utils/toast';

/**
 * Hook for optimistic UI updates with automatic rollback on error
 * 
 * @param {Function} apiCall - The API call to make
 * @param {Object} optimisticUpdate - The optimistic state update to apply
 * @param {Function} rollbackFn - Function to rollback state on error
 * @param {string} errorMessage - Error message to show on failure
 * 
 * @example
 * const [execute, isLoading] = useOptimisticUpdate();
 * 
 * const handleLike = () => {
 *   execute(
 *     () => api.post('/like', { id: item._id }),
 *     () => setItems(prev => prev.map(i => i._id === item._id ? {...i, isLiked: true} : i)),
 *     () => setItems(prev => prev.map(i => i._id === item._id ? {...i, isLiked: false} : i)),
 *     'Failed to like item'
 *   );
 * };
 */
export const useOptimisticUpdate = () => {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (apiCall, optimisticUpdateFn, rollbackFn, errorMessage = 'Action failed') => {
    setIsLoading(true);
    
    // Apply optimistic update immediately
    try {
      optimisticUpdateFn();
    } catch (error) {
      console.error('Optimistic update failed:', error);
    }

    try {
      // Make the API call
      const result = await apiCall();
      setIsLoading(false);
      return result;
    } catch (error) {
      // Rollback on failure
      try {
        rollbackFn();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      
      showError(errorMessage);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return [execute, isLoading];
};

export default useOptimisticUpdate;
