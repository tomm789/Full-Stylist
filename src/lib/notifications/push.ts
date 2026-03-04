/**
 * Push Notifications
 * Handles push token registration and notification receipt on native platforms.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../supabase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission and registers the device's Expo push token with the server.
 * Safe to call multiple times — the server should upsert.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Upsert push token to Supabase
  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, expo_push_token: token, platform: Platform.OS },
      { onConflict: 'user_id,platform' },
    )
    .throwOnError();

  return token;
}

/**
 * Removes the push token for this device when the user signs out.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('platform', Platform.OS);
}

/**
 * Adds a listener for incoming notifications while the app is foregrounded.
 * Returns a cleanup function.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Adds a listener for when the user taps a notification.
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}
