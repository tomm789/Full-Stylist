/**
 * useProductShot Hook
 * Manages product shot generation and polling
 */

import { useState, useCallback, useEffect } from 'react';
import {
  triggerProductShot,
  triggerAIJobExecution,
  getActiveProductShotJob,
  getRecentProductShotJob,
} from '@/lib/ai-jobs';
import { useAIJobPolling } from './useAIJobPolling';

interface UseProductShotOptions {
  itemId: string | null;
  userId: string | null;
  imageId?: string | null;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  autoCheck?: boolean; // Auto-check for active jobs on mount
}

export function useProductShot({
  itemId,
  userId,
  imageId,
  onComplete,
  onError,
  autoCheck = true,
}: UseProductShotOptions) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use AI job polling hook
  const { job, isPolling } = useAIJobPolling({
    jobId,
    onComplete: () => {
      setIsGenerating(false);
      onComplete?.();
    },
    onError: (err) => {
      setIsGenerating(false);
      setError(err);
      onError?.(err);
    },
    enabled: !!jobId,
  });

  // Check for active or recent product shot job
  const checkExistingJob = useCallback(async () => {
    if (!itemId || !userId) return;

    try {
      // Check for active job
      const { data: activeJob } = await getActiveProductShotJob(itemId, userId);
      
      if (activeJob) {
        setJobId(activeJob.id);
        setIsGenerating(true);
        return;
      }

      // Check for recent job (within last 60 seconds)
      const { data: recentJob } = await getRecentProductShotJob(itemId, userId);
      
      if (recentJob && recentJob.status === 'succeeded') {
        // Job recently completed - trigger completion callback
        onComplete?.();
      }
    } catch (err) {
      console.error('Error checking existing job:', err);
    }
  }, [itemId, userId, onComplete]);

  // Auto-check for existing jobs on mount
  useEffect(() => {
    if (autoCheck && itemId && userId) {
      checkExistingJob();
    }
  }, [autoCheck, itemId, userId]);

  // Start product shot generation
  const generate = useCallback(async () => {
    if (!itemId || !userId || !imageId) {
      const error = new Error('Missing required parameters');
      setError(error);
      onError?.(error);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Create product shot job
      const { data: productShotJob, error: jobError } = await triggerProductShot(
        userId,
        imageId,
        itemId
      );

      if (jobError || !productShotJob) {
        throw jobError || new Error('Failed to create product shot job');
      }

      // Trigger job execution
      const { error: execError } = await triggerAIJobExecution(productShotJob.id);
      
      if (execError) {
        console.warn('Job trigger returned error (may still work):', execError);
        // Continue anyway - job might still be triggered
      }

      // Start polling
      setJobId(productShotJob.id);
    } catch (err) {
      const error = err as Error;
      setIsGenerating(false);
      setError(error);
      onError?.(error);
    }
  }, [itemId, userId, imageId, onError]);

  // Cancel generation
  const cancel = useCallback(() => {
    setJobId(null);
    setIsGenerating(false);
  }, []);

  return {
    job,
    jobId,
    isGenerating: isGenerating || isPolling,
    error,
    generate,
    cancel,
    checkExistingJob,
  };
}

export default useProductShot;
