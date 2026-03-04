import { Alert, Platform } from 'react-native';
import { haptics } from './haptics';

interface ToastOptions {
  title: string;
  message?: string;
  preset?: 'done' | 'error' | 'none';
  duration?: number;
}

let Burnt: typeof import('burnt') | null = null;

try {
  Burnt = require('burnt');
} catch {
  // Native module not available (e.g. Expo Go) — fall back to Alert
}

export function showToast({ title, message, preset = 'done', duration = 2 }: ToastOptions) {
  if (Platform.OS === 'web') {
        if (__DEV__) {
      console.log(`[Toast] ${title}${message ? `: ${message}` : ''}`);
    }
    return;
  }

  if (Burnt) {
    Burnt.toast({ title, message, preset, duration });
  } else {
    Alert.alert(title, message);
  }
}

export function showSuccessToast(message: string) {
  haptics.success();
  showToast({ title: message, preset: 'done' });
}

export function showErrorToast(message: string) {
  haptics.error();
  showToast({ title: message, preset: 'error' });
}
