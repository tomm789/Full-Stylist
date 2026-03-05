/**
 * useAddWardrobeItem Hook
 * Form state and handlers for adding a new wardrobe item
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { showErrorToast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWardrobe } from './useWardrobe';
import { useAIJobPolling } from '@/hooks/ai';
import { useAddWardrobeImages } from './useAddWardrobeImages';
import { createWardrobeItem } from '@/lib/wardrobe';
import {
  triggerWardrobeItemGenerate,
  triggerAIJobExecution,
} from '@/lib/ai-jobs';
import { setInitialItemData, setPendingItemJob } from '@/lib/wardrobe/initialItemCache';
import { toDataUri } from '@/lib/images/dataUri';
import { startTimeline, isPerfLogsEnabled } from '@/lib/perf/timeline';
import { logWardrobeAddTiming } from '@/lib/perf/wardrobeAddTiming';
import { GENERATION_MESSAGES } from '@/constants/generationMessages';

interface SelectedImage {
  uri: string;
  type: string;
  name: string;
}

interface UseAddWardrobeItemReturn {
  // Images
  selectedImages: SelectedImage[];
  setSelectedImages: (images: SelectedImage[]) => void;
  handleTakePhoto: () => Promise<void>;
  handleUploadPhoto: () => Promise<void>;
  addImageFromUri: (uri: string) => Promise<void>;
  removeImage: (index: number) => void;

  // Cropper
  cropperVisible: boolean;
  cropperImageUri: string | null;
  handleCropperCancel: () => void;
  handleCropperDone: (blob: Blob, fileName: string) => void;

  // Submission
  loading: boolean;
  generatingAI: boolean;
  analysisStep: string;
  aiError: string | null;
  handleSubmit: () => Promise<void>;

  // Wardrobe
  wardrobeId: string | null;
  wardrobeLoading: boolean;
}

export function useAddWardrobeItem(): UseAddWardrobeItemReturn {
  const router = useRouter();
  const { user } = useAuth();
  const { wardrobeId, loading: wardrobeLoading } = useWardrobe(user?.id);

  // Image selection & cropping (delegated to sub-hook)
  const {
    selectedImages,
    setSelectedImages,
    handleTakePhoto,
    handleUploadPhoto,
    removeImage,
    addImageFromUri,
    cropperVisible,
    cropperImageUri,
    handleCropperCancel,
    handleCropperDone,
  } = useAddWardrobeImages();

  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Store image ids for tagging follow-up when render succeeds (non-blocking)
  const pendingImageIdsRef = useRef<string[]>([]);
  const timelineRef = useRef<ReturnType<typeof startTimeline> | null>(null);
  const completionTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const scheduleCompletionTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = setTimeout(() => {
      completionTimeoutsRef.current = completionTimeoutsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delayMs);
    completionTimeoutsRef.current.push(timeoutId);
  }, []);

  const onComplete = useCallback(
    (job: import('@/lib/ai-jobs').AIJob) => {
      logWardrobeAddTiming('job_status_transition', { status: job.status, jobId: job.id, jobType: job.job_type });
      if (job.status === 'succeeded' && pendingItemId) {
        const jobStatusSucceededAt = Date.now();
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
                    if (__DEV__) {
            console.debug('[wardrobe_item_render_timing] job_status_succeeded_at', {
              ts: jobStatusSucceededAt,
              jobId: job.id,
              jobType: job.job_type,
              itemId: pendingItemId,
            });
          }
        }

        // Primary path: wardrobe_item_generate (navigation already done; cache update for back-navigation)
        if (job.job_type === 'wardrobe_item_generate') {
          const result = job.result as { base64_result?: string; mime_type?: string; suggested_title?: string; suggested_notes?: string } | undefined;
          const base64Result = result?.base64_result;
          let dataUri: string | null = null;
          if (base64Result) {
            dataUri = toDataUri(base64Result, result?.mime_type);
          }
          if (isPerfLogsEnabled()) timelineRef.current?.mark('poll_success', { resultKeys: result ? Object.keys(result) : [] });
          if (dataUri) {
            if (isPerfLogsEnabled()) timelineRef.current?.mark('image_set_from_result');
            setInitialItemData(
              pendingItemId,
              job.id,
              dataUri,
              jobStatusSucceededAt,
              timelineRef.current?.traceId,
              result?.suggested_title,
              result?.suggested_notes
            );
          }
          // Defer overlay dismissal until MIN_DURATION_MS has elapsed
          const elapsed = Date.now() - (generationStartRef.current || 0);
          const remaining = GENERATION_MESSAGES.wardrobeItem.MIN_DURATION_MS - elapsed;
          if (remaining <= 0) {
            setAnalysisStep(GENERATION_MESSAGES.wardrobeItem.productShotComplete);
            setGeneratingAI(false);
          } else {
            scheduleCompletionTimeout(() => {
              setAnalysisStep(GENERATION_MESSAGES.wardrobeItem.productShotComplete);
              setGeneratingAI(false);
            }, remaining);
          }
          return;
        }

        // Backward compatibility: batch job results
        if (job.job_type === 'batch') {
          // Extract product_shot result from batch job
          const batchResult = job.result;
          const productShotResult = batchResult?.product_shot;
          const autoTagResult = batchResult?.auto_tag;

          // Log for debugging
                    if (__DEV__) console.log('[BatchJob] Job completed:', {
            hasProductShot: !!productShotResult,
            hasAutoTag: !!autoTagResult,
            productShotResult,
            autoTagResult,
            fullResult: batchResult,
          });

          // Check if product_shot succeeded
          // Success is indicated by having image_id and storage_key, or by not having an error field
          const productShotSucceeded = productShotResult &&
            !productShotResult.error &&
            (productShotResult.image_id || productShotResult.storage_key);

          if (productShotSucceeded) {
            // Product shot succeeded - populate fast-path cache
            const base64Result = productShotResult.base64_result;
            if (base64Result) {
              const dataUri = toDataUri(base64Result, productShotResult.mime_type);

              // Extract title and description from auto_tag result
              const title = autoTagResult?.suggested_title;
              const description = autoTagResult?.suggested_notes;

              // Populate cache for fast-path rendering
              const cacheSetAt = Date.now();
              setInitialItemData(
                pendingItemId,
                job.id,
                dataUri,
                jobStatusSucceededAt,
                undefined, // traceId - not available in add flow
                title,
                description
              );
                            if (__DEV__) {
                console.debug('[wardrobe_item_render_timing] cache_set_at', {
                  ts: cacheSetAt,
                  itemId: pendingItemId,
                  jobId: job.id,
                  hasTitle: !!title,
                  hasDescription: !!description,
                });
              }
            } else {
                            if (__DEV__) {
                console.debug('[wardrobe_item_render_timing] base64_result missing', {
                  itemId: pendingItemId,
                  jobId: job.id,
                  resultKeys: productShotResult ? Object.keys(productShotResult) : [],
                });
              }
            }

            // Product shot succeeded - defer until MIN_DURATION_MS elapsed
            const batchElapsed = Date.now() - (generationStartRef.current || 0);
            const batchRemaining = Math.max(GENERATION_MESSAGES.wardrobeItem.MIN_DURATION_MS - batchElapsed, 800);
            setAnalysisStep(GENERATION_MESSAGES.wardrobeItem.productShotOnly);
            scheduleCompletionTimeout(() => {
              setGeneratingAI(false);
              router.replace(`/wardrobe/item/${pendingItemId}?refresh=${Date.now()}`);
            }, batchRemaining);
          } else if (productShotResult?.error) {
            // Product shot failed
            setAiError(`Product shot generation failed: ${productShotResult.error}`);
            setGeneratingAI(false);
          } else {
            // No product shot result or unexpected structure
                        if (__DEV__) console.warn('[BatchJob] No valid product_shot result found in batch job', {
              batchResult,
              productShotResult,
            });
            // Still redirect - defer until MIN_DURATION_MS elapsed
            const noResultElapsed = Date.now() - (generationStartRef.current || 0);
            const noResultRemaining = Math.max(GENERATION_MESSAGES.wardrobeItem.MIN_DURATION_MS - noResultElapsed, 800);
            scheduleCompletionTimeout(() => {
              setGeneratingAI(false);
              router.replace(`/wardrobe/item/${pendingItemId}`);
            }, noResultRemaining);
          }
        } else {
          // Legacy: product_shot or other job types - defer until MIN_DURATION_MS elapsed
          const legacyElapsed = Date.now() - (generationStartRef.current || 0);
          const legacyRemaining = Math.max(GENERATION_MESSAGES.wardrobeItem.MIN_DURATION_MS - legacyElapsed, 800);
          scheduleCompletionTimeout(() => {
            setGeneratingAI(false);
            router.replace(`/wardrobe/item/${pendingItemId}`);
          }, legacyRemaining);
        }
      } else if (job.status === 'failed') {
        if (job.job_type === 'wardrobe_item_generate') {
          setAiError('Sorry, the item failed to add to your wardrobe.');
          return;
        }
        if (job.job_type === 'batch' && job.result) {
          const batchResult = job.result;
          const productShotResult = batchResult?.product_shot;
          if (productShotResult && !productShotResult.error) {
            setAnalysisStep(GENERATION_MESSAGES.wardrobeItem.productShotPartial);
            const partialElapsed = Date.now() - (generationStartRef.current || 0);
            const partialRemaining = Math.max(GENERATION_MESSAGES.wardrobeItem.MIN_DURATION_MS - partialElapsed, 800);
            scheduleCompletionTimeout(() => {
              setGeneratingAI(false);
              router.replace(`/wardrobe/item/${pendingItemId}`);
            }, partialRemaining);
          } else {
            setAiError('Sorry, the item failed to add to your wardrobe.');
          }
        } else {
          setAiError('Sorry, the item failed to add to your wardrobe.');
        }
      }
    },
    [pendingItemId, user?.id, router, scheduleCompletionTimeout]
  );

  const { job: aiJob } = useAIJobPolling({
    jobId: aiJobId,
    enabled: !!aiJobId && generatingAI,
    onComplete,
    onError: () => {
      setAiError('Sorry, the item failed to add to your wardrobe.');
    },
  });

  // Timer-based message rotation: cycle through progress steps equally spaced over MIN_DURATION_MS
  const generationStartRef = useRef<number>(0);
  useEffect(() => {
    if (!generatingAI) {
      generationStartRef.current = 0;
      return;
    }

    generationStartRef.current = Date.now();
    const steps = GENERATION_MESSAGES.wardrobeItem.progressSteps;
    const interval = GENERATION_MESSAGES.wardrobeItem.MIN_DURATION_MS / steps.length;
    let stepIndex = 0;

    setAnalysisStep(steps[0]);

    const timer = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < steps.length) {
        setAnalysisStep(steps[stepIndex]);
      } else {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [generatingAI]);

  useEffect(() => {
    return () => {
      completionTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      completionTimeoutsRef.current = [];
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !wardrobeId) {
      showErrorToast('Please sign in to add items');
      return;
    }

    if (selectedImages.length === 0) {
      showErrorToast('Please select at least one image');
      return;
    }

    setLoading(true);
    setAiError(null);
    logWardrobeAddTiming('add_button_pressed');

    if (isPerfLogsEnabled()) {
      timelineRef.current = startTimeline('wardrobe_add');
      timelineRef.current.mark('add_item_click');
    }

    try {
      if (isPerfLogsEnabled()) timelineRef.current?.mark('upload_start');
      logWardrobeAddTiming('create_job_request_start');
      // Create item with placeholder title
      const { data, error } = await createWardrobeItem(
        user.id,
        wardrobeId,
        {
          title: 'New Item',
          description: undefined,
          category_id: undefined,
          subcategory_id: undefined,
          visibility_override: 'inherit',
        },
        selectedImages
      );

      if (error) {
        showErrorToast(error.message || 'Failed to create item');
        setLoading(false);
        return;
      }

      if (data?.item && data?.images && data.images.length > 0) {
        if (isPerfLogsEnabled()) timelineRef.current?.mark('upload_end');
        const itemId = data.item.id;
        const imageIds = data.images.map((img: any) => img.image_id);
        const sourceImageId = imageIds[0];

        if (__DEV__) {
          console.log('[WardrobeItemAdd] itemId created', { itemId });
        }

        setPendingItemId(itemId);
        pendingImageIdsRef.current = imageIds;
        setGeneratingAI(true);
        setAnalysisStep(GENERATION_MESSAGES.wardrobeItem.preparing);

        // Unified path: wardrobe_item_generate (image + text in parallel)
        const { data: generateJob, error: generateError } = await triggerWardrobeItemGenerate(
          user.id,
          itemId,
          sourceImageId
        );

        if (generateError || !generateJob) {
          console.error('[useAddWardrobeItem] Generate job creation failed:', generateError);
          throw new Error(generateError?.message || 'Failed to create generate job');
        }

        if (__DEV__) {
          console.log('[WardrobeItemAdd] jobId started', { itemId, jobId: generateJob.id });
        }

        logWardrobeAddTiming('create_job_response_received', { job_id: generateJob.id, item_id: itemId });
        if (isPerfLogsEnabled()) {
          timelineRef.current?.mark('job_created', { jobId: generateJob.id });
          timelineRef.current?.mark('poll_start');
        }
        setAiJobId(generateJob.id);

        const { error: execError } = await triggerAIJobExecution(generateJob.id);
        if (execError) {
                    if (__DEV__) console.warn('[useAddWardrobeItem] Job trigger returned error (may still work):', execError);
        }

        setPendingItemJob(itemId, generateJob.id);
        logWardrobeAddTiming('navigation_start', { item_id: itemId, job_id: generateJob.id });
        router.replace(`/wardrobe/item/${itemId}?refresh=${Date.now()}`);
        logWardrobeAddTiming('navigation_dispatched');
      }
    } catch (error: any) {
      showErrorToast(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, wardrobeId, selectedImages, router]);

  return {
    // Images
    selectedImages,
    setSelectedImages,
    handleTakePhoto,
    handleUploadPhoto,
    addImageFromUri,
    removeImage,

    // Cropper
    cropperVisible,
    cropperImageUri,
    handleCropperCancel,
    handleCropperDone,

    // Submission
    loading,
    generatingAI,
    analysisStep,
    aiError,
    handleSubmit,

    // Wardrobe
    wardrobeId,
    wardrobeLoading,
  };
}
