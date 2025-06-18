import { useState, useCallback, useRef } from 'react';

export interface UseLoadingReturn {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  loadingStates: Record<string, boolean>;
  setLoadingState: (key: string, loading: boolean) => void;
  startLoadingState: (key: string) => void;
  stopLoadingState: (key: string) => void;
  isAnyLoading: boolean;
}

export const useLoading = (): UseLoadingReturn => {
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const loadingCountRef = useRef(0);

  const startLoading = useCallback(() => {
    setLoading(true);
    loadingCountRef.current += 1;
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setLoading(false);
    }
  }, []);

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    try {
      startLoading();
      return await asyncFn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const setLoadingState = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const startLoadingState = useCallback((key: string) => {
    setLoadingState(key, true);
  }, [setLoadingState]);

  const stopLoadingState = useCallback((key: string) => {
    setLoadingState(key, false);
  }, [setLoadingState]);

  const isAnyLoading = loading || Object.values(loadingStates).some(Boolean);

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
    loadingStates,
    setLoadingState,
    startLoadingState,
    stopLoadingState,
    isAnyLoading
  };
};

// Utility hook for managing multiple loading states
export const useMultiLoading = (keys: string[]) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );

  const setLoadingState = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoadingState(key, true);
  }, [setLoadingState]);

  const stopLoading = useCallback((key: string) => {
    setLoadingState(key, false);
  }, [setLoadingState]);

  const withLoading = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startLoading(key);
      return await asyncFn();
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  const isLoading = (key: string) => loadingStates[key] || false;

  return {
    loadingStates,
    setLoadingState,
    startLoading,
    stopLoading,
    withLoading,
    isAnyLoading,
    isLoading
  };
}; 