import { supabase } from '../../supabase';
import { createAIJob, getActiveJob } from '../core';
import type { AIJob } from '../core';
import type { QueryResult } from '../../utils/supabase-helpers';
import { getResultImageIdFromJob, logJobPayloadKeysIfDebug, RECENT_JOB_DAYS_MS } from './common';

/**
 * Trigger headshot_generate job from selfie
 */
export async function triggerHeadshotGenerate(
  userId: string,
  selfieImageId: string,
  hairStyle?: string,
  makeupStyle?: string
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'headshot_generate', {
    selfie_image_id: selfieImageId,
    hair_style: hairStyle,
    makeup_style: makeupStyle,
  });
}

/**
 * Trigger headshot_generate job with a fully formed prompt text.
 * Used for hair & make-up preset variations without touching legacy flow.
 */
export async function triggerHeadshotGenerateWithPrompt(
  userId: string,
  selfieImageId: string,
  promptText: string,
  options?: {
    outputFolder?: string;
    skipUserSettingsUpdate?: boolean;
    maskStoragePath?: string;
    maskStorageBucket?: string;
    maskColorMap?: Array<{ hex: string; customPrompt?: string }>;
    maskRenderFit?: 'cover' | 'contain';
    maskRenderWidth?: number;
    maskRenderHeight?: number;
  }
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'headshot_generate', {
    selfie_image_id: selfieImageId,
    prompt_text: promptText,
    output_folder: options?.outputFolder,
    skip_user_settings_update: options?.skipUserSettingsUpdate,
    mask_storage_path: options?.maskStoragePath,
    mask_storage_bucket: options?.maskStorageBucket,
    mask_color_map: options?.maskColorMap,
    mask_render_fit: options?.maskRenderFit,
    mask_render_width: options?.maskRenderWidth,
    mask_render_height: options?.maskRenderHeight,
  });
}

/**
 * Trigger body_shot_generate job to create studio model
 * @param headshotImageId Optional headshot to use. If not provided, uses active headshot from user_settings
 */
export async function triggerBodyShotGenerate(
  userId: string,
  bodyPhotoImageId: string,
  headshotImageId?: string
): Promise<QueryResult<AIJob>> {
  const input: any = {
    body_photo_image_id: bodyPhotoImageId,
  };

  if (headshotImageId) {
    input.headshot_image_id = headshotImageId;
  }

  return createAIJob(userId, 'body_shot_generate', input);
}

/**
 * Trigger body_shot_generate job using raw selfie + mirror selfie uploads
 */
export async function triggerBodyShotGenerateFromSelfies(
  userId: string,
  selfieImageId: string,
  mirrorSelfieImageId: string
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'body_shot_generate', {
    selfie_image_id: selfieImageId,
    mirror_selfie_image_id: mirrorSelfieImageId,
  });
}

/**
 * Get active headshot_generate job for the user.
 * Internal: matches any active job for userId (already scoped by getActiveJob).
 * Prefer resolving by image id via getRecentHeadshotJobForImage when you have the viewed image id.
 */
export async function getActiveHeadshotJob(userId: string): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'headshot_generate', () => true);
}

/**
 * Get recently completed headshot_generate job that produced this image.
 * Used when loading headshot view to show feedback overlay (and feedback_at for compact).
 */
export async function getRecentHeadshotJobForImage(
  userId: string,
  imageId: string
): Promise<QueryResult<AIJob>> {
  try {
    const since = new Date(Date.now() - RECENT_JOB_DAYS_MS).toISOString();
    const { data, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('job_type', 'headshot_generate')
      .eq('owner_user_id', userId)
      .eq('status', 'succeeded')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) return { data: null, error };
    const job = (data || []).find(
      (j: AIJob) => getResultImageIdFromJob(j) === imageId
    );
    if (job) logJobPayloadKeysIfDebug(job);
    return { data: job || null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Get active body_shot_generate job for the user.
 * Internal: matches any active job for userId (already scoped by getActiveJob).
 * Prefer resolving by image id via getRecentBodyshotJobForImage when you have the viewed image id.
 */
export async function getActiveBodyshotJob(userId: string): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'body_shot_generate', () => true);
}

/**
 * Get recently completed body_shot_generate job that produced this image.
 * Used when loading bodyshot view to show feedback overlay (and feedback_at for compact).
 */
export async function getRecentBodyshotJobForImage(
  userId: string,
  imageId: string
): Promise<QueryResult<AIJob>> {
  try {
    const since = new Date(Date.now() - RECENT_JOB_DAYS_MS).toISOString();
    const { data, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('job_type', 'body_shot_generate')
      .eq('owner_user_id', userId)
      .eq('status', 'succeeded')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) return { data: null, error };
    const job = (data || []).find(
      (j: AIJob) => getResultImageIdFromJob(j) === imageId
    );
    if (job) logJobPayloadKeysIfDebug(job);
    return { data: job || null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
