/**
 * Calendar Debug Logging Utility
 * Replaces telemetry with local console logging for development
 *
 * Usage:
 * - Enable: Set DEBUG_CALENDAR = true in your environment/dev settings
 * - Logs are only written when __DEV__ is true AND DEBUG_CALENDAR is enabled
 * - All logs are prefixed with [Calendar:context] for easy filtering
 */

// __DEV__ is a global constant provided by React Native at compile time
declare const __DEV__: boolean;

// Enable calendar debugging (set to true when debugging)
const DEBUG_CALENDAR = __DEV__ && false;

interface DebugPayload {
  [key: string]: any;
}

/**
 * Log calendar debug information
 * @param context - Context string identifying where the log came from (e.g., 'scroll', 'state-change', 'load-entries')
 * @param data - Object containing relevant debug data
 * @param level - Log level: 'log' | 'warn' | 'error'
 */
export function debugCalendar(
  context: string,
  data?: DebugPayload,
  level: 'log' | 'warn' | 'error' = 'log'
): void {
  if (!DEBUG_CALENDAR) {
    return;
  }

  const timestamp = new Date().toISOString().split('T')[1]; // HH:mm:ss.SSS
  const prefix = `[Calendar:${context}]`;

  switch (level) {
    case 'error':
      console.error(prefix, timestamp, data);
      break;
    case 'warn':
            if (__DEV__) console.warn(prefix, timestamp, data);
      break;
    case 'log':
    default:
            if (__DEV__) console.log(prefix, timestamp, data);
      break;
  }
}

/**
 * Log calendar scroll events
 * @param scrollY - Current scroll Y position
 * @param direction - Scroll direction ('up' | 'down')
 * @param threshold - Whether threshold was crossed
 */
export function debugScroll(
  scrollY: number,
  direction: 'up' | 'down',
  threshold?: string
): void {
  if (!DEBUG_CALENDAR) return;

  debugCalendar('scroll', {
    scrollY: Math.round(scrollY),
    direction,
    ...(threshold && { threshold }),
  });
}

/**
 * Log calendar state changes
 * @param stateKey - State property that changed
 * @param oldValue - Previous value
 * @param newValue - New value
 */
export function debugStateChange(
  stateKey: string,
  oldValue: any,
  newValue: any
): void {
  if (!DEBUG_CALENDAR) return;

  debugCalendar('state-change', {
    property: stateKey,
    from: oldValue,
    to: newValue,
  });
}

/**
 * Log data loading operations
 * @param operation - Operation name ('start' | 'success' | 'retry' | 'fail')
 * @param data - Relevant data (items count, date range, etc.)
 */
export function debugLoad(
  operation: 'start' | 'success' | 'retry' | 'fail',
  data?: DebugPayload
): void {
  if (!DEBUG_CALENDAR) return;

  const level = operation === 'fail' ? 'error' : operation === 'retry' ? 'warn' : 'log';
  debugCalendar(`load-${operation}`, data, level);
}

/**
 * Log performance metrics
 * @param metric - Metric name (e.g., 'render-time', 'load-duration')
 * @param durationMs - Duration in milliseconds
 * @param details - Additional details
 */
export function debugPerformance(
  metric: string,
  durationMs: number,
  details?: DebugPayload
): void {
  if (!DEBUG_CALENDAR) return;

  debugCalendar('performance', {
    metric,
    durationMs: Math.round(durationMs),
    ...details,
  });
}

/**
 * Log animation events
 * @param animationName - Name of animation
 * @param event - Event type ('start' | 'complete' | 'cancel')
 */
export function debugAnimation(
  animationName: string,
  event: 'start' | 'complete' | 'cancel'
): void {
  if (!DEBUG_CALENDAR) return;

  debugCalendar('animation', {
    animation: animationName,
    event,
  });
}

/**
 * Enable/disable calendar debugging at runtime
 * Useful for toggling debug mode without rebuilding
 */
export function setCalendarDebugEnabled(enabled: boolean): void {
  if (__DEV__) {
    // In development, you could store this in AsyncStorage or a global
    // For now, this is a no-op placeholder
    console.log(`[Calendar] Debug mode would be set to: ${enabled} (requires restart or AsyncStorage)`);
  }
}

/**
 * Get current debug status
 */
export function isCalendarDebugEnabled(): boolean {
  return DEBUG_CALENDAR;
}
