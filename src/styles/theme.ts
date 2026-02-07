/**
 * Theme Configuration
 * Central theme definition for consistent styling across the app
 */

import { Platform } from 'react-native';

export const colors = {
  // Primary colors
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
  
  // Semantic colors
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
  
  // Special colors
  favorite: '#ff0000',
  selected: '#007AFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 60,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 999,
} as const;

export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 13,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  
  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: 'bold' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 16,
    normal: 20,
    relaxed: 24,
    loose: 28,
  },
} as const;

const createShadow = (offsetY: number, radius: number, opacity: number, elevation: number) =>
  Platform.select({
    web: {
      boxShadow: `0px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });

export const shadows = {
  sm: createShadow(1, 2, 0.1, 1),
  md: createShadow(2, 4, 0.15, 2),
  lg: createShadow(4, 8, 0.2, 4),
  xl: createShadow(8, 16, 0.25, 8),
} as const;

export const layout = {
  // Container widths
  containerMaxWidth: 630,
  
  // Header heights
  headerHeight: 60,
  headerHeightWithPadding: 100,
  
  // Item sizes
  itemThumbnailSize: 60,
  avatarSize: 44,
  iconSize: 24,
  
  // Grid
  gridGap: 8,
  gridPadding: 8,
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  layout,
} as const;

export default theme;
