/**
 * Debug ingest – only runs in development. Production builds never hit localhost.
 */
const DEBUG_INGEST =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
  (typeof __DEV__ !== 'undefined' && (__DEV__ as boolean) === true);

const INGEST_URL = 'http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5';

export function debugIngest(payload: Record<string, unknown>): void {
  if (!DEBUG_INGEST) return;
  fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
