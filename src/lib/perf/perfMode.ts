/**
 * Temporary PERF_MODE: bypass UI work between generate click and outfit view
 * to measure whether UI overhead contributes to perceived delay.
 * Set EXPO_PUBLIC_PERF_MODE=true to enable.
 */
export const PERF_MODE =
  typeof process !== 'undefined' &&
  process.env.EXPO_PUBLIC_PERF_MODE === 'true';
