import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG = {
  DEV_MODE: process.env.NODE_ENV !== 'production',
  ENABLED: process.env.EXPO_PUBLIC_ENABLE_SUPABASE !== 'false',
  REALTIME_ENABLED: process.env.EXPO_PUBLIC_ENABLE_REALTIME === 'true',
  POLLING_ENABLED: process.env.EXPO_PUBLIC_ENABLE_POLLING === 'true',
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// #region agent log
try {
  const urlHost = supabaseUrl ? new URL(supabaseUrl).hostname : 'none';
  fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase.ts:init',message:'Supabase config at load',data:{urlHost,anonKeySet:!!supabaseAnonKey,urlSet:!!supabaseUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2,H5'})}).catch(()=>{});
} catch (_) {}
// #endregion

if (SUPABASE_CONFIG.DEV_MODE && !SUPABASE_CONFIG.ENABLED) {
  console.warn('[Supabase] DISABLED in development');
}

// Log environment variable loading (only in development)
if (__DEV__) {
  console.log('[Supabase Config] Loading environment variables...');
  console.log('[Supabase Config] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('[Supabase Config] EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  if (supabaseAnonKey) {
    console.log('[Supabase Config] Anon key preview:', supabaseAnonKey.substring(0, 20) + '...');
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  const error = 'Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.';
  console.error('[Supabase Config]', error);
  throw new Error(error);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database type definitions (will be generated from Supabase CLI later)
export type Database = {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
  };
};