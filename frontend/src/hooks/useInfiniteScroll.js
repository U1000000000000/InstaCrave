import { useState, useEffect, useCallback, useRef } from 'react';
import { showError } from '../utils/toast';

/**
 * Hook for infinite scroll pagination
 * 
 * @param {Function} fetchFn - Function that fetches data (receives page, limit params)
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Items per page (default: 10)
 * @param {Array} options.deps - Dependencies to trigger reset (default: [])
 * 
 * @example
 * const { items, loading, hasMore, loadMore, reset } = useInfiniteScroll(
 *   (page, limit) => api.get(`/food?page=${page}&limit=${limit}`),
 *   { limit: 10, deps: [filter] }
 * );
 * 
 * // Use with Intersection Observer or button click
 * <button onClick={loadMore} disabled={loading || !hasMore}>
 *   {loading ? 'Loading...' : 'Load More'}
 * </button>
 */
export const useInfiniteScroll = (fetchFn, options = {}) => {
  const { limit = 10, deps = [] } = options;
  
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchFn(page, limit);
      
      // Handle different response formats
      const newItems = response.data?.data || response.data || [];
      const pagination = response.data?.pagination;
      
      setItems(prev => page === 1 ? newItems : [...prev, ...newItems]);
      
      // Determine if there are more items
      if (pagination) {
        setHasMore(pagination.hasNext || false);
      } else {
        // Fallback: if we got fewer items than limit, no more pages
        setHasMore(newItems.length === limit);
      }
      
      setPage(prev => prev + 1);
      setInitialLoad(false);
    } catch (err) {
      setError(err);
      showError('Failed to load data');
      setInitialLoad(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFn, page, limit, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setInitialLoad(true);
    loadingRef.current = false;
  }, []);

  // Load first page on mount or when deps change
  useEffect(() => {
    reset();
  }, deps);

  // Auto-load first page
  useEffect(() => {
    if (initialLoad && !loadingRef.current) {
      loadMore();
    }
  }, [initialLoad, loadMore]);

  return { items, loading, hasMore, loadMore, reset, error, setItems };
};

export default useInfiniteScroll;
