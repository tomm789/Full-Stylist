/**
 * useWardrobeItemPolling Hook
 * Generic polling for AI jobs (product shot, auto-tag, etc.)
 */

import { useState, useRef, useEffect } from 'react';
import { getAIJobNoStore, AIJob } from '@/lib/ai-jobs';

interface UseWardrobeItemPollingProps {
  jobId: string | null;
  /** Called when job reaches succeeded/failed. Receives the job so callers can use result (e.g. base64_result). */
  onComplete: (job?: AIJob) => void;
  /** Called on every poll with current job; use to paint as soon as result.base64_result exists (before succeeded). */
  onJobUpdate?: (job: AIJob) => void;
  onError?: () => void;
  onTimeout?: () => void;
  timeout?: number;
  /** Polling interval (ms). Use 500–1000 for fast first paint. */
  interval?: number;
  logPrefix?: string;
}

export const useWardrobeItemPolling = ({
  jobId,
  onComplete,
  onJobUpdate,
  onError,
  onTimeout,
  timeout = 120000,
  interval = 2000,
  logPrefix = '[Polling]',
}: UseWardrobeItemPollingProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const isPollingRef = useRef(false);
  const activeJobIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPollingRef.current = false;
    activeJobIdRef.current = null;
    setIsPolling(false);
  };

  const startPolling = () => {
    if (!jobId) return;
    if (isPollingRef.current && activeJobIdRef.current === jobId) return;
    if (isPollingRef.current && activeJobIdRef.current !== jobId) {
      stopPolling();
    }

    console.log(`${logPrefix} Starting polling for job ${jobId}`);
    isPollingRef.current = true;
    activeJobIdRef.current = jobId;
    setIsPolling(true);

    // Set timeout to stop polling
    timeoutRef.current = setTimeout(() => {
      console.log(`${logPrefix} Timeout reached`);
      if (onTimeout) {
        onTimeout();
      }
      stopPolling();
    }, timeout);

    // Start polling
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { data: job, error } = await getAIJobNoStore(jobId);

        if (error) {
          console.error(`${logPrefix} Error fetching job:`, error);
          if (onError) {
            stopPolling();
            onError();
          }
          return;
        }

        if (job) {
          onJobUpdate?.(job);
          if (job.status === 'succeeded' || job.status === 'failed') {
            console.log(`${logPrefix} Job completed with status: ${job.status}`);
            stopPolling();
            onComplete(job);
          }
        }
      } catch (error) {
        console.error(`${logPrefix} Polling error:`, error);
      }
    }, interval);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isPolling,
    startPolling,
    stopPolling,
  };
};
