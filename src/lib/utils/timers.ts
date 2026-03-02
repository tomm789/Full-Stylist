import { useEffect, useRef } from 'react';

/**
 * Hook that returns a ref which is true while the component is mounted.
 * Use to guard state updates in async callbacks.
 */
export function useMountedRef(): React.MutableRefObject<boolean> {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}

/**
 * Hook that returns helpers for tracking timeouts that auto-clear on unmount.
 */
export function useTrackedTimeouts() {
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  const schedule = (
    callback: () => void,
    delayMs: number
  ): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delayMs);

    timeoutsRef.current.add(id);
    return id;
  };

  const cancel = (id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutsRef.current.delete(id);
  };

  const cancelAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
  };

  return { schedule, cancel, cancelAll };
}
