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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:19',message:'pollAIJob already polling',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return { data: null, error: new Error('Job already being polled') };
  }

  const failureCount = failureCountByJob.get(jobId) || 0;
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:24',message:'pollAIJob circuit breaker open',data:{jobId,failureCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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

      // #region agent log
      if (attempt % 5 === 0 || data?.status === 'succeeded' || data?.status === 'failed') {
        fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:38',message:'pollAIJob attempt',data:{jobId,attempt,maxAttempts,hasError:!!error,errorMessage:error?.message,hasData:!!data,status:data?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:55',message:'pollAIJob succeeded',data:{jobId,result:data.result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return { data, error: null };
      }

      if (data.status === 'failed') {
        failureCountByJob.set(jobId, failureCount + 1);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:60',message:'pollAIJob failed',data:{jobId,error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return { data, error: null };
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        intervalMs = Math.min(intervalMs * 2, maxIntervalMs);
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:71',message:'pollAIJob timeout',data:{jobId,maxAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:114',message:'waitForAIJobCompletion entry',data:{jobId,maxAttempts,initialIntervalMs,logPrefix},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  while (true) {
    const { data: completedJob, error } = await pollAIJobWithFinalCheck(
      jobId,
      maxAttempts,
      initialIntervalMs,
      logPrefix
    );

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:121',message:'waitForAIJobCompletion poll result',data:{jobId,hasJob:!!completedJob,jobStatus:completedJob?.status,hasError:!!error,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (completedJob) {
      return { data: completedJob, error: null };
    }

    if (error?.message && error.message.toLowerCase().includes('timeout')) {
      if (logPrefix) {
        console.log(`${logPrefix} polling timed out, continuing to wait...`);
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:132',message:'waitForAIJobCompletion timeout, continuing',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      continue;
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3a269559-16ce-41e5-879a-1155393947c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'polling.ts:139',message:'waitForAIJobCompletion returning error',data:{jobId,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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
