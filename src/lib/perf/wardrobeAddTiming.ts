/**
 * Client-side timing for Add Wardrobe Item flow (add press → first render → image paint).
 * Logs Date.now() with labels for easy removal later.
 */
const PREFIX = '[wardrobe_add_timing]';

export function logWardrobeAddTiming(
  label: string,
  extra?: Record<string, unknown>
): void {
  const ts = Date.now();
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (extra != null && Object.keys(extra).length > 0) {
      console.debug(PREFIX, { label, ts, ...extra });
    } else {
      console.debug(PREFIX, { label, ts });
    }
  }
}
