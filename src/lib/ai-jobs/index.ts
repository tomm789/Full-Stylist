/**
 * AI Jobs module - exports all AI job-related functions
 * 
 * Usage:
 * import { createAIJob, pollAIJob, triggerAutoTag } from '@/lib/ai-jobs';
 */

// Re-export from core
export {
  type AIJob,
  createAIJob,
  getAIJob,
  getAIJobNoStore,
  isGeminiPolicyBlockError,
  getActiveJob,
  getRecentJob,
  getOutfitRenderItemLimit,
} from './core';

// Re-export from polling
export {
  pollAIJob,
  pollAIJobFixedInterval,
  pollAIJobWithFinalCheck,
  waitForAIJobCompletion,
  resetCircuitBreaker,
  isCircuitBreakerOpen,
} from './polling';

// Re-export from execution
export {
  triggerAIJobExecution,
  createAndTriggerJob,
} from './execution';

// Re-export from types
export {
  triggerAutoTag,
  applyAutoTagResults,
  triggerProductShot,
  getActiveProductShotJob,
  getRecentProductShotJob,
  triggerHeadshotGenerate,
  triggerBodyShotGenerate,
  getActiveOutfitRenderJob,
  getRecentOutfitRenderJob,
  triggerBatchJob,
  getActiveBatchJob,
  getRecentBatchJob,
  triggerWardrobeItemRender,
  getActiveWardrobeItemRenderJob,
  getActiveWardrobeItemGenerateJob,
  getRecentWardrobeItemGenerateJob,
  getRecentWardrobeItemRenderJob,
  getActiveWardrobeItemJob,
  getRecentWardrobeItemJobForFeedback,
  triggerWardrobeItemTag,
  triggerWardrobeItemGenerate,
  getRecentHeadshotJobForImage,
  getRecentBodyshotJobForImage,
} from './types';
