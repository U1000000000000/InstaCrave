import { useEffect, useState, useCallback, useRef } from 'react';

export const useProtectedRequest = (requestFn, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const depsRef = useRef(deps);
  const requestFnRef = useRef(requestFn);

  // Update refs if inputs change
  useEffect(() => { depsRef.current = deps; }, [deps]);
  useEffect(() => { requestFnRef.current = requestFn; }, [requestFn]);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await requestFnRef.current();
      setData(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await requestFn();
        if (mounted) setData(res.data);
        if (mounted) setError(null);
      } catch (err) {
        if (err.response?.status !== 401 && mounted) {
          setError(err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, deps);

  const refetch = useCallback(() => {
    run();
  }, [run]);

  return { data, error, loading, refetch };
};
