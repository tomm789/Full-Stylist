/**
 * AI generation feedback – submit ratings and tags via Supabase RPC
 */

import { supabase } from './supabase';

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
