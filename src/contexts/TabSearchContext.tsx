import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type TabSearchFilter = 'all' | 'user' | 'outfit' | 'lookbook' | 'wardrobe_item';

export type TabSearchState = {
  query: string;
  open: boolean;
  onQueryChange: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  setDefaultFilter?: () => void;
};

type TabSearchContextType = {
  getTabSearch: (routeKey?: string) => TabSearchState | null;
  registerTabSearch: (state: TabSearchState, routeKey?: string) => void;
  clearTabSearch: (routeKey?: string) => void;
  version: number;
};

const TabSearchContext = createContext<TabSearchContextType>({
  getTabSearch: () => null,
  registerTabSearch: () => {},
  clearTabSearch: () => {},
  version: 0,
});

export function TabSearchProvider({ children }: { children: React.ReactNode }) {
  const searchByRoute = useRef<Record<string, TabSearchState>>({});
  const [version, setVersion] = useState(0);

  const getTabSearch = useCallback((routeKey?: string) => {
    const key = routeKey ?? 'default';
    return searchByRoute.current[key] ?? null;
  }, []);

  const registerTabSearch = useCallback((state: TabSearchState, routeKey?: string) => {
    const key = routeKey ?? 'default';
    searchByRoute.current[key] = state;
    setVersion((prev) => prev + 1);
  }, []);

  const clearTabSearch = useCallback((routeKey?: string) => {
    const key = routeKey ?? 'default';
    if (searchByRoute.current[key]) {
      delete searchByRoute.current[key];
      setVersion((prev) => prev + 1);
    }
  }, []);

  return (
    <TabSearchContext.Provider
      value={{
        getTabSearch,
        registerTabSearch,
        clearTabSearch,
        version,
      }}
    >
      {children}
    </TabSearchContext.Provider>
  );
}

export function useTabSearch() {
  return useContext(TabSearchContext);
}
