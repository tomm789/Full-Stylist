/**
 * HeaderSearchContext
 * Allows pages (wardrobe, outfits) to register search/filter state
 * that the native header bar can read and control.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface HeaderSearchState {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilter: () => void;
  onAdd: () => void;
  hasActiveFilters: boolean;
  placeholder?: string;
  rightActionIcon?: string;
  onRightAction?: () => void;
}

interface HeaderSearchContextType {
  headerSearch: HeaderSearchState | null;
  registerHeaderSearch: (state: HeaderSearchState) => void;
  clearHeaderSearch: () => void;
}

const HeaderSearchContext = createContext<HeaderSearchContextType>({
  headerSearch: null,
  registerHeaderSearch: () => {},
  clearHeaderSearch: () => {},
});

export function HeaderSearchProvider({ children }: { children: React.ReactNode }) {
  const [headerSearch, setHeaderSearch] = useState<HeaderSearchState | null>(null);

  const registerHeaderSearch = useCallback((state: HeaderSearchState) => {
    setHeaderSearch(state);
  }, []);

  const clearHeaderSearch = useCallback(() => {
    setHeaderSearch(null);
  }, []);

  return (
    <HeaderSearchContext.Provider value={{ headerSearch, registerHeaderSearch, clearHeaderSearch }}>
      {children}
    </HeaderSearchContext.Provider>
  );
}

export function useHeaderSearch() {
  return useContext(HeaderSearchContext);
}
