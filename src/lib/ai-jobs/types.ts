import { supabase } from '../supabase';
import { createAIJob, getActiveJob, getRecentJob } from './core';
import type { AIJob } from './core';
import type { QueryResult } from '../utils/supabase-helpers';

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
  return getActiveJob(userId, 'wardrobe_item_render', (job) => {
    try {
      const input = job.input as any;
      return input?.item_id === itemId;
    } catch {
      return false;
    }
  });
}

/**
 * Get active wardrobe_item_generate job for an item (unified image + text).
 */
export async function getActiveWardrobeItemGenerateJob(
  itemId: string,
  userId: string
): Promise<QueryResult<AIJob>> {
  return getActiveJob(userId, 'wardrobe_item_generate', (job) => {
    try {
      const input = job.input as any;
      return input?.item_id === itemId;
    } catch {
      return false;
    }
  });
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
