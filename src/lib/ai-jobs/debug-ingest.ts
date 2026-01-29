/**
 * Centralized debug ingest – only runs when BOTH:
 * - NODE_ENV === 'development' (or __DEV__ in React Native), AND
 * - EXPO_PUBLIC_DEBUG_INGEST === 'true'
 * Production builds never hit localhost; no ingest network calls in production.
 */
const isDevelopment =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
  (typeof __DEV__ !== 'undefined' && (__DEV__ as boolean) === true);

const hasDebugIngestFlag =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEBUG_INGEST === 'true';

const DEBUG_INGEST = isDevelopment && hasDebugIngestFlag;

const INGEST_URL = DEBUG_INGEST
  ? 'http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5'
  : '';

export function debugIngest(payload: Record<string, unknown>): void {
  if (!DEBUG_INGEST) return;
  fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
