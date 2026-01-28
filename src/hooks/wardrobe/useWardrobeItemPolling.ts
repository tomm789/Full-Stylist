/**
 * useWardrobeItemPolling Hook
 * Generic polling for AI jobs (product shot, auto-tag, etc.)
 */

import { useState, useRef, useEffect } from 'react';
import { getAIJob, AIJob } from '@/lib/ai-jobs';

interface UseWardrobeItemPollingProps {
  jobId: string | null;
  onComplete: () => void;
  onError?: () => void;
  onTimeout?: () => void;
  timeout?: number;
  interval?: number;
  logPrefix?: string;
}

export const useWardrobeItemPolling = ({
  jobId,
  onComplete,
  onError,
  onTimeout,
  timeout = 120000,
  interval = 2000,
  logPrefix = '[Polling]',
}: UseWardrobeItemPollingProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    if (!jobId || isPolling) return;

    console.log(`${logPrefix} Starting polling for job ${jobId}`);
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
        const { data: job, error } = await getAIJob(jobId);

        if (error) {
          console.error(`${logPrefix} Error fetching job:`, error);
          if (onError) {
            stopPolling();
            onError();
          }
          return;
        }

        if (job?.status === 'succeeded' || job?.status === 'failed') {
          console.log(`${logPrefix} Job completed with status: ${job.status}`);
          stopPolling();
          onComplete();
        }
      } catch (error) {
        console.error(`${logPrefix} Polling error:`, error);
      }
    }, interval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
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
