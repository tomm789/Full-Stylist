/**
 * HeaderSearchContext
 * Allows pages (wardrobe, outfits) to register search/filter state
 * that the native header bar can read and control.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface HeaderSearchState {
  title?: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchPress?: () => void;
  onSearchToggle?: (nextExpanded: boolean) => void;
  onFilter: () => void;
  onAdd: () => void;
  hasActiveFilters: boolean;
  showFilter?: boolean;
  placeholder?: string;
  inlineSearchEnabled?: boolean;
  rightActionIcon?: string;
  onRightAction?: () => void;
  rightActionInPill?: boolean;
}

interface HeaderSearchContextType {
  headerSearch: HeaderSearchState | null;
  getHeaderSearch: (routeKey?: string) => HeaderSearchState | null;
  headerSearchVersion: number;
  registerHeaderSearch: (state: HeaderSearchState, routeKey?: string) => void;
  clearHeaderSearch: (routeKey?: string) => void;
}

const HeaderSearchContext = createContext<HeaderSearchContextType>({
  headerSearch: null,
  getHeaderSearch: () => null,
  headerSearchVersion: 0,
  registerHeaderSearch: () => {},
  clearHeaderSearch: () => {},
});

export function HeaderSearchProvider({ children }: { children: React.ReactNode }) {
  const [headerSearch, setHeaderSearch] = useState<HeaderSearchState | null>(null);
  const [currentRouteKey, setCurrentRouteKey] = useState<string>('default');
  const headerSearchByRoute = useRef<Record<string, HeaderSearchState>>({});
  const [headerSearchVersion, setHeaderSearchVersion] = useState(0);

  const registerHeaderSearch = useCallback((state: HeaderSearchState, routeKey?: string) => {
    const key = routeKey ?? 'default';
    headerSearchByRoute.current[key] = state;
    setCurrentRouteKey(key);
    setHeaderSearch(state);
    setHeaderSearchVersion((prev) => prev + 1);
  }, []);

  const clearHeaderSearch = useCallback(
    (routeKey?: string) => {
      const key = routeKey ?? 'default';
      delete headerSearchByRoute.current[key];
      if (currentRouteKey === key) {
        setHeaderSearch(null);
      }
      setHeaderSearchVersion((prev) => prev + 1);
    },
    [currentRouteKey]
  );

  const getHeaderSearch = useCallback((routeKey?: string) => {
    const key = routeKey ?? currentRouteKey ?? 'default';
    return headerSearchByRoute.current[key] ?? null;
  }, [currentRouteKey]);

  return (
    <HeaderSearchContext.Provider
      value={{
        headerSearch,
        getHeaderSearch,
        headerSearchVersion,
        registerHeaderSearch,
        clearHeaderSearch,
      }}
    >
      {children}
    </HeaderSearchContext.Provider>
  );
}

export function useHeaderSearch() {
  return useContext(HeaderSearchContext);
}
