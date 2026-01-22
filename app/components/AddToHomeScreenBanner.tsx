import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DISMISSAL_KEY = 'pwa_ios_banner_dismissed';
const DISMISSAL_TTL_DAYS = 30;

interface AddToHomeScreenBannerProps {
  // Optional: allow parent to control visibility
  visible?: boolean;
}

/**
 * iOS "Add to Home Screen" banner component
 * 
 * Shows instructions for adding the app to home screen on iOS Safari.
 * Only displays when:
 * - User is on iOS Safari (not Chrome/Firefox iOS)
 * - App is NOT in standalone mode (not installed)
 * - User has not dismissed it recently (30-day TTL)
 */
export function AddToHomeScreenBanner({ visible }: AddToHomeScreenBannerProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if parent explicitly controls visibility
    if (visible !== undefined) {
      setShowBanner(visible);
      return;
    }

    // Check if already dismissed
    const dismissedUntil = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedUntil) {
      const dismissedUntilDate = new Date(dismissedUntil);
      if (dismissedUntilDate > new Date()) {
        // Still within dismissal period
        return;
      } else {
        // Dismissal expired, remove it
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }

    // Detect iOS
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isIOS) {
      return;
    }

    // Detect Safari (not Chrome/Firefox on iOS)
    const isSafari = 
      /Safari/i.test(navigator.userAgent) &&
      !/CriOS/i.test(navigator.userAgent) && // Chrome iOS
      !/FxiOS/i.test(navigator.userAgent);   // Firefox iOS

    if (!isSafari) {
      return;
    }

    // Detect standalone mode (app is installed)
    const isStandalone = 
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      ((window.navigator as any).standalone === true);

    if (isStandalone) {
      return;
    }

    // All conditions met, show banner
    setShowBanner(true);
  }, [visible]);

  const handleDismiss = () => {
    // Store dismissal with 30-day TTL
    const dismissedUntil = new Date();
    dismissedUntil.setDate(dismissedUntil.getDate() + DISMISSAL_TTL_DAYS);
    localStorage.setItem(DISMISSAL_KEY, dismissedUntil.toISOString());
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  // Web-only styles (React Native Web compatible)
  const webStyles = Platform.OS === 'web' ? {
    container: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1e1f26',
      borderTop: '1px solid #333',
      padding: '20px 20px',
      paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
      minHeight: '64px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
      borderRadius: '16px 16px 0 0',
    },
    text: {
      color: '#ffffff',
      fontSize: '15px',
      flex: 1,
      marginRight: '16px',
      lineHeight: '22px',
      fontWeight: '500' as const,
    },
    dismissButtonContainer: {
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: '22px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    dismissButtonHover: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    dismissText: {
      color: '#ffffff',
      fontSize: '24px',
      fontWeight: '300' as const,
      lineHeight: 1,
    },
  } : {};

  return (
    <View style={[styles.container, webStyles.container]}>
      <Text style={[styles.text, webStyles.text]}>
        Tap <Text style={styles.shareIcon}>📤</Text> Share → Add to Home Screen
      </Text>
      <TouchableOpacity 
        onPress={handleDismiss} 
        style={[styles.dismissButton, webStyles.dismissButtonContainer]}
        activeOpacity={0.7}
      >
        <Text style={[styles.dismissText, webStyles.dismissText]}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1f26',
    padding: 20,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    flex: 1,
    marginRight: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  shareIcon: {
    fontSize: 18,
  },
  dismissButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dismissText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 1,
  },
});
