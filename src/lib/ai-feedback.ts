/**
 * AI generation feedback – submit ratings and tags via Supabase RPC
 */

import { supabase } from './supabase';

/**
 * Check if the current user has submitted feedback for a job.
 * Use when ai_jobs.feedback_at is missing/unupdated: query ai_generation_feedback
 * (RLS scopes to auth.uid()) to determine compact state on reload.
 * One lightweight check; no polling.
 */
export async function checkFeedbackExistsForJob(jobId: string): Promise<{
  exists: boolean;
  created_at: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('ai_generation_feedback')
      .select('created_at')
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      return { exists: false, created_at: null };
    }
    const row = data as { created_at?: string } | null;
    const created_at = row?.created_at ?? null;
    return { exists: created_at != null, created_at };
  } catch {
    return { exists: false, created_at: null };
  }
}

export const FEEDBACK_TAGS = [
  'Anatomy',
  'Color',
  'Quality',
  'Background',
] as const;

export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

export interface SubmitAIFeedbackParams {
  jobId: string;
  jobType: string;
  rating: 1 | -1;
  tags?: FeedbackTag[];
  comment?: string | null;
}

export async function submitAIFeedback({
  jobId,
  jobType,
  rating,
  tags,
  comment,
}: SubmitAIFeedbackParams): Promise<{ data: unknown; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('submit_ai_feedback', {
      p_job_id: jobId,
      p_job_type: jobType,
      p_rating: rating,
      p_tags: tags ?? [],
      p_comment: comment ?? null,
    });
    return { data, error: error as Error | null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
