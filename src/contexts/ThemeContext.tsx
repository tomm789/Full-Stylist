import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors } from '@/styles/themes';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const THEME_STORAGE_KEY = '@app_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light') {
          setMode(stored);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(mode === 'light' ? 'dark' : 'light');
  }, [mode, setTheme]);

  const colors = useMemo(() => (mode === 'dark' ? darkColors : lightColors), [mode]);

  const value = useMemo(() => ({
    mode,
    colors,
    toggleTheme,
    setTheme,
    isDark: mode === 'dark',
  }), [mode, colors, toggleTheme, setTheme]);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeColors() {
  return useTheme().colors;
}
