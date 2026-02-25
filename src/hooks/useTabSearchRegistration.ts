/**
 * useTabSearchRegistration
 * Shared hook that registers a tab's search state with TabSearchContext so the
 * floating header search pill can open/close it. Handles cleanup on unmount.
 *
 * Used by: WardrobeScreen, OutfitsScreen (and any future tab that needs search).
 */

import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useTabSearch } from '@/contexts/TabSearchContext';
import type { TabSearchFilter } from '@/contexts/TabSearchContext';

interface UseTabSearchRegistrationOptions {
  query: string;
  open: boolean;
  onQueryChange: (value: string) => void;
  setSearchOverlayOpen: (open: boolean) => void;
  setSearchSelectedFilter: (filter: TabSearchFilter) => void;
  defaultFilter: TabSearchFilter;
}

export function useTabSearchRegistration({
  query,
  open,
  onQueryChange,
  setSearchOverlayOpen,
  setSearchSelectedFilter,
  defaultFilter,
}: UseTabSearchRegistrationOptions) {
  const pathname = usePathname();
  const { registerTabSearch, clearTabSearch } = useTabSearch();

  useEffect(() => {
    registerTabSearch(
      {
        query,
        open,
        onQueryChange,
        onOpen: () => setSearchOverlayOpen(true),
        onClose: () => setSearchOverlayOpen(false),
        setDefaultFilter: () => setSearchSelectedFilter(defaultFilter),
      },
      pathname
    );

    return () => {
      clearTabSearch(pathname);
    };
  }, [
    query,
    open,
    onQueryChange,
    setSearchOverlayOpen,
    setSearchSelectedFilter,
    defaultFilter,
    pathname,
    registerTabSearch,
    clearTabSearch,
  ]);
}
