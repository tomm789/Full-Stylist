import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG = {
  DEV_MODE: process.env.NODE_ENV !== 'production',
  ENABLED: process.env.EXPO_PUBLIC_ENABLE_SUPABASE !== 'false',
  REALTIME_ENABLED: process.env.EXPO_PUBLIC_ENABLE_REALTIME === 'true',
  POLLING_ENABLED: process.env.EXPO_PUBLIC_ENABLE_POLLING === 'true',
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

try {
  const urlHost = supabaseUrl ? new URL(supabaseUrl).hostname : 'none';
} catch (_) {}

if (SUPABASE_CONFIG.DEV_MODE && !SUPABASE_CONFIG.ENABLED) {
  console.warn('[Supabase] DISABLED in development');
}

// Log environment variable loading (only in development)
if (__DEV__) {
  console.log('[Supabase Config] Loading environment variables...');
  console.log('[Supabase Config] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('[Supabase Config] EXPO_PUBLICABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  if (supabaseAnonKey) {
    console.log('[Supabase Config] Anon key preview:', supabaseAnonKey.substring(0, 20) + '...');
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  const error = 'Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.';
  console.error('[Supabase Config]', error);
  throw new Error(error);
}

// Corrected client initialization
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },
});

// Database type definitions (will be generated from Supabase CLI later)
export type Database = {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
  };
};