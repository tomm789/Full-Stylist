import { SUPABASE_CONFIG } from '../supabase';
import { getAIJob } from './core';
import type { AIJob } from './core';
import type { QueryResult } from '../utils/supabase-helpers';

// Circuit breaker state
const activePollingJobs = new Set<string>();
const failureCountByJob = new Map<string, number>();
const CIRCUIT_BREAKER_THRESHOLD = 5;

/**
 * Poll AI job status with exponential backoff
 */
export async function pollAIJob(
  jobId: string,
  maxAttempts: number = SUPABASE_CONFIG.DEV_MODE ? 30 : 60,
  initialIntervalMs: number = 2000
): Promise<QueryResult<AIJob>> {
  if (activePollingJobs.has(jobId)) {
    return { data: null, error: new Error('Job already being polled') };
  }

  const failureCount = failureCountByJob.get(jobId) || 0;
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    return {
      data: null,
      error: new Error('Circuit breaker open: too many failures'),
    };
  }

  activePollingJobs.add(jobId);

  try {
    let intervalMs = initialIntervalMs;
    const maxIntervalMs = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await getAIJob(jobId);

      if (error) {
        failureCountByJob.set(jobId, failureCount + 1);
        return { data: null, error };
      }

      if (!data) {
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
          intervalMs = Math.min(intervalMs * 2, maxIntervalMs);
          continue;
        }
        failureCountByJob.set(jobId, failureCount + 1);
        return { data: null, error: new Error('Job not found') };
      }

      if (data.status === 'succeeded') {
        failureCountByJob.delete(jobId);
        return { data, error: null };
      }

      if (data.status === 'failed') {
        failureCountByJob.set(jobId, failureCount + 1);
        return { data, error: null };
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        intervalMs = Math.min(intervalMs * 2, maxIntervalMs);
      }
    }

    return { data: null, error: new Error('Polling timeout') };
  } finally {
    activePollingJobs.delete(jobId);
  }
}

/**
 * Poll AI job and perform a final status check on timeout
 */
export async function pollAIJobWithFinalCheck(
  jobId: string,
  maxAttempts: number = SUPABASE_CONFIG.DEV_MODE ? 30 : 60,
  initialIntervalMs: number = 2000,
  logPrefix?: string
): Promise<QueryResult<AIJob>> {
  const { data: completedJob, error: pollError } = await pollAIJob(
    jobId,
    maxAttempts,
    initialIntervalMs
  );

  if (!pollError && completedJob) {
    return { data: completedJob, error: null };
  }

  if (logPrefix) {
    console.log(`${logPrefix} polling timed out, doing final check...`);
  }

  const { data: finalCheck } = await getAIJob(jobId);
  if (
    finalCheck &&
    (finalCheck.status === 'succeeded' || finalCheck.status === 'failed')
  ) {
    return { data: finalCheck, error: null };
  }

  return { data: null, error: pollError || new Error('Polling timeout') };
}

/**
 * Wait for AI job completion with automatic retry on timeout
 */
export async function waitForAIJobCompletion(
  jobId: string,
  maxAttempts: number = SUPABASE_CONFIG.DEV_MODE ? 30 : 60,
  initialIntervalMs: number = 2000,
  logPrefix?: string
): Promise<QueryResult<AIJob>> {
  while (true) {
    const { data: completedJob, error } = await pollAIJobWithFinalCheck(
      jobId,
      maxAttempts,
      initialIntervalMs,
      logPrefix
    );

    if (completedJob) {
      return { data: completedJob, error: null };
    }

    if (error?.message && error.message.toLowerCase().includes('timeout')) {
      if (logPrefix) {
        console.log(`${logPrefix} polling timed out, continuing to wait...`);
      }
      continue;
    }

    return { data: null, error };
  }
}

/**
 * Reset circuit breaker for a job
 */
export function resetCircuitBreaker(jobId: string): void {
  failureCountByJob.delete(jobId);
  activePollingJobs.delete(jobId);
}

/**
 * Check if circuit breaker is open for a job
 */
export function isCircuitBreakerOpen(jobId: string): boolean {
  const failureCount = failureCountByJob.get(jobId) || 0;
  return failureCount >= CIRCUIT_BREAKER_THRESHOLD;
}
