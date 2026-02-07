import { supabase } from '../supabase';
import { createAIJob, getActiveJob, getRecentJob } from './core';
import type { AIJob } from './core';
import type { QueryResult } from '../utils/supabase-helpers';

/**
 * Defensive: resolve wardrobe item id from job input (item_id or wardrobe_item_id).
 * wardrobe_item_generate and wardrobe_item_render use item_id; product_shot/batch use wardrobe_item_id.
 */
function getWardrobeItemIdFromJobInput(job: AIJob): string | null {
  try {
    const input = job.input as Record<string, unknown> | undefined;
    if (!input) return null;
    const id = (input.item_id as string) ?? (input.wardrobe_item_id as string);
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

/**
 * Defensive: resolve generated image id from job result (image_id, generated_image_id, output_image_id).
 */
function getResultImageIdFromJob(job: AIJob): string | null {
  try {
    const result = job.result as Record<string, unknown> | undefined;
    if (!result) return null;
    const id =
      (result.image_id as string) ??
      (result.generated_image_id as string) ??
      (result.output_image_id as string);
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

/**
 * Dev-only: log job input/result keys once when (globalThis as any).__FEEDBACK_OVERLAY_DEBUG__ is set.
 * Use to verify payload shapes if matching breaks (e.g. new backend result keys).
 */
function logJobPayloadKeysIfDebug(job: AIJob): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const flag = (globalThis as any).__FEEDBACK_OVERLAY_DEBUG__;
  if (flag !== true) return;
  const inputKeys = job.input && typeof job.input === 'object' ? Object.keys(job.input) : [];
  const resultKeys = job.result && typeof job.result === 'object' ? Object.keys(job.result) : [];
  console.debug('[feedback_overlay] job payload keys', {
    job_type: job.job_type,
    job_id: job.id,
    input_keys: inputKeys,
    result_keys: resultKeys,
  });
}

/**
 * Trigger auto_tag job for wardrobe item
 */
export async function triggerAutoTag(
  userId: string,
  wardrobeItemId: string,
  imageIds: string[],
  category: string | null,
  subcategory?: string | null
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'auto_tag', {
    wardrobe_item_id: wardrobeItemId,
    image_ids: imageIds,
    category: category || null,
    subcategory: subcategory || null,
  });
}

/**
 * Apply auto_tag results to wardrobe item
 */
export async function applyAutoTagResults(
  wardrobeItemId: string,
  result: {
    attributes: Array<{
      key: string;
      values: Array<{ value: string; confidence?: number }>;
    }>;
    suggested_title?: string;
    suggested_notes?: string;
  }
): Promise<{
  success: boolean;
  error: any;
}> {
  try {
    // Import here to avoid circular dependency
    const { createEntityAttributesFromAutoTag } = await import(
      '../attributes'
    );

    // Create entity attributes
    const { errors } = await createEntityAttributesFromAutoTag(
      'wardrobe_item',
      wardrobeItemId,
      result.attributes
    );

    if (errors.length > 0) {
      console.warn('Some attributes failed to create:', errors);
    }

    // Update wardrobe item with suggested fields if provided
    const updates: any = {};
    if (result.suggested_title) {
      updates.title = result.suggested_title;
    }
    if (result.suggested_notes) {
      updates.description = result.suggested_notes;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('wardrobe_items')
        .update(updates)
        .eq('id', wardrobeItemId);

      if (updateError) {
        return { success: false, error: updateError };
      }
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Trigger product_shot job for wardrobe item
 */
export async function triggerProductShot(
  userId: string,
  imageId: string,
  wardrobeItemId: string
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'product_shot', {
    image_id: imageId,
    wardrobe_item_id: wardrobeItemId,
  });
}

/**
 * Get active product_shot job for a wardrobe item
 */
export async function getActiveProductShotJob(
  wardrobeItemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'product_shot', (job) => {
    try {
      const input = job.input as any;
      return input?.wardrobe_item_id === wardrobeItemId;
    } catch {
      return false;
    }
  });
}

/**
 * Get recently completed product_shot job for a wardrobe item
 */
export async function getRecentProductShotJob(
  wardrobeItemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getRecentJob(userId, 'product_shot', (job) => {
    try {
      const input = job.input as any;
      return input?.wardrobe_item_id === wardrobeItemId;
    } catch {
      return false;
    }
  });
}

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
  }
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'headshot_generate', {
    selfie_image_id: selfieImageId,
    prompt_text: promptText,
    output_folder: options?.outputFolder,
    skip_user_settings_update: options?.skipUserSettingsUpdate,
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

/**
 * Trigger batch job for wardrobe item (combines product_shot and auto_tag)
 * This reduces latency by downloading the image once and running both tasks in parallel
 */
export async function triggerBatchJob(
  userId: string,
  imageId: string,
  wardrobeItemId: string,
  imageIds: string[]
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'batch', {
    imageId,
    tasks: ['product_shot', 'auto_tag'],
    wardrobe_item_id: wardrobeItemId,
    image_ids: imageIds,
  });
}

/**
 * Get active batch job for a wardrobe item
 */
export async function getActiveBatchJob(
  wardrobeItemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'batch', (job) => {
    try {
      const input = job.input as any;
      return input?.wardrobe_item_id === wardrobeItemId;
    } catch {
      return false;
    }
  });
}

/**
 * Get recently completed batch job for a wardrobe item
 */
export async function getRecentBatchJob(
  wardrobeItemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getRecentJob(userId, 'batch', (job) => {
    try {
      const input = job.input as any;
      return input?.wardrobe_item_id === wardrobeItemId;
    } catch {
      return false;
    }
  });
}

/**
 * Trigger wardrobe_item_render job (critical path: image only).
 * Use this for add-item flow; trigger wardrobe_item_tag after render succeeds.
 */
export async function triggerWardrobeItemRender(
  userId: string,
  itemId: string,
  sourceImageId: string
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'wardrobe_item_render', {
    item_id: itemId,
    source_image_id: sourceImageId,
  });
}

/**
 * Get active wardrobe_item_render job for an item
 */
export async function getActiveWardrobeItemRenderJob(
  itemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'wardrobe_item_render', (job) =>
    getWardrobeItemIdFromJobInput(job) === itemId
  );
}

/**
 * Get active wardrobe_item_generate job for an item (unified image + text).
 */
export async function getActiveWardrobeItemGenerateJob(
  itemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'wardrobe_item_generate', (job) =>
    getWardrobeItemIdFromJobInput(job) === itemId
  );
}

/**
 * Trigger wardrobe_item_tag job (follow-up: title, description, attributes).
 * Call after wardrobe_item_render succeeds; do not block UI on this.
 */
export async function triggerWardrobeItemTag(
  userId: string,
  itemId: string,
  imageIds: string[]
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'wardrobe_item_tag', {
    item_id: itemId,
    image_ids: imageIds,
  });
}

/**
 * Trigger wardrobe_item_generate job (unified: image + text in parallel).
 * Single job produces both product shot and text (title, description, attributes).
 * Use this for add-item flow; replaces wardrobe_item_render + wardrobe_item_tag.
 */
export async function triggerWardrobeItemGenerate(
  userId: string,
  itemId: string,
  sourceImageId: string
): Promise<QueryResult<AIJob>> {
  return createAIJob(userId, 'wardrobe_item_generate', {
    item_id: itemId,
    source_image_id: sourceImageId,
  });
}

/**
 * Get recently completed wardrobe_item_generate job for an item.
 * Uses 60-second window (getRecentJob); for feedback overlay on reload use getRecentWardrobeItemJobForFeedback (30 days).
 */
export async function getRecentWardrobeItemGenerateJob(
  itemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getRecentJob(userId, 'wardrobe_item_generate', (job) =>
    getWardrobeItemIdFromJobInput(job) === itemId
  );
}

/**
 * Get recently completed wardrobe_item_render job for an item.
 * Uses 60-second window; for feedback overlay on reload use getRecentWardrobeItemJobForFeedback (30 days).
 */
export async function getRecentWardrobeItemRenderJob(
  itemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getRecentJob(userId, 'wardrobe_item_render', (job) =>
    getWardrobeItemIdFromJobInput(job) === itemId
  );
}

/**
 * Get active wardrobe item job (prefer wardrobe_item_generate, then wardrobe_item_render).
 * Use for feedback overlay: when view shows generated image from either job type.
 */
export async function getActiveWardrobeItemJob(
  wardrobeItemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  const { data: generateJob } = await getActiveWardrobeItemGenerateJob(wardrobeItemId, userId);
  if (generateJob) return { data: generateJob, error: null };
  return getActiveWardrobeItemRenderJob(wardrobeItemId, userId);
}

/** 30-day window for "recent succeeded job" when loading view (feedback overlay / feedback_at). */
const RECENT_JOB_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Get the most recent succeeded wardrobe item job (generate or render) for this item.
 * Uses 30-day window; this is the path for reload → compact (feedback overlay).
 * Do not use the 60-second getRecentWardrobeItemGenerateJob/getRecentWardrobeItemRenderJob for feedback on reload.
 */
export async function getRecentWardrobeItemJobForFeedback(
  itemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  try {
    const since = new Date(Date.now() - RECENT_JOB_DAYS_MS).toISOString();
    const { data: generateJobs, error: e1 } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('job_type', 'wardrobe_item_generate')
      .eq('owner_user_id', userId)
      .eq('status', 'succeeded')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (e1) return { data: null, error: e1 };
    const matchGenerate = (generateJobs || []).find(
      (j: AIJob) => getWardrobeItemIdFromJobInput(j) === itemId
    );
    if (matchGenerate) {
      logJobPayloadKeysIfDebug(matchGenerate);
      return { data: matchGenerate, error: null };
    }

    const { data: renderJobs, error: e2 } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('job_type', 'wardrobe_item_render')
      .eq('owner_user_id', userId)
      .eq('status', 'succeeded')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (e2) return { data: null, error: e2 };
    const matchRender = (renderJobs || []).find(
      (j: AIJob) => getWardrobeItemIdFromJobInput(j) === itemId
    );
    if (matchRender) logJobPayloadKeysIfDebug(matchRender);
    return { data: matchRender || null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
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
