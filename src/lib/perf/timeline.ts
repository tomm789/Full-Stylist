/**
 * Client-side end-to-end timeline for outfit render (and other flows).
 *
 * Enable: set EXPO_PUBLIC_PERF_LOGS=true (e.g. in .env or shell before starting).
 * Logs are console.debug and only emitted when enabled.
 *
 * Events to look for (outfit render):
 * - generate_press / job_created / execution_triggered / navigate_to_view (editor path)
 * - poll_start / poll_success (resultKeys, resultSize) / outfit_fetch_start / outfit_fetch_end
 * - image_load_start / image_load_end (or image_load_error + retryCount)
 * Use traceId to correlate all marks for one flow; +Nms is ms since timeline start.
 */

const PERF_LOGS_ENABLED =
  typeof process !== 'undefined' &&
  process.env?.EXPO_PUBLIC_PERF_LOGS === 'true';

function log(traceId: string, msSinceStart: number, name: string, extra?: Record<string, unknown>) {
  if (!PERF_LOGS_ENABLED) return;
  const payload = extra ? { ...extra } : {};
  console.debug(`[perf] ${traceId} +${msSinceStart}ms ${name}`, Object.keys(payload).length ? payload : '');
}

export interface Timeline {
  traceId: string;
  startMs: number;
  mark(name: string, extra?: Record<string, unknown>): void;
  end(extra?: Record<string, unknown>): void;
}

/**
 * Start a timeline for a flow (e.g. outfit render).
 * @param label Optional label for the trace (included in traceId log context).
 * @returns { traceId, mark(name, extra?), end(extra?) }
 */
export function startTimeline(label?: string): Timeline {
  const startMs = Date.now();
  const traceId = `${startMs}-${Math.random().toString(36).slice(2, 9)}`;
  if (PERF_LOGS_ENABLED) {
    console.debug(`[perf] ${traceId} 0ms start`, label ? { label } : '');
  }

  return {
    traceId,
    startMs,
    mark(name: string, extra?: Record<string, unknown>) {
      const msSinceStart = Date.now() - startMs;
      log(traceId, msSinceStart, name, extra);
    },
    end(extra?: Record<string, unknown>) {
      const msSinceStart = Date.now() - startMs;
      log(traceId, msSinceStart, 'end', extra);
    },
  };
}

/**
 * Continue a timeline on another screen (e.g. view after navigate from editor).
 * Uses the same traceId; startMs is the time when this continuation started.
 */
export function continueTimeline(traceId: string): Timeline {
  const startMs = Date.now();
  if (PERF_LOGS_ENABLED) {
    console.debug(`[perf] ${traceId} 0ms continue`);
  }
  return {
    traceId,
    startMs,
    mark(name: string, extra?: Record<string, unknown>) {
      const msSinceStart = Date.now() - startMs;
      log(traceId, msSinceStart, name, extra);
    },
    end(extra?: Record<string, unknown>) {
      const msSinceStart = Date.now() - startMs;
      log(traceId, msSinceStart, 'end', extra);
    },
  };
}

/** Check if perf logs are enabled (e.g. for conditional instrumentation). */
export function isPerfLogsEnabled(): boolean {
  return PERF_LOGS_ENABLED;
}
