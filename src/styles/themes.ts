/**
 * Theme Color Definitions
 * Light and dark color palettes for theme switching
 */

export type ThemeColors = typeof lightColors;

export const lightColors = {
  // Primary colors (same in both themes)
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA2FF',

  // Neutral colors
  black: '#000',
  white: '#fff',
  gray900: '#111',
  gray800: '#333',
  gray700: '#444',
  gray600: '#666',
  gray500: '#999',
  gray400: '#ccc',
  gray300: '#ddd',
  gray200: '#e0e0e0',
  gray100: '#f0f0f0',
  gray50: '#f9f9f9',

  // Semantic colors (same in both themes)
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',

  // Background colors
  background: '#fff',
  backgroundSecondary: '#f9f9f9',
  backgroundTertiary: '#f0f0f0',
  backgroundDark: '#000',

  // Text colors
  textPrimary: '#000',
  textSecondary: '#666',
  textTertiary: '#999',
  textLight: '#fff',
  textPlaceholder: '#999',

  // Border colors
  border: '#ddd',
  borderLight: '#e0e0e0',
  borderDark: '#333',

  // Overlay colors
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  overlayHeavy: 'rgba(0, 0, 0, 0.95)',

  // Special colors (same in both themes)
  favorite: '#ff0000',
  selected: '#007AFF',
  transparent: 'transparent',
} as const;

export const darkColors: ThemeColors = {
  // Primary colors (same in both themes)
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA2FF',

  // Neutral colors (reversed)
  black: '#fff',
  white: '#000',
  gray900: '#f9f9f9',
  gray800: '#f0f0f0',
  gray700: '#e0e0e0',
  gray600: '#ccc',
  gray500: '#999',
  gray400: '#666',
  gray300: '#444',
  gray200: '#333',
  gray100: '#222',
  gray50: '#111',

  // Semantic colors (same in both themes)
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',

  // Background colors (reversed)
  background: '#000',
  backgroundSecondary: '#111',
  backgroundTertiary: '#222',
  backgroundDark: '#fff',

  // Text colors (reversed)
  textPrimary: '#fff',
  textSecondary: '#ccc',
  textTertiary: '#999',
  textLight: '#000',
  textPlaceholder: '#666',

  // Border colors (reversed)
  border: '#333',
  borderLight: '#222',
  borderDark: '#ccc',

  // Overlay colors
  overlayLight: 'rgba(255, 255, 255, 0.15)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  overlayHeavy: 'rgba(0, 0, 0, 0.95)',

  // Special colors (same in both themes)
  favorite: '#ff0000',
  selected: '#007AFF',
  transparent: 'transparent',
} as const;
