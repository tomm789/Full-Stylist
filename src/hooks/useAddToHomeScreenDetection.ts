/**
 * useAddToHomeScreenDetection Hook
 * Detects if iOS Safari PWA banner should be shown
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

const DISMISSAL_KEY = 'pwa_ios_banner_dismissed';
const DISMISSAL_TTL_DAYS = 30;

interface UseAddToHomeScreenDetectionProps {
  visible?: boolean;
}

interface UseAddToHomeScreenDetectionReturn {
  showBanner: boolean;
  handleDismiss: () => void;
}

export function useAddToHomeScreenDetection({
  visible,
}: UseAddToHomeScreenDetectionProps = {}): UseAddToHomeScreenDetectionReturn {
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
      !/FxiOS/i.test(navigator.userAgent); // Firefox iOS

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

  return {
    showBanner,
    handleDismiss,
  };
}
