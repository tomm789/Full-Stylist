import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { AddToHomeScreenBanner } from '@/components/AddToHomeScreenBanner';

export default function RootLayout() {
  // Register service worker for PWA support (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  console.log('[PWA] New service worker available. Reload to update.');
                  // Optionally show a toast/notification to user
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    }
  }, []);

  // Suppress FontFaceObserver timeout errors on web (non-critical)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
        const errorMessage = 
          (event as ErrorEvent).message || 
          (event as PromiseRejectionEvent).reason?.message ||
          (typeof (event as PromiseRejectionEvent).reason === 'string' ? (event as PromiseRejectionEvent).reason : '');
        
        // Suppress FontFaceObserver timeout errors
        if (
          errorMessage.includes('timeout exceeded') ||
          errorMessage.includes('FontFaceObserver') ||
          errorMessage.includes('6000ms timeout exceeded')
        ) {
          console.warn('FontFaceObserver timeout (non-critical) - suppressed');
          if (event.preventDefault) {
            event.preventDefault();
          }
          return true;
        }
        return false;
      };

      const originalError = window.onerror;
      const originalUnhandled = window.onunhandledrejection;

      window.onerror = (message, source, lineno, colno, error) => {
        if (handleError({ message: String(message), error } as any)) {
          return true;
        }
        if (originalError) {
          return originalError(message, source, lineno, colno, error);
        }
        return false;
      };

      window.onunhandledrejection = (event: PromiseRejectionEvent) => {
        if (handleError(event)) {
          return;
        }
        if (originalUnhandled) {
          originalUnhandled.call(window, event);
        }
      };

      return () => {
        window.onerror = originalError || null;
        window.onunhandledrejection = originalUnhandled || null;
      };
    }
  }, []);

  return (
    <AuthProvider>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="import" />
          <Stack.Screen name="marketplace" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="search" />
          <Stack.Screen name="users/[id]" />
          <Stack.Screen name="account-settings" />
          <Stack.Screen name="feedback/index" />
        </Stack>
        <AddToHomeScreenBanner />
      </NotificationsProvider>
    </AuthProvider>
  );
}
