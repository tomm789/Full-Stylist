/**
 * submitWardrobeImage
 * Standalone function to upload an image, create a wardrobe item,
 * and trigger AI generation — used by the camera flow to skip add.tsx.
 */

import { createWardrobeItem } from './items';
import { setPendingItemJob } from './initialItemCache';
import {
  triggerWardrobeItemGenerate,
  triggerAIJobExecution,
} from '@/lib/ai-jobs';

interface SubmitResult {
  itemId: string;
  jobId: string;
}

export async function submitWardrobeImage(
  userId: string,
  wardrobeId: string,
  imageUri: string,
): Promise<SubmitResult> {
  const image = {
    uri: imageUri,
    type: 'image/jpeg',
    name: `photo-${Date.now()}.jpg`,
  };

  // Upload image + create wardrobe item record
  const { data, error } = await createWardrobeItem(
    userId,
    wardrobeId,
    {
      title: 'New Item',
      visibility_override: 'inherit',
    },
    [image],
  );

  if (error || !data?.item || !data?.images?.length) {
    throw new Error(error?.message || 'Failed to create wardrobe item');
  }

  const itemId = data.item.id;
  const sourceImageId = data.images[0].image_id;

  // Trigger AI generation (product shot + text in parallel)
  const { data: generateJob, error: generateError } = await triggerWardrobeItemGenerate(
    userId,
    itemId,
    sourceImageId,
  );

  if (generateError || !generateJob) {
    throw new Error(generateError?.message || 'Failed to start AI generation');
  }

  // Fire job execution (non-blocking, may return warning)
  await triggerAIJobExecution(generateJob.id).catch(() => {});

  // Cache the job mapping so the item detail page can poll for results
  setPendingItemJob(itemId, generateJob.id);

  return { itemId, jobId: generateJob.id };
}
