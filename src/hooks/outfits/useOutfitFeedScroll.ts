import { useCallback, useEffect, useRef } from 'react';
import { FlatList } from 'react-native';

type UseOutfitFeedScrollParams<T> = {
  activeView: 'grid' | 'feed';
  data: T[];
  getId: (item: T) => string;
  listRef: React.RefObject<FlatList<T>>;
  pendingId: string | null;
  setPendingId: (id: string | null) => void;
};

export function useOutfitFeedScroll<T>({
  activeView,
  data,
  getId,
  listRef,
  pendingId,
  setPendingId,
}: UseOutfitFeedScrollParams<T>) {
  const attemptRef = useRef(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tryScrollRef = useRef<() => void>(() => {});
  const MAX_SCROLL_ATTEMPTS = 8;

  const scheduleRetry = useCallback(() => {
    if (attemptRef.current >= MAX_SCROLL_ATTEMPTS) return;
    if (retryRef.current) return;
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      attemptRef.current += 1;
      tryScrollRef.current();
    }, 80);
  }, []);

  const tryScrollToPending = useCallback(() => {
    const targetId = pendingId;
    if (!targetId) return;
    if (activeView !== 'feed') return;
    if (data.length === 0) {
      scheduleRetry();
      return;
    }

    const index = data.findIndex((item) => getId(item) === targetId);
    if (index < 0) {
      scheduleRetry();
      return;
    }

    if (!listRef.current) {
      scheduleRetry();
      return;
    }

    listRef.current.scrollToIndex({
      index,
      viewPosition: 0,
      animated: false,
    });

    setPendingId(null);
    attemptRef.current = 0;
  }, [activeView, data, getId, pendingId, scheduleRetry, setPendingId]);

  useEffect(() => {
    tryScrollRef.current = tryScrollToPending;
  }, [tryScrollToPending]);

  const handleLayout = useCallback(() => {
    if (!pendingId) return;
    tryScrollToPending();
  }, [pendingId, tryScrollToPending]);

  const handleScrollToIndexFailed = useCallback((info: {
    index: number;
    averageItemLength: number;
  }) => {
    const offset = Math.max(0, info.averageItemLength * info.index);
    listRef.current?.scrollToOffset({ offset, animated: false });
    scheduleRetry();
  }, [scheduleRetry]);

  useEffect(() => {
    if (pendingId) {
      attemptRef.current = 0;
    }
  }, [pendingId]);

  useEffect(() => {
    return () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };
  }, []);

  return {
    handleLayout,
    handleScrollToIndexFailed,
    tryScrollToPending,
  };
}
