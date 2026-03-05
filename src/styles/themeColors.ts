/**
 * Theme Color Definitions
 * Light and dark color palettes for theme switching
 */

type ColorKeys = keyof typeof lightColors;
export type ThemeColors = Readonly<Record<ColorKeys, string>>;

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

  // Tinted backgrounds
  primaryTint: '#e7f3ff',
  warningBackground: '#fff3e0',
  successBackground: '#d4edda',
  warningBannerBackground: '#fff3cd',

  // Tinted text
  successText: '#155724',
  warningBannerText: '#856404',
  primaryAccent: '#0066cc',

  // Social action colors
  repost: '#00ba7c',

  // Notification colors
  notificationPurple: '#5555ff',
  unreadBackground: '#f8f8ff',
  iconFallbackBackground: '#e8e8f0',

  // System gray
  systemGray: '#8e8e93',

  // Special colors (same in both themes)
  favorite: '#ff0000',
  selected: '#007AFF',
  transparent: 'transparent',

  // Glass tokens
  glassBackground: 'rgba(255, 255, 255, 0.2)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  glassBackgroundDark: 'rgba(0, 0, 0, 0.2)',
  glassBorderDark: 'rgba(0, 0, 0, 0.2)',
} as const;

export const darkColors = {
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

  // Tinted backgrounds
  primaryTint: '#1a2a3d',
  warningBackground: '#2a1f0a',
  successBackground: '#0a2a12',
  warningBannerBackground: '#2a2300',

  // Tinted text
  successText: '#6bcf7f',
  warningBannerText: '#e0c96a',
  primaryAccent: '#5ac8fa',

  // Social action colors
  repost: '#00ba7c',

  // Notification colors
  notificationPurple: '#5555ff',
  unreadBackground: '#12121a',
  iconFallbackBackground: '#1a1a28',

  // System gray
  systemGray: '#636366',

  // Special colors (same in both themes)
  favorite: '#ff0000',
  selected: '#007AFF',
  transparent: 'transparent',

  // Glass tokens
  glassBackground: 'rgba(255, 255, 255, 0.12)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassBackgroundDark: 'rgba(0, 0, 0, 0.3)',
  glassBorderDark: 'rgba(255, 255, 255, 0.1)',
} as const;
