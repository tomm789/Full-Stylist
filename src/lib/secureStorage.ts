/**
 * Secure Storage Adapter for Supabase Auth
 * Uses expo-secure-store (Keychain/Keystore) on native, localStorage on web.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Supabase expects a storage adapter matching the Web Storage interface. */
interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

const secureStoreAdapter: StorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Returns a secure storage adapter on native (Keychain/Keystore)
 * or undefined on web (falls back to Supabase's default localStorage).
 */
export function getAuthStorage(): StorageAdapter | undefined {
  if (Platform.OS === 'web') return undefined;
  return secureStoreAdapter;
}
