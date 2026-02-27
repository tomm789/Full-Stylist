/**
 * AI job type-specific triggers and queries.
 * Split by domain; this file re-exports everything for backward compatibility.
 */

// Wardrobe item jobs (auto_tag, product_shot, batch, render, generate)
export {
  triggerAutoTag,
  applyAutoTagResults,
  triggerProductShot,
  getActiveProductShotJob,
  getRecentProductShotJob,
  triggerBatchJob,
  getActiveBatchJob,
  getRecentBatchJob,
  triggerWardrobeItemRender,
  getActiveWardrobeItemRenderJob,
  getActiveWardrobeItemGenerateJob,
  triggerWardrobeItemTag,
  triggerWardrobeItemGenerate,
  getRecentWardrobeItemGenerateJob,
  getRecentWardrobeItemRenderJob,
  getActiveWardrobeItemJob,
  getRecentWardrobeItemJobForFeedback,
} from './types/wardrobeItem';

// Headshot + body shot generation and feedback
export {
  triggerHeadshotGenerate,
  triggerHeadshotGenerateWithPrompt,
  triggerBodyShotGenerate,
  triggerBodyShotGenerateFromSelfies,
  getActiveHeadshotJob,
  getRecentHeadshotJobForImage,
  getActiveBodyshotJob,
  getRecentBodyshotJobForImage,
} from './types/headshot';

// Outfit render
export {
  getActiveOutfitRenderJob,
  getRecentOutfitRenderJob,
} from './types/outfit';
