/**
 * useAIJobPolling Hook
 * Generic hook for polling AI job completion.
 * Single poller per jobId; onComplete called at most once; uses no-store fetch for fresh status.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAIJobNoStore, AIJob } from '@/lib/ai-jobs';

interface UseAIJobPollingOptions {
  jobId: string | null;
  onComplete?: (job: AIJob) => void;
  onError?: (error: Error) => void;
  interval?: number; // Polling interval in ms
  maxAttempts?: number; // Maximum polling attempts
  enabled?: boolean; // Whether to start polling. Prefer: enabled = Boolean(jobId) && !completed && !cancelled
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

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const didCompleteRef = useRef(false);
  const attemptsRef = useRef(0);
  const currentJobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    isPollingRef.current = false;
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(async () => {
    if (!jobId || !enabled) return;
    if (isPollingRef.current && currentJobIdRef.current === jobId) return;

    currentJobIdRef.current = jobId;
    didCompleteRef.current = false;
    attemptsRef.current = 0;
    setError(null);
    isPollingRef.current = true;
    setIsPolling(true);

    const poll = async () => {
      const id = currentJobIdRef.current;
      if (!id) return;

      try {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);

        const { data: jobData, error: jobError } = await getAIJobNoStore(id);

        if (jobError) {
          throw jobError;
        }
        if (!jobData) {
          throw new Error('Job not found');
        }

        setJob(jobData);

        if (jobData.status === 'succeeded' || jobData.status === 'failed') {
          stopPolling();
          currentJobIdRef.current = null;
          if (didCompleteRef.current) return;
          didCompleteRef.current = true;

          if (jobData.status === 'succeeded') {
            onComplete?.(jobData);
          } else {
            const err = new Error(jobData.error || 'Job failed');
            setError(err);
            onError?.(err);
          }
          return;
        }

        if (attemptsRef.current >= maxAttempts) {
          stopPolling();
          currentJobIdRef.current = null;
          if (didCompleteRef.current) return;
          didCompleteRef.current = true;
          const err = new Error('Polling timeout - max attempts reached');
          setError(err);
          onError?.(err);
        }
      } catch (err) {
        const e = err as Error;
        setError(e);
        onError?.(e);
        stopPolling();
        currentJobIdRef.current = null;
      }
    };

    await poll();
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    intervalIdRef.current = setInterval(poll, interval);
  }, [jobId, enabled, interval, maxAttempts, onComplete, onError, stopPolling]);

  useEffect(() => {
    if (!jobId || !enabled) {
      stopPolling();
      currentJobIdRef.current = null;
      return;
    }
    startPolling();
    return () => {
      stopPolling();
      currentJobIdRef.current = null;
    };
  }, [jobId, enabled]);

  const retry = useCallback(() => {
    stopPolling();
    setError(null);
    setAttempts(0);
    attemptsRef.current = 0;
    didCompleteRef.current = false;
    startPolling();
  }, [startPolling, stopPolling]);

  return {
    job,
    jobId: jobId ?? null,
    status: job?.status ?? null,
    isPolling,
    attempts,
    error,
    startPolling,
    stopPolling,
    retry,
  };
}

export default useAIJobPolling;
