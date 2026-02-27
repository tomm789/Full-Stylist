import type { AIJob } from '../core';

/**
 * Defensive: resolve wardrobe item id from job input (item_id or wardrobe_item_id).
 * wardrobe_item_generate and wardrobe_item_render use item_id; product_shot/batch use wardrobe_item_id.
 */
export function getWardrobeItemIdFromJobInput(job: AIJob): string | null {
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
export function getResultImageIdFromJob(job: AIJob): string | null {
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
export function logJobPayloadKeysIfDebug(job: AIJob): void {
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

/** 30-day window for "recent succeeded job" queries. */
export const RECENT_JOB_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
