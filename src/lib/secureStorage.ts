/**
 * Secure Storage Adapter for Supabase Auth
 * Uses expo-secure-store (Keychain/Keystore) on native dev builds,
 * falls back to AsyncStorage on Expo Go / environments without the native module.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Supabase expects a storage adapter matching the Web Storage interface. */
interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

let resolvedAdapter: StorageAdapter | null = null;

function getAdapter(): StorageAdapter {
  if (resolvedAdapter) return resolvedAdapter;

  try {
    const SecureStore = require('expo-secure-store');
    // Verify the native module is actually available
    if (SecureStore?.getItemAsync) {
      resolvedAdapter = {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };
      return resolvedAdapter;
    }
  } catch {
    // Native module not available (Expo Go)
  }

  // Fallback to AsyncStorage
  resolvedAdapter = {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
  return resolvedAdapter;
}

/**
 * Returns a secure storage adapter on native (Keychain/Keystore with fallback to AsyncStorage)
 * or undefined on web (falls back to Supabase's default localStorage).
 */
export function getAuthStorage(): StorageAdapter | undefined {
  if (Platform.OS === 'web') return undefined;
  return getAdapter();
}
