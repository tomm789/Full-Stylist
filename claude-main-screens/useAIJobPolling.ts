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
    if (!jobId || !enabled || isPolling) return;

    setIsPolling(true);
    setError(null);
    attemptsRef.current = 0;

    const poll = async () => {
      if (!jobId) return;

      try {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);

        const { data: jobData, error: jobError } = await getAIJob(jobId);

        if (jobError) {
          throw jobError;
        }

        if (!jobData) {
          throw new Error('Job not found');
        }

        setJob(jobData);

        // Check if job is complete
        if (jobData.status === 'succeeded' || jobData.status === 'failed') {
          stopPolling();

          if (jobData.status === 'succeeded') {
            onComplete?.(jobData);
          } else {
            const error = new Error(jobData.error_message || 'Job failed');
            setError(error);
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
    if (jobId && enabled) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
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
