/**
 * Client-side timing helper: measures async function execution and sends
 * metrics to Netlify Function logs (no persistence). Fails silently on log errors.
 */

const LOG_METRIC_URL = '/.netlify/functions/log-client-metric';

export async function logClientTiming<T>(
  name: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    sendMetric(name, durationMs, meta).catch(() => {});
    return result;
  } catch (e) {
    const durationMs = Math.round(performance.now() - start);
    sendMetric(name, durationMs, meta ? { ...meta, error: true } : { error: true }).catch(() => {});
    throw e;
  }
}

async function sendMetric(
  name: string,
  durationMs: number,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(LOG_METRIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, durationMs, ...(meta != null ? { meta } : {}) }),
    });
  } catch {
    // Fail silently: do not block UI or surface logging errors
  }
}
