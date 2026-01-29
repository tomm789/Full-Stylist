import { supabase } from '../supabase';
import { debugIngest } from './debug-ingest';

/**
 * Trigger AI job execution by calling Netlify function
 */
export async function triggerAIJobExecution(
  jobId: string
): Promise<{ error: any }> {
  const triggerStartMs = Date.now();
  console.info('[AIJobs] triggerAIJobExecution start', { jobId });
  console.debug('[outfit_render_timing] trigger_start', { ts: triggerStartMs, jobId });
  debugIngest({ location: 'execution.ts:10', message: 'triggerAIJobExecution entry', data: { jobId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });

  try {
    // Get current session for auth token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    debugIngest({ location: 'execution.ts:18', message: 'triggerAIJobExecution session check', data: { jobId, hasSession: !!session }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });

    if (!session) {
      return { error: new Error('No active session') };
    }

    const isDev =
      (typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'development') ||
      (typeof __DEV__ !== 'undefined' && (__DEV__ as boolean) === true);
    
    // Prefer the explicitly configured Netlify URL in all environments
    let baseUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || '';

    if (!baseUrl) {
      if (isDev) {
        // Allow environment variable to override for physical devices
        baseUrl =
          process.env.EXPO_PUBLIC_NETLIFY_DEV_URL || 'http://localhost:8888';
      } else {
        // Fallback: For web builds, use current origin if available
        if (typeof window !== 'undefined' && window.location) {
          baseUrl = window.location.origin;
          console.warn(
            '[AIJobs] EXPO_PUBLIC_NETLIFY_URL not set, using window.location.origin as fallback:',
            baseUrl
          );
        }

        // If still empty, use relative URL
        if (!baseUrl) {
          console.warn(
            '[AIJobs] EXPO_PUBLIC_NETLIFY_URL not set and window.location unavailable, using relative URL'
          );
        }
      }
    }

    // Never produce //.netlify: strip trailing slashes from base URL
    const baseUrlNormalized = baseUrl.replace(/\/+$/, '');
    const functionUrl = `${baseUrlNormalized}/.netlify/functions/ai-job-runner`;

    debugIngest({ location: 'execution.ts:55', message: 'triggerAIJobExecution before fetch', data: { jobId, functionUrl, baseUrl, hasExpoPublicNetlifyUrl: !!process.env.EXPO_PUBLIC_NETLIFY_URL }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });

    // Validate URL format
    if (
      baseUrlNormalized &&
      !baseUrlNormalized.startsWith('http://') &&
      !baseUrlNormalized.startsWith('https://')
    ) {
      console.error('[AIJobs] Invalid baseUrl format:', baseUrlNormalized);
      return { error: new Error('Invalid Netlify function URL configuration') };
    }

    // Call Netlify function to process the job (fire-and-forget with short timeout)
    fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ job_id: jobId }),
      // @ts-ignore - React Native fetch doesn't support signal in the same way
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    })
      .then(async (response) => {
        const ts = Date.now();
        console.debug('[outfit_render_timing] trigger_timeout_or_response', { ts, jobId, status: response.status });
        debugIngest({ location: 'execution.ts:78', message: 'triggerAIJobExecution fetch response', data: { jobId, status: response.status, statusText: response.statusText, ok: response.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });

        if (!response.ok) {
          const responseText = await response
            .text()
            .catch(() => 'could not read response');
          console.warn('[AIJobs] Function trigger returned non-OK response', {
            status: response.status,
            statusText: response.statusText,
            responseText: responseText.substring(0, 200),
          });
          debugIngest({ location: 'execution.ts:84', message: 'triggerAIJobExecution non-OK response', data: { jobId, status: response.status, responseText: responseText.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });
        }
        return response;
      })
      .catch((error) => {
        const isTimeoutOrAbort =
          error?.name === 'AbortError' ||
          error?.name === 'TimeoutError' ||
          error?.message?.toLowerCase().includes('timeout') ||
          error?.message?.toLowerCase().includes('abort');
        const errorDetails = {
          message: error?.message,
          name: error?.name,
          functionUrl,
          baseUrl: baseUrlNormalized,
          hasExpoPublicNetlifyUrl: !!process.env.EXPO_PUBLIC_NETLIFY_URL,
        };

        if (isTimeoutOrAbort) {
          const ts = Date.now();
          console.debug('[outfit_render_timing] trigger_timeout_or_response', { ts, jobId, status: 'timeout' });
          console.debug('[AIJobs] Trigger timed out (expected); job runs on server, poll for status.', { jobId });
          debugIngest({
            location: 'execution.ts:91',
            message: 'triggerAIJobExecution fetch error',
            data: { jobId, ...errorDetails, expected: true, kind: 'timeout' },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D',
          });
        } else {
          console.error('[AIJobs] Failed to trigger job execution:', errorDetails);
          if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
            console.error('[AIJobs] Network error - check EXPO_PUBLIC_NETLIFY_URL configuration');
          }
          debugIngest({
            location: 'execution.ts:91',
            message: 'triggerAIJobExecution fetch error',
            data: { jobId, ...errorDetails },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D',
          });
        }
      });

    debugIngest({ location: 'execution.ts:123', message: 'triggerAIJobExecution returning success', data: { jobId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });
    const elapsedMs = Date.now() - triggerStartMs;
    console.info('[AIJobs] triggerAIJobExecution end', { jobId, elapsedMs });
    return { error: null };
  } catch (error: any) {
    const elapsedMs = Date.now() - triggerStartMs;
    console.info('[AIJobs] triggerAIJobExecution end (error)', { jobId, elapsedMs });
    return { error };
  }
}

/**
 * Create job and trigger execution (fire-and-forget trigger).
 * Does not await trigger; UI should rely on polling job status.
 * Timeouts on the trigger call are logged but do not block or fail the flow.
 */
export async function createAndTriggerJob(
  userId: string,
  jobType: any,
  input: any
): Promise<{
  data: { jobId: string } | null;
  error: any;
}> {
  try {
    // Import here to avoid circular dependency
    const { createAIJob } = await import('./core');

    const { data: job, error } = await createAIJob(userId, jobType, input);

    if (error || !job) {
      return { data: null, error };
    }

    // Fire-and-forget: do not await. Server job runs via handler; UI polls status.
    triggerAIJobExecution(job.id).then((result) => {
      if (result.error) {
        console.warn('[AIJobs] Trigger returned error (job still runs on server):', result.error?.message);
      }
    }).catch((err) => {
      console.warn('[AIJobs] Trigger failed (job still runs on server):', err?.message ?? err);
    });

    return { data: { jobId: job.id }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
