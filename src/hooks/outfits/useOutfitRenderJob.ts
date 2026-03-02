import { useCallback } from 'react';
import {
  createAIJob,
  triggerAIJobExecution,
  pollAIJobWithFinalCheck,
  waitForAIJobCompletion,
  type AIJob,
} from '@/lib/ai-jobs';

type PollingMode = 'final_check' | 'wait_for_completion';

export interface RenderJobOptions {
  userId: string;
  jobType: AIJob['job_type'];
  jobParams: Record<string, any>;
  timeout?: number;
  interval?: number;
  logPrefix?: string;
  pollingMode?: PollingMode;
  pollJobType?: string;
  onJobCreated?: (jobId: string) => void;
  onJobTriggered?: (jobId: string) => void;
  onPollComplete?: (result: AIJob) => void;
  onError?: (error: Error) => void;
}

export interface RenderJobResult {
  job: AIJob | null;
  base64Result: string | null;
}

function toAttempts(timeoutMs: number, intervalMs: number): number {
  const safeInterval = intervalMs > 0 ? intervalMs : 2000;
  return Math.max(1, Math.ceil(timeoutMs / safeInterval));
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Failed to run render job');
}

export function useOutfitRenderJob() {
  const runRenderJob = useCallback(async (options: RenderJobOptions): Promise<RenderJobResult> => {
    const {
      userId,
      jobType,
      jobParams,
      timeout = 60000,
      interval = 2000,
      logPrefix = '[OutfitRenderJob]',
      pollingMode = 'final_check',
      pollJobType,
      onJobCreated,
      onJobTriggered,
      onPollComplete,
      onError,
    } = options;

    try {
      const { data: job, error: jobError } = await createAIJob(userId, jobType, jobParams);
      if (jobError || !job) {
        throw new Error(jobError?.message || 'Failed to create AI job');
      }
      onJobCreated?.(job.id);

      const triggerResult = await triggerAIJobExecution(job.id);
      if (triggerResult.error) {
        throw normalizeError(triggerResult.error);
      }
      onJobTriggered?.(job.id);

      const attempts = toAttempts(timeout, interval);
      const pollResult =
        pollingMode === 'wait_for_completion'
          ? await waitForAIJobCompletion(job.id, attempts, interval, logPrefix)
          : await pollAIJobWithFinalCheck(
              job.id,
              attempts,
              interval,
              logPrefix,
              pollJobType || jobType
            );

      const completedJob = pollResult.data;
      if (pollResult.error || !completedJob) {
        return { job: null, base64Result: null };
      }

      onPollComplete?.(completedJob);

      const base64Result =
        completedJob.result && typeof completedJob.result.base64_result === 'string'
          ? completedJob.result.base64_result
          : null;

      return { job: completedJob, base64Result };
    } catch (error) {
      const normalized = normalizeError(error);
      onError?.(normalized);
      throw normalized;
    }
  }, []);

  return { runRenderJob };
}
