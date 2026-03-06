import { useState, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { showErrorToast } from '@/utils/toast';
import {
  getActiveBatchJob,
  getRecentBatchJob,
  getActiveProductShotJob,
  getRecentProductShotJob,
  getAIJob,
  getAIJobNoStore,
  getRecentWardrobeItemJobForFeedback,
  getActiveWardrobeItemGenerateJob,
  getActiveWardrobeItemRenderJob,
} from '@/lib/ai-jobs';
import { supabase } from '@/lib/supabase';
import {
  getInitialItemData,
  getPendingItemJob,
  clearPendingItemJob,
} from '@/lib/wardrobe/initialItemCache';
import { checkFeedbackExistsForJob } from '@/lib/ai-feedback';
import { logWardrobeAddTiming } from '@/lib/perf/wardrobeAddTiming';
import { getItemPreview } from '@/lib/wardrobe/itemPreviewCache';
import type { WardrobeItemJobControls } from './useWardrobeItemJobs';

interface UseWardrobeItemCacheProps {
  itemId: string | undefined;
  userId: string | undefined;
  data: {
    item: any;
    allImages: Array<{ id: string; image_id: string; type: string; image: any }>;
    attributes: any[];
    setItem: (item: any) => void;
    setAllImages: (images: Array<{ id: string; image_id: string; type: string; image: any }>) => void;
    setAttributes: (attributes: any[]) => void;
    loadItemData: () => Promise<void>;
    refreshImages: () => Promise<void>;
    refreshAttributes: () => Promise<void>;
  };
  periodic: {
    startPeriodicImageRefresh: () => void;
    startPeriodicAttributeRefresh: () => void;
    stopPeriodicRefresh: () => void;
  };
  jobControlsRef: MutableRefObject<WardrobeItemJobControls | null>;
}

export interface WardrobeItemCacheState {
  loading: boolean;
  dataLoading: boolean;
  initialImageDataUri: string | null;
  initialTitle: string | null;
  initialDescription: string | null;
  jobSucceededAt: number | null;
  lastSucceededJobId: string | null;
  lastSucceededJobFeedbackAt: string | null;
  lastSucceededJobType: 'wardrobe_item_generate' | 'wardrobe_item_render' | null;
  setInitialImageDataUri: (value: string | null) => void;
  setInitialTitle: (value: string | null) => void;
  setInitialDescription: (value: string | null) => void;
  setJobSucceededAt: (value: number | null) => void;
  setLastSucceededJobId: (value: string | null) => void;
  setLastSucceededJobFeedbackAt: (value: string | null) => void;
  setLastSucceededJobType: (value: 'wardrobe_item_generate' | 'wardrobe_item_render' | null) => void;
}

export function useWardrobeItemCache({
  itemId,
  userId,
  data,
  periodic,
  jobControlsRef,
}: UseWardrobeItemCacheProps): WardrobeItemCacheState {
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [initialImageDataUri, setInitialImageDataUri] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState<string | null>(null);
  const [initialDescription, setInitialDescription] = useState<string | null>(null);
  const [jobSucceededAt, setJobSucceededAt] = useState<number | null>(null);
  const [lastSucceededJobId, setLastSucceededJobId] = useState<string | null>(null);
  const [lastSucceededJobFeedbackAt, setLastSucceededJobFeedbackAt] = useState<string | null>(null);
  const [lastSucceededJobType, setLastSucceededJobType] =
    useState<'wardrobe_item_generate' | 'wardrobe_item_render' | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!itemId || !userId) {
      setLoading(false);
      setDataLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setDataLoading(true);

    const pending = getPendingItemJob(itemId);
    if (pending) {
      if (__DEV__) {
        console.log('[WardrobeItemGenerate] jobId started (pending)', {
          itemId,
          jobId: pending.jobId,
        });
      }
      jobControlsRef.current?.setGenerateJobId(pending.jobId);
      clearPendingItemJob(itemId);
      jobControlsRef.current?.setIsGeneratingProductShot(true);
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
        if (cancelled || !job) return;
        const feedbackAt = (job as { feedback_at?: string | null }).feedback_at ?? null;
        setLastSucceededJobFeedbackAt(feedbackAt);
        if (feedbackAt == null) {
          getAIJobNoStore(cachedItem.jobId).then(({ data: refetched }) => {
            if (cancelled) return;
            const refetchedAt =
              (refetched as { feedback_at?: string | null })?.feedback_at ?? null;
            if (refetchedAt != null) {
              setLastSucceededJobFeedbackAt(refetchedAt);
            } else {
              checkFeedbackExistsForJob(cachedItem.jobId).then(({ exists, created_at }) => {
                if (cancelled) return;
                if (exists) {
                  setLastSucceededJobFeedbackAt(created_at ?? new Date().toISOString());
                }
              });
            }
          });
        }
      });

      if (!cancelled) {
        setLoading(false);
        setDataLoading(false);
      }
    } else if (!pending) {
      // No generation cache — check for grid preview data (item + cover image)
      const preview = getItemPreview(itemId);
      if (!cancelled && preview) {
        data.setItem(preview.item);
        if (preview.imageUrl) {
          setInitialImageDataUri(preview.imageUrl);
        }
        setLoading(false);
        setDataLoading(false);
        // loadItemData() still runs below to fetch full data (images, attrs, tags)
      } else if (!cancelled) {
        // No cache, no preview, no pending job — clear initial state
        // Keep loading=true until loadItemData().then() completes
        setInitialImageDataUri(null);
        setInitialTitle(null);
        setInitialDescription(null);
        setJobSucceededAt(null);
        setLastSucceededJobId(null);
        setLastSucceededJobFeedbackAt(null);
        setLastSucceededJobType(null);
      }
    }

    void data.loadItemData().then(async () => {
      if (cancelled) return;
      // Item data is now renderable — clear dataLoading before job checks
      setDataLoading(false);

      try {
        logWardrobeAddTiming('load_item_data_completion', { itemId });

        let activeBatchJob: { id: string } | null = null;
        if (!pending) {
          // Run all 3 job checks in parallel — they only need itemId + userId
          const [generateJobResult, batchJobResult, renderJobResult] = await Promise.all([
            getActiveWardrobeItemGenerateJob(itemId, userId),
            getActiveBatchJob(itemId, userId),
            getActiveWardrobeItemRenderJob(itemId, userId),
          ]);
          if (cancelled) return;

          const activeGenerateJob = generateJobResult.data;
          activeBatchJob = batchJobResult.data;
          const activeRenderJob = renderJobResult.data;

          if (activeGenerateJob) {
            if (__DEV__) {
              console.log('[WardrobeItemGenerate] jobId started (active)', {
                itemId,
                jobId: activeGenerateJob.id,
              });
            }
            jobControlsRef.current?.setIsGeneratingProductShot(true);
            jobControlsRef.current?.setGenerateJobId(activeGenerateJob.id);
          } else if (activeBatchJob) {
            jobControlsRef.current?.setIsGeneratingProductShot(true);
            jobControlsRef.current?.setBatchJobId(activeBatchJob.id);
          } else if (activeRenderJob) {
            jobControlsRef.current?.setIsGeneratingProductShot(true);
            jobControlsRef.current?.setRenderJobId(activeRenderJob.id);
          } else {
            const { data: recentBatchJob } = await getRecentBatchJob(itemId, userId);
            if (cancelled) return;

            if (recentBatchJob && recentBatchJob.status === 'succeeded') {
              await data.refreshImages();
              if (cancelled) return;
              await data.refreshAttributes();
              if (cancelled) return;
            } else {
              const itemImages = data.allImages;
              if (itemImages && itemImages.length > 0) {
                const hasProductShot = itemImages.some((img) => img.type === 'product_shot');
                const productShotCreatedAt =
                  itemImages
                    .filter((img) => img.type === 'product_shot' && img.image?.created_at)
                    .map((img) => new Date(img.image.created_at).getTime())
                    .reduce((latest, current) => Math.max(latest, current), 0) || null;

                const { data: activeJob } = await getActiveProductShotJob(itemId, userId);
                if (cancelled) return;

                if (activeJob) {
                  const activeJobCreatedAt = new Date(activeJob.created_at).getTime();
                  const shouldHandleActiveJob =
                    !productShotCreatedAt || productShotCreatedAt < activeJobCreatedAt;

                  if (shouldHandleActiveJob) {
                    jobControlsRef.current?.setIsGeneratingProductShot(true);
                    jobControlsRef.current?.setProductShotJobId(activeJob.id);
                  } else {
                    jobControlsRef.current?.setIsGeneratingProductShot(false);
                  }
                } else if (!hasProductShot) {
                  const { data: recentJob } = await getRecentProductShotJob(itemId, userId);
                  if (cancelled) return;

                  if (recentJob && recentJob.status === 'succeeded') {
                    await data.refreshImages();
                    if (cancelled) return;
                  } else {
                    jobControlsRef.current?.setIsGeneratingProductShot(true);
                    periodic.startPeriodicImageRefresh();
                  }
                }
              }
            }
          }
        }

        if (!pending) {
          const { data: recentJobForFeedback } = await getRecentWardrobeItemJobForFeedback(itemId, userId);
          if (cancelled) return;

          if (recentJobForFeedback) {
            const jobId = recentJobForFeedback.id;
            setLastSucceededJobId(jobId);

            const feedbackAt =
              (recentJobForFeedback as { feedback_at?: string | null }).feedback_at ?? null;
            setLastSucceededJobFeedbackAt(feedbackAt);
            setLastSucceededJobType(
              recentJobForFeedback.job_type as 'wardrobe_item_generate' | 'wardrobe_item_render'
            );

            if (feedbackAt == null) {
              getAIJobNoStore(jobId).then(({ data: refetched }) => {
                if (cancelled) return;
                const refetchedAt =
                  (refetched as { feedback_at?: string | null })?.feedback_at ?? null;
                if (refetchedAt != null) {
                  setLastSucceededJobFeedbackAt(refetchedAt);
                } else {
                  checkFeedbackExistsForJob(jobId).then(({ exists, created_at }) => {
                    if (cancelled) return;
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
          if (!currentAttributes || currentAttributes.length === 0 || currentItem?.title === 'New Item') {
            const { data: activeAutoTagJobs } = await supabase
              .from('ai_jobs')
              .select('*')
              .eq('job_type', 'auto_tag')
              .eq('owner_user_id', userId)
              .in('status', ['queued', 'running'])
              .order('created_at', { ascending: false })
              .limit(5);

            if (cancelled) return;

            if (activeAutoTagJobs) {
              const itemAutoTagJob = activeAutoTagJobs.find((job: any) => {
                try {
                  return (job.input as any)?.wardrobe_item_id === itemId;
                } catch {
                  return false;
                }
              });

              if (itemAutoTagJob) {
                jobControlsRef.current?.setAutoTagJobId(itemAutoTagJob.id);
              } else {
                periodic.startPeriodicAttributeRefresh();
              }
            } else {
              periodic.startPeriodicAttributeRefresh();
            }
          }
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error('Failed to load item data:', error);
        showErrorToast('Failed to load item details');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      periodic.stopPeriodicRefresh();
      jobControlsRef.current?.stopAllPolling();
    };
  }, [itemId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loading,
    dataLoading,
    initialImageDataUri,
    initialTitle,
    initialDescription,
    jobSucceededAt,
    lastSucceededJobId,
    lastSucceededJobFeedbackAt,
    lastSucceededJobType,
    setInitialImageDataUri,
    setInitialTitle,
    setInitialDescription,
    setJobSucceededAt,
    setLastSucceededJobId,
    setLastSucceededJobFeedbackAt,
    setLastSucceededJobType,
  };
}
