/**
 * useAIJobPolling Hook
 * Generic hook for polling AI job completion
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAIJob, AIJob } from '@/lib/ai-jobs';

interface UseAIJobPollingOptions {
  jobId: string | null;
  onComplete?: (job: AIJob) => void;
  onError?: (error: Error) => void;
  interval?: number; // Polling interval in ms
  maxAttempts?: number; // Maximum polling attempts
  enabled?: boolean; // Whether to start polling
}

export function useAIJobPolling({
  jobId,
  onComplete,
  onError,
  interval = 2000,
  maxAttempts = 30,
  enabled = true,
}: UseAIJobPollingOptions) {
  const [job, setJob] = useState<AIJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start polling
  const startPolling = useCallback(async () => {
    console.log('[useAIJobPolling] startPolling called:', {
      jobId,
      enabled,
      isPolling,
      willProceed: !!(jobId && enabled && !isPolling),
    });
    
    if (!jobId || !enabled || isPolling) {
      console.log('[useAIJobPolling] startPolling aborted:', {
        reason: !jobId ? 'no jobId' : !enabled ? 'not enabled' : 'already polling',
      });
      return;
    }

    console.log('[useAIJobPolling] Starting polling for job:', jobId);
    setIsPolling(true);
    setError(null);
    attemptsRef.current = 0;

    const poll = async () => {
      if (!jobId) {
        console.log('[useAIJobPolling] poll() called but no jobId');
        return;
      }

      try {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);
        
        console.log(`[useAIJobPolling] Polling attempt ${attemptsRef.current} for job:`, jobId);

        const { data: jobData, error: jobError } = await getAIJob(jobId);

        if (jobError) {
          throw jobError;
        }

        if (!jobData) {
          throw new Error('Job not found');
        }

        setJob(jobData);
        
        console.log(`[useAIJobPolling] Job status update (attempt ${attemptsRef.current}):`, {
          jobId,
          status: jobData.status,
          jobType: jobData.job_type,
          hasResult: !!jobData.result,
        });

        // Check if job is complete
        if (jobData.status === 'succeeded' || jobData.status === 'failed') {
          console.log(`[useAIJobPolling] Job completed with status: ${jobData.status}`, {
            jobId,
            jobType: jobData.job_type,
            result: jobData.result,
            error: jobData.error,
          });
          stopPolling();

          if (jobData.status === 'succeeded') {
            console.log('[useAIJobPolling] Calling onComplete callback');
            onComplete?.(jobData);
          } else {
            const error = new Error(jobData.error || 'Job failed');
            setError(error);
            console.log('[useAIJobPolling] Calling onError callback');
            onError?.(error);
          }
        }

        // Check if max attempts reached
        if (attemptsRef.current >= maxAttempts) {
          stopPolling();
          const error = new Error('Polling timeout - max attempts reached');
          setError(error);
          onError?.(error);
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
        stopPolling();
      }
    };

    // Initial poll
    await poll();

    // Set up interval polling
    pollingIntervalRef.current = setInterval(poll, interval);
  }, [jobId, enabled, isPolling, interval, maxAttempts, onComplete, onError, stopPolling]);

  // Auto-start polling when jobId changes
  useEffect(() => {
    console.log('[useAIJobPolling] useEffect triggered:', {
      jobId,
      enabled,
      isPolling,
      willStartPolling: !!(jobId && enabled && !isPolling),
    });
    
    if (jobId && enabled && !isPolling) {
      console.log('[useAIJobPolling] Starting watch for Job ID:', jobId);
      startPolling();
    } else {
      console.log('[useAIJobPolling] Not starting polling:', {
        reason: !jobId ? 'no jobId' : !enabled ? 'not enabled' : 'already polling',
        jobId,
        enabled,
        isPolling,
      });
    }

    return () => {
      console.log('[useAIJobPolling] Cleanup: stopping polling for jobId:', jobId);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, enabled]);

  // Manual retry
  const retry = useCallback(() => {
    stopPolling();
    setError(null);
    setAttempts(0);
    attemptsRef.current = 0;
    startPolling();
  }, [startPolling, stopPolling]);

  return {
    job,
    isPolling,
    attempts,
    error,
    startPolling,
    stopPolling,
    retry,
  };
}

export default useAIJobPolling;
