'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';

interface UseApiOptions {
  authRequired?: boolean;
  onError?: (e: Error) => void;
  suppressToast?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export function useApi<T>(
  fetcher: ((token: string | null) => Promise<T>) | null,
  deps: DependencyList,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { authRequired = false, onError, suppressToast = false } = options;
  const { token, isHydrated } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  // Everything that can change identity-without-meaning lives in refs so the
  // effect re-runs only when user-supplied `deps` actually change.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const isHydratedRef = useRef(isHydrated);
  isHydratedRef.current = isHydrated;

  const run = useCallback(async () => {
    if (!fetcherRef.current) return;
    if (authRequired && (!isHydratedRef.current || !tokenRef.current)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current(tokenRef.current);
      if (cancelledRef.current) return;
      setData(result);
    } catch (e) {
      if (cancelledRef.current) return;
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      if (onErrorRef.current) {
        onErrorRef.current(err);
      } else if (!suppressToast) {
        toastRef.current.push({ variant: 'error', message: err.message });
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [authRequired, suppressToast]);

  // Re-fetch when caller deps change. For authRequired callers, also re-fetch
  // when hydration completes or the token swaps — those are real state changes
  // that should drive a reload.
  const hydrationKey = authRequired ? (isHydrated ? 1 : 0) : 0;
  const tokenKey = authRequired ? (token ?? '') : '';

  useEffect(() => {
    cancelledRef.current = false;
    void run();
    return () => {
      cancelledRef.current = true;
    };
  }, [run, hydrationKey, tokenKey, ...deps]);

  return { data, loading, error, reload: run };
}
