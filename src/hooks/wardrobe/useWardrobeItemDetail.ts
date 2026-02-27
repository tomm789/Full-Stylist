/**
 * useWardrobeItemDetail Hook
 * Load and manage wardrobe item detail data with polling
 */

import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
  getActiveProductShotJob,
  getRecentProductShotJob,
  getActiveBatchJob,
  getRecentBatchJob,
  getActiveWardrobeItemRenderJob,
  getActiveWardrobeItemGenerateJob,
  getAIJob,
  getAIJobNoStore,
  getRecentWardrobeItemJobForFeedback,
  triggerWardrobeItemGenerate,
  triggerAIJobExecution,
} from '@/lib/ai-jobs';
import { getWardrobeItemImages, updateWardrobeItem } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { useWardrobeItemData } from './useWardrobeItemData';
import { useWardrobeItemPolling } from './useWardrobeItemPolling';
import { useWardrobeItemDisplay } from './useWardrobeItemDisplay';
import { usePeriodicRefresh } from './usePeriodicRefresh';
import { getInitialItemData, setInitialItemData, getPendingItemJob, clearPendingItemJob } from '@/lib/wardrobe/initialItemCache';
import { toDataUri } from '@/lib/images/dataUri';
import { checkFeedbackExistsForJob } from '@/lib/ai-feedback';
import { logWardrobeAddTiming } from '@/lib/perf/wardrobeAddTiming';

interface UseWardrobeItemDetailProps {
  itemId: string | undefined;
  userId: string | undefined;
}

interface UseWardrobeItemDetailReturn {
  item: any | null;
  category: any | null;
  allImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  /** Carousel images with active (e.g. generated) image first. */
  displayImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  /** Image id that should be shown first in carousel (uploaded or generated). */
  activeImageId: string | null;
  attributes: any[];
  tags: Array<{ id: string; name: string }>;
  loading: boolean;
  isGeneratingProductShot: boolean;
  /** True when wardrobe_item_generate is in progress (details not yet available). */
  isGeneratingDetails: boolean;
  /** True when generate job failed or timed out; show error + Retry. */
  generationFailed: boolean;
  /** Trigger a new generate job for the same item (retry). */
  retryGeneration: () => Promise<void>;
  refreshImages: () => Promise<void>;
  refreshAttributes: () => Promise<void>;
  // Fast-path cache data
  initialImageDataUri: string | null;
  initialTitle: string | null;
  initialDescription: string | null;
  jobSucceededAt: number | null;
  /** Job that produced the current generated image (for feedback overlay). */
  lastSucceededJobId: string | null;
  /** If set, user has already submitted feedback for this job; show compact thumbs. */
  lastSucceededJobFeedbackAt: string | null;
  /** Job type for feedback RPC (wardrobe_item_generate or wardrobe_item_render). */
  lastSucceededJobType: 'wardrobe_item_generate' | 'wardrobe_item_render' | null;
}

export function useWardrobeItemDetail({
  itemId,
  userId,
}: UseWardrobeItemDetailProps): UseWardrobeItemDetailReturn {
  const [loading, setLoading] = useState(true);
  const [isGeneratingProductShot, setIsGeneratingProductShot] = useState(false);
  const [productShotJobId, setProductShotJobId] = useState<string | null>(null);
  const [autoTagJobId, setAutoTagJobId] = useState<string | null>(null);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [generationFailed, setGenerationFailed] = useState(false);

  // Log "first time generated fields available" once per job
  const didLogGeneratedFieldsRef = useRef(false);

  // Fast-path cache state
  const [initialImageDataUri, setInitialImageDataUri] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState<string | null>(null);
  const [initialDescription, setInitialDescription] = useState<string | null>(null);
  const [jobSucceededAt, setJobSucceededAt] = useState<number | null>(null);
  const [lastSucceededJobId, setLastSucceededJobId] = useState<string | null>(null);
  const [lastSucceededJobFeedbackAt, setLastSucceededJobFeedbackAt] = useState<string | null>(null);
  const [lastSucceededJobType, setLastSucceededJobType] = useState<'wardrobe_item_generate' | 'wardrobe_item_render' | null>(null);

  // Data loading
  const data = useWardrobeItemData({ itemId });

  // Display ordering (active image + reorder)
  const { activeImageId, setActiveImageId, displayImagesOrdered } = useWardrobeItemDisplay(data.displayImages);

  // Periodic refresh (fallback polling for images and attributes)
  const {
    startPeriodicImageRefresh,
    stopPeriodicImageRefresh,
    startPeriodicAttributeRefresh,
    stopPeriodicAttributeRefresh,
    stopPeriodicRefresh,
  } = usePeriodicRefresh(itemId, userId, {
    refreshImages: data.refreshImages,
    refreshAttributes: data.refreshAttributes,
    onImageRefreshTimeout: () => setIsGeneratingProductShot(false),
  });

  // Product shot polling
  const productShotPolling = useWardrobeItemPolling({
    jobId: productShotJobId,
    onComplete: async () => {
      setIsGeneratingProductShot(false);
      await data.refreshImages();
    },
    onError: () => {
      startPeriodicImageRefresh();
    },
    onTimeout: () => {
      startPeriodicImageRefresh();
    },
    timeout: 60000,
    interval: 2000,
    logPrefix: '[ProductShot]',
  });

  // Auto-tag polling
  const autoTagPolling = useWardrobeItemPolling({
    jobId: autoTagJobId,
    onComplete: async () => {
      await data.refreshAttributes();
    },
    onError: () => {
      startPeriodicAttributeRefresh();
    },
    onTimeout: () => {
      startPeriodicAttributeRefresh();
    },
    timeout: 60000,
    interval: 2000,
    logPrefix: '[AutoTag]',
  });

  // Batch job polling (handles both product_shot and auto_tag)
  const batchJobPolling = useWardrobeItemPolling({
    jobId: batchJobId,
    onComplete: async () => {
      setIsGeneratingProductShot(false);
      await data.refreshImages();
      await data.refreshAttributes();
    },
    onError: () => {
      startPeriodicImageRefresh();
      startPeriodicAttributeRefresh();
    },
    onTimeout: () => {
      startPeriodicImageRefresh();
      startPeriodicAttributeRefresh();
    },
    timeout: 90000,
    interval: 2000,
    logPrefix: '[BatchJob]',
  });

  // Wardrobe item render job polling (image-only; used when landing on detail with job in progress)
  const renderJobPolling = useWardrobeItemPolling({
    jobId: renderJobId,
    onComplete: async (job) => {
      setIsGeneratingProductShot(false);
      if (job?.status === 'succeeded') {
        setLastSucceededJobId(job.id);
        setLastSucceededJobFeedbackAt((job as { feedback_at?: string | null }).feedback_at ?? null);
        setLastSucceededJobType('wardrobe_item_render');
      }
      await data.refreshImages();
    },
    onError: () => startPeriodicImageRefresh(),
    onTimeout: () => startPeriodicImageRefresh(),
    timeout: 60000,
    interval: 2000,
    logPrefix: '[WardrobeItemRender]',
  });

  // Refs so effects depend only on jobId (not polling object identity)
  const productShotPollingRef = useRef(productShotPolling);
  const autoTagPollingRef = useRef(autoTagPolling);
  const batchJobPollingRef = useRef(batchJobPolling);
  const renderJobPollingRef = useRef(renderJobPolling);
  productShotPollingRef.current = productShotPolling;
  autoTagPollingRef.current = autoTagPolling;
  batchJobPollingRef.current = batchJobPolling;
  renderJobPollingRef.current = renderJobPolling;

  // Wardrobe item generate job polling (paint as soon as result.base64_result exists, before succeeded)
  const generateJobPolling = useWardrobeItemPolling({
    jobId: generateJobId,
    interval: 800,
    onJobUpdate: (job) => {
      logWardrobeAddTiming('job_status_transition', { status: job.status, jobId: job.id });
      const result = job.result as { base64_result?: string; mime_type?: string; suggested_title?: string; suggested_notes?: string } | undefined;
      if (result?.base64_result && itemId) {
        logWardrobeAddTiming('first_set_initialImageDataUri_from_base64', { jobId: job.id });
        const dataUri = toDataUri(result.base64_result, result.mime_type);
        setInitialImageDataUri(dataUri);
        setJobSucceededAt(Date.now());
        if (result.suggested_title != null) setInitialTitle(result.suggested_title);
        if (result.suggested_notes != null) setInitialDescription(result.suggested_notes);
        if ((result.suggested_title != null || result.suggested_notes != null) && !didLogGeneratedFieldsRef.current) {
          didLogGeneratedFieldsRef.current = true;
          if (__DEV__) {
            console.log('[WardrobeItemGenerate] first time generated fields available', { jobId: job.id, itemId });
          }
        }
      }
    },
    onComplete: async (job) => {
      setIsGeneratingProductShot(false);
      setGenerationFailed(false);
      if (job?.status === 'succeeded') {
        setLastSucceededJobId(job.id);
        setLastSucceededJobFeedbackAt((job as { feedback_at?: string | null }).feedback_at ?? null);
        setLastSucceededJobType('wardrobe_item_generate');
      }
      if (job?.status === 'succeeded' && job?.result && itemId && userId) {
        const result = job.result as { base64_result?: string; mime_type?: string; suggested_title?: string; suggested_notes?: string };
        if (result.suggested_title != null) setInitialTitle(result.suggested_title);
        if (result.suggested_notes != null) setInitialDescription(result.suggested_notes);
        setInitialItemData(
          itemId,
          job.id,
          toDataUri(result.base64_result ?? '', result.mime_type),
          Date.now(),
          undefined,
          result.suggested_title,
          result.suggested_notes
        );
        const title = result.suggested_title ?? data.item?.title ?? '';
        const description = result.suggested_notes ?? data.item?.description ?? '';
        const { error: updateError } = await updateWardrobeItem(itemId, userId, { title, description });
        if (updateError) {
          console.error('[WardrobeItemGenerate] updateWardrobeItem failed', updateError);
        } else if (__DEV__) {
          console.log('[WardrobeItemGenerate] item updated', { itemId, jobId: job.id });
        }
        await data.loadItemData();
        if (__DEV__) {
          console.log('[WardrobeItemGenerate] generation finished', { itemId, jobId: job.id });
        }
      }
      await data.refreshImages();
      logWardrobeAddTiming('refreshImages_completion', { itemId });
      await data.refreshAttributes();
    },
    onError: () => {
      setIsGeneratingProductShot(false);
      setGenerationFailed(true);
      if (__DEV__) console.log('[WardrobeItemGenerate] generation failed', { itemId, jobId: generateJobId });
      startPeriodicImageRefresh();
      startPeriodicAttributeRefresh();
    },
    onTimeout: () => {
      setIsGeneratingProductShot(false);
      setGenerationFailed(true);
      if (__DEV__) console.log('[WardrobeItemGenerate] generation failed (timeout)', { itemId, jobId: generateJobId });
      startPeriodicImageRefresh();
      startPeriodicAttributeRefresh();
    },
    timeout: 90000,
    logPrefix: '[WardrobeItemGenerate]',
  });

  const generateJobPollingRef = useRef(generateJobPolling);
  generateJobPollingRef.current = generateJobPolling;

  const retryGeneration = async () => {
    if (!userId || !itemId) return;
    const sourceImageId = data.allImages?.[0]?.image_id;
    if (!sourceImageId) {
      console.warn('[WardrobeItemGenerate] retry skipped: no source image', { itemId });
      return;
    }
    setGenerationFailed(false);
    didLogGeneratedFieldsRef.current = false;
    const { data: generateJob, error: generateError } = await triggerWardrobeItemGenerate(userId, itemId, sourceImageId);
    if (generateError || !generateJob) {
      console.error('[WardrobeItemGenerate] retry job creation failed', generateError);
      setGenerationFailed(true);
      return;
    }
    if (__DEV__) console.log('[WardrobeItemGenerate] jobId started (retry)', { itemId, jobId: generateJob.id });
    setGenerateJobId(generateJob.id);
    setIsGeneratingProductShot(true);
    const { error: execError } = await triggerAIJobExecution(generateJob.id);
    if (execError) console.warn('[WardrobeItemGenerate] retry trigger error', execError);
  };

  // Start polling when job IDs are set (effects depend only on jobId to avoid restarts)
  useEffect(() => {
    if (productShotJobId) {
      productShotPollingRef.current.startPolling();
    } else {
      productShotPollingRef.current.stopPolling();
    }
    return () => productShotPollingRef.current.stopPolling();
  }, [productShotJobId]);

  useEffect(() => {
    if (autoTagJobId) {
      autoTagPollingRef.current.startPolling();
    } else {
      autoTagPollingRef.current.stopPolling();
    }
    return () => autoTagPollingRef.current.stopPolling();
  }, [autoTagJobId]);

  useEffect(() => {
    if (batchJobId) {
      batchJobPollingRef.current.startPolling();
    } else {
      batchJobPollingRef.current.stopPolling();
    }
    return () => batchJobPollingRef.current.stopPolling();
  }, [batchJobId]);

  useEffect(() => {
    if (renderJobId) {
      renderJobPollingRef.current.startPolling();
    } else {
      renderJobPollingRef.current.stopPolling();
    }
    return () => renderJobPollingRef.current.stopPolling();
  }, [renderJobId]);

  useEffect(() => {
    if (generateJobId) {
      generateJobPollingRef.current.startPolling();
    } else {
      generateJobPollingRef.current.stopPolling();
    }
    return () => generateJobPollingRef.current.stopPolling();
  }, [generateJobId]);

  // Initial data load and job detection (first paint unblocked: pending/cache/skeleton, then load in background)
  useEffect(() => {
    if (!itemId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const pending = getPendingItemJob(itemId);
    if (pending) {
      if (__DEV__) console.log('[WardrobeItemGenerate] jobId started (pending)', { itemId, jobId: pending.jobId });
      setGenerateJobId(pending.jobId);
      clearPendingItemJob(itemId);
      setIsGeneratingProductShot(true);
      // Keep loading true until loadItemData() completes so we have item to render
    }

    const cachedItem = getInitialItemData(itemId);
    if (cachedItem) {
      logWardrobeAddTiming('first_paint_ready_at', { itemId, jobId: cachedItem.jobId });
      setInitialImageDataUri(cachedItem.dataUri);
      setInitialTitle(cachedItem.title || null);
      setInitialDescription(cachedItem.description || null);
      setJobSucceededAt(cachedItem.jobSucceededAt);
      setLastSucceededJobId(cachedItem.jobId);
      setLastSucceededJobType('wardrobe_item_generate');
      getAIJob(cachedItem.jobId).then(({ data: job }) => {
        if (job) {
          const feedbackAt = (job as { feedback_at?: string | null }).feedback_at ?? null;
          setLastSucceededJobFeedbackAt(feedbackAt);
          if (feedbackAt == null) {
            getAIJobNoStore(cachedItem.jobId).then(({ data: refetched }) => {
              const refetchedAt = (refetched as { feedback_at?: string | null })?.feedback_at ?? null;
              if (refetchedAt != null) {
                setLastSucceededJobFeedbackAt(refetchedAt);
              } else {
                checkFeedbackExistsForJob(cachedItem.jobId).then(({ exists, created_at }) => {
                  if (exists) {
                    setLastSucceededJobFeedbackAt(created_at ?? new Date().toISOString());
                  }
                });
              }
            });
          }
        }
      });
      setLoading(false);
    } else if (!pending) {
      setInitialImageDataUri(null);
      setInitialTitle(null);
      setInitialDescription(null);
      setJobSucceededAt(null);
      setLastSucceededJobId(null);
      setLastSucceededJobFeedbackAt(null);
      setLastSucceededJobType(null);
      setLoading(false);
    }

    void data.loadItemData().then(async () => {
      try {
        logWardrobeAddTiming('load_item_data_completion', { itemId });

        let activeBatchJob: { id: string } | null = null;
        if (!pending) {
          const { data: activeGenerateJob } = await getActiveWardrobeItemGenerateJob(itemId, userId);
          const batchRes = await getActiveBatchJob(itemId, userId);
          activeBatchJob = batchRes.data;
          const { data: activeRenderJob } = await getActiveWardrobeItemRenderJob(itemId, userId);

          if (activeGenerateJob) {
            if (__DEV__) console.log('[WardrobeItemGenerate] jobId started (active)', { itemId, jobId: activeGenerateJob.id });
            setIsGeneratingProductShot(true);
            setGenerateJobId(activeGenerateJob.id);
          } else if (activeBatchJob) {
            setIsGeneratingProductShot(true);
            setBatchJobId(activeBatchJob.id);
          } else if (activeRenderJob) {
            setIsGeneratingProductShot(true);
            setRenderJobId(activeRenderJob.id);
          } else {
            const { data: recentBatchJob } = await getRecentBatchJob(itemId, userId);
            if (recentBatchJob && recentBatchJob.status === 'succeeded') {
              await data.refreshImages();
              await data.refreshAttributes();
            } else {
              const itemImages = data.allImages;
              if (itemImages && itemImages.length > 0) {
                const hasProductShot = itemImages.some((img) => img.type === 'product_shot');
                const productShotCreatedAt = itemImages
                  .filter((img) => img.type === 'product_shot' && img.image?.created_at)
                  .map((img) => new Date(img.image.created_at).getTime())
                  .reduce((latest, current) => Math.max(latest, current), 0) || null;
                const { data: activeJob } = await getActiveProductShotJob(itemId, userId);
                if (activeJob) {
                  const activeJobCreatedAt = new Date(activeJob.created_at).getTime();
                  const shouldHandleActiveJob = !productShotCreatedAt || productShotCreatedAt < activeJobCreatedAt;
                  if (shouldHandleActiveJob) {
                    setIsGeneratingProductShot(true);
                    setProductShotJobId(activeJob.id);
                  } else {
                    setIsGeneratingProductShot(false);
                  }
                } else if (!hasProductShot) {
                  const { data: recentJob } = await getRecentProductShotJob(itemId, userId);
                  if (recentJob && recentJob.status === 'succeeded') {
                    await data.refreshImages();
                  } else {
                    setIsGeneratingProductShot(true);
                    startPeriodicImageRefresh();
                  }
                }
              }
            }
          }
        }

        if (!pending) {
          const { data: recentJobForFeedback } = await getRecentWardrobeItemJobForFeedback(itemId, userId);
          if (recentJobForFeedback) {
            const jobId = recentJobForFeedback.id;
            setLastSucceededJobId(jobId);
            const feedbackAt = (recentJobForFeedback as { feedback_at?: string | null }).feedback_at ?? null;
            setLastSucceededJobFeedbackAt(feedbackAt);
            setLastSucceededJobType(recentJobForFeedback.job_type as 'wardrobe_item_generate' | 'wardrobe_item_render');
            if (feedbackAt == null) {
              getAIJobNoStore(jobId).then(({ data: refetched }) => {
                const refetchedAt = (refetched as { feedback_at?: string | null })?.feedback_at ?? null;
                if (refetchedAt != null) {
                  setLastSucceededJobFeedbackAt(refetchedAt);
                } else {
                  checkFeedbackExistsForJob(jobId).then(({ exists, created_at }) => {
                    if (exists) {
                      setLastSucceededJobFeedbackAt(created_at ?? new Date().toISOString());
                    }
                  });
                }
              });
            }
          }
        }

        if (!activeBatchJob && userId) {
          const currentAttributes = data.attributes;
          const currentItem = data.item;
          if (
            (!currentAttributes || currentAttributes.length === 0 || currentItem?.title === 'New Item')
          ) {
            const { data: activeAutoTagJobs } = await supabase
              .from('ai_jobs')
              .select('*')
              .eq('job_type', 'auto_tag')
              .eq('owner_user_id', userId)
              .in('status', ['queued', 'running'])
              .order('created_at', { ascending: false })
              .limit(5);
            if (activeAutoTagJobs) {
              const itemAutoTagJob = activeAutoTagJobs.find((job: any) => {
                try {
                  return (job.input as any)?.wardrobe_item_id === itemId;
                } catch {
                  return false;
                }
              });
              if (itemAutoTagJob) setAutoTagJobId(itemAutoTagJob.id);
              else startPeriodicAttributeRefresh();
            } else startPeriodicAttributeRefresh();
          }
        }
      } catch (error: any) {
        console.error('Failed to load item data:', error);
        Alert.alert('Error', 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      stopPeriodicRefresh();
      productShotPolling.stopPolling();
      autoTagPolling.stopPolling();
      batchJobPolling.stopPolling();
      renderJobPolling.stopPolling();
      generateJobPolling.stopPolling();
    };
  }, [itemId, userId]);

  // Check if product shot exists when images refresh
  useEffect(() => {
    const hasProductShot = data.displayImages.some(
      (img) => img.type === 'product_shot'
    );
    if (hasProductShot && isGeneratingProductShot) {
      setIsGeneratingProductShot(false);
      stopPeriodicImageRefresh();
    }
  }, [data.displayImages, isGeneratingProductShot]);

  return {
    item: data.item,
    category: data.category,
    allImages: data.allImages,
    displayImages: displayImagesOrdered,
    activeImageId,
    attributes: data.attributes,
    tags: data.tags,
    loading,
    isGeneratingProductShot,
    isGeneratingDetails: !!generateJobId && isGeneratingProductShot,
    generationFailed,
    retryGeneration,
    refreshImages: data.refreshImages,
    refreshAttributes: data.refreshAttributes,
    // Fast-path cache data
    initialImageDataUri,
    initialTitle,
    initialDescription,
    jobSucceededAt,
    lastSucceededJobId,
    lastSucceededJobFeedbackAt,
    lastSucceededJobType,
  };
}
