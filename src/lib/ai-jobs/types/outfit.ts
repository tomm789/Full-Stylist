import { getActiveJob, getRecentJob } from '../core';
import type { AIJob } from '../core';
import type { QueryResult } from '../../utils/supabase-helpers';

/**
 * Get active outfit_render job for an outfit
 */
export async function getActiveOutfitRenderJob(
  outfitId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'outfit_render', (job) => {
    try {
      const input = job.input as any;
      return input?.outfit_id === outfitId;
    } catch {
      return false;
    }
  });
}

/**
 * Get recently completed outfit_render job for an outfit
 */
export async function getRecentOutfitRenderJob(
  outfitId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getRecentJob(userId, 'outfit_render', (job) => {
    try {
      const input = job.input as any;
      return input?.outfit_id === outfitId;
    } catch {
      return false;
    }
  });
}
