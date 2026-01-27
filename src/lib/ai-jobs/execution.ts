import { supabase } from '../supabase';

// Check if running in React Native
const __DEV__ =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

/**
 * Trigger AI job execution by calling Netlify function
 */
export async function triggerAIJobExecution(
  jobId: string
): Promise<{ error: any }> {
  try {
    // Get current session for auth token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: new Error('No active session') };
    }

    const isDev =
      (typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'development') ||
      __DEV__;
    
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

    const functionUrl = `${baseUrl}/.netlify/functions/ai-job-runner`;

    // Validate URL format
    if (
      baseUrl &&
      !baseUrl.startsWith('http://') &&
      !baseUrl.startsWith('https://')
    ) {
      console.error('[AIJobs] Invalid baseUrl format:', baseUrl);
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
        if (!response.ok) {
          const responseText = await response
            .text()
            .catch(() => 'could not read response');
          console.warn('[AIJobs] Function trigger returned non-OK response', {
            status: response.status,
            statusText: response.statusText,
            responseText: responseText.substring(0, 200),
          });
        }
        return response;
      })
      .catch((error) => {
        // Log error details for debugging
        const errorDetails = {
          message: error?.message,
          name: error?.name,
          functionUrl,
          baseUrl,
          hasExpoPublicNetlifyUrl: !!process.env.EXPO_PUBLIC_NETLIFY_URL,
        };
        console.error(
          '[AIJobs] Failed to trigger job execution:',
          errorDetails
        );

        // For network errors (not timeouts), this might be a configuration issue
        if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          console.error(
            '[AIJobs] Network error - check EXPO_PUBLIC_NETLIFY_URL configuration'
          );
        }

        // Ignore timeout errors - the job will keep processing on the server
        if (
          error?.name === 'AbortError' ||
          error?.message?.includes('timeout')
        ) {
          console.log(
            '[AIJobs] Function trigger timed out (expected for long-running jobs), will poll for status'
          );
        }
      });

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Create job and trigger execution
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

    // Trigger execution
    const { error: triggerError } = await triggerAIJobExecution(job.id);

    if (triggerError) {
      console.warn(
        '[AIJobs] Failed to trigger job execution, but job was created:',
        triggerError
      );
    }

    return { data: { jobId: job.id }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
