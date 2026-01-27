import { supabase } from '../supabase';
import { SUPABASE_CONFIG } from '../supabase';
import { QueryResult } from '../utils/supabase-helpers';

export interface AIJob {
  id: string;
  owner_user_id: string;
  job_type:
    | 'auto_tag'
    | 'product_shot'
    | 'headshot_generate'
    | 'body_shot_generate'
    | 'outfit_suggest'
    | 'reference_match'
    | 'outfit_render'
    | 'outfit_mannequin'
    | 'lookbook_generate';
  input: any;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

// Policy block patterns for Gemini errors
const POLICY_BLOCK_PATTERNS = [
  'safety',
  'blocked',
  'policy',
  'harassment',
  'sexually explicit',
  'dangerous content',
  'generation blocked',
  'safety block',
];

/**
 * Create an AI job (client creates, server processes)
 */
export async function createAIJob(
  userId: string,
  jobType: AIJob['job_type'],
  input: any
): Promise<QueryResult<AIJob>> {
  try {
    const { data, error } = await supabase
      .from('ai_jobs')
      .insert({
        owner_user_id: userId,
        job_type: jobType,
        input,
        status: 'queued',
      })
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get AI job by ID
 */
export async function getAIJob(jobId: string): Promise<QueryResult<AIJob>> {
  try {
    const { data, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Check if an error message indicates a Gemini policy block
 */
export function isGeminiPolicyBlockError(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return POLICY_BLOCK_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Get active job for a specific type and filters
 */
export async function getActiveJob(
  userId: string,
  jobType: AIJob['job_type'],
  filterFn: (job: AIJob) => boolean
): Promise<QueryResult<AIJob>> {
  try {
    const { data, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('job_type', jobType)
      .in('status', ['queued', 'running'])
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: null };
    }

    // Filter by custom criteria
    const matchingJob = data.find(filterFn);

    return { data: matchingJob || null, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get recently completed job (within last 60 seconds)
 */
export async function getRecentJob(
  userId: string,
  jobType: AIJob['job_type'],
  filterFn: (job: AIJob) => boolean
): Promise<QueryResult<AIJob>> {
  try {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('job_type', jobType)
      .in('status', ['succeeded', 'failed'])
      .eq('owner_user_id', userId)
      .gte('updated_at', sixtySecondsAgo)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: null };
    }

    // Filter by custom criteria
    const matchingJob = data.find(filterFn);

    return { data: matchingJob || null, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get outfit render item limit based on model preference
 */
export function getOutfitRenderItemLimit(
  modelPreference?: string | null
): number {
  return modelPreference?.includes('pro') ? 7 : 2;
}
