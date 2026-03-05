/**
 * usePushNotifications
 * Registers for push notifications on mount, handles notification interactions.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  registerPushToken,
  addNotificationResponseListener,
} from '@/lib/notifications/push';

/**
 * Call this hook once in the root layout after the user is authenticated.
 * It registers the push token and navigates when a notification is tapped.
 */
export function usePushNotifications(userId: string | undefined) {
  const router = useRouter();

  // Register push token
  useEffect(() => {
    if (!userId) return;
    registerPushToken(userId).catch((err) => {
      if (__DEV__) console.warn('[Push] Failed to register token:', err);
    });
  }, [userId]);

  // Handle notification taps → deep link
  useEffect(() => {
    const cleanup = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.url && typeof data.url === 'string') {
        router.push(data.url as any);
      }
    });

    return cleanup;
  }, [router]);
}
