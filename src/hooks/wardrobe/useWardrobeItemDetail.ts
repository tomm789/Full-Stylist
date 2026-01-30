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
} from '@/lib/ai-jobs';
import { getWardrobeItemImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { useWardrobeItemData } from './useWardrobeItemData';
import { useWardrobeItemPolling } from './useWardrobeItemPolling';
import { getInitialItemData } from '@/lib/wardrobe/initialItemCache';

interface UseWardrobeItemDetailProps {
  itemId: string | undefined;
  userId: string | undefined;
}

interface UseWardrobeItemDetailReturn {
  item: any | null;
  category: any | null;
  allImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  displayImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  attributes: any[];
  tags: Array<{ id: string; name: string }>;
  loading: boolean;
  isGeneratingProductShot: boolean;
  refreshImages: () => Promise<void>;
  refreshAttributes: () => Promise<void>;
  // Fast-path cache data
  initialImageDataUri: string | null;
  initialTitle: string | null;
  initialDescription: string | null;
  jobSucceededAt: number | null;
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

  // Fast-path cache state
  const [initialImageDataUri, setInitialImageDataUri] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState<string | null>(null);
  const [initialDescription, setInitialDescription] = useState<string | null>(null);
  const [jobSucceededAt, setJobSucceededAt] = useState<number | null>(null);

  // Data loading
  const data = useWardrobeItemData({ itemId });

  // Periodic refresh refs
  const periodicImageRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const periodicImageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicAttributeRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const periodicAttributeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start periodic image refresh (fallback when no job)
  const startPeriodicImageRefresh = () => {
    if (periodicImageRefreshRef.current) {
      clearInterval(periodicImageRefreshRef.current);
    }
    if (periodicImageTimeoutRef.current) {
      clearTimeout(periodicImageTimeoutRef.current);
    }

    periodicImageRefreshRef.current = setInterval(async () => {
      if (!itemId) return;
      await data.refreshImages();
    }, 3000);

    periodicImageTimeoutRef.current = setTimeout(() => {
      if (periodicImageRefreshRef.current) {
        clearInterval(periodicImageRefreshRef.current);
        periodicImageRefreshRef.current = null;
      }
      setIsGeneratingProductShot(false);
    }, 90000);
  };

  const stopPeriodicImageRefresh = () => {
    if (periodicImageRefreshRef.current) {
      clearInterval(periodicImageRefreshRef.current);
      periodicImageRefreshRef.current = null;
    }
    if (periodicImageTimeoutRef.current) {
      clearTimeout(periodicImageTimeoutRef.current);
      periodicImageTimeoutRef.current = null;
    }
  };

  // Start periodic attribute refresh (fallback when no job)
  const startPeriodicAttributeRefresh = () => {
    if (periodicAttributeRefreshRef.current) {
      clearInterval(periodicAttributeRefreshRef.current);
    }
    if (periodicAttributeTimeoutRef.current) {
      clearTimeout(periodicAttributeTimeoutRef.current);
    }

    periodicAttributeRefreshRef.current = setInterval(async () => {
      await data.refreshAttributes();
    }, 5000);

    periodicAttributeTimeoutRef.current = setTimeout(() => {
      if (periodicAttributeRefreshRef.current) {
        clearInterval(periodicAttributeRefreshRef.current);
        periodicAttributeRefreshRef.current = null;
      }
    }, 120000);
  };

  const stopPeriodicAttributeRefresh = () => {
    if (periodicAttributeRefreshRef.current) {
      clearInterval(periodicAttributeRefreshRef.current);
      periodicAttributeRefreshRef.current = null;
    }
    if (periodicAttributeTimeoutRef.current) {
      clearTimeout(periodicAttributeTimeoutRef.current);
      periodicAttributeTimeoutRef.current = null;
    }
  };

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
    onComplete: async () => {
      setIsGeneratingProductShot(false);
      await data.refreshImages();
    },
    onError: () => startPeriodicImageRefresh(),
    onTimeout: () => startPeriodicImageRefresh(),
    timeout: 60000,
    interval: 2000,
    logPrefix: '[WardrobeItemRender]',
  });

  // Start polling when job IDs are set
  useEffect(() => {
    if (productShotJobId) {
      productShotPolling.startPolling();
    } else {
      productShotPolling.stopPolling();
    }
  }, [productShotJobId, productShotPolling]);

  useEffect(() => {
    if (autoTagJobId) {
      autoTagPolling.startPolling();
    } else {
      autoTagPolling.stopPolling();
    }
  }, [autoTagJobId, autoTagPolling]);

  useEffect(() => {
    if (batchJobId) {
      batchJobPolling.startPolling();
    } else {
      batchJobPolling.stopPolling();
    }
  }, [batchJobId, batchJobPolling]);

  useEffect(() => {
    if (renderJobId) {
      renderJobPolling.startPolling();
    } else {
      renderJobPolling.stopPolling();
    }
  }, [renderJobId, renderJobPolling]);

  // Initial data load and job detection
  useEffect(() => {
    if (!itemId || !userId) {
      setLoading(false);
      return;
    }

    const loadItemData = async () => {
      setLoading(true);

      try {
        // Check for fast-path cache entry before loading data
        // Only consume if it matches navigation context (itemId + optional jobId/traceId)
        const cachedItem = getInitialItemData(itemId);
        
        if (cachedItem) {
          // Cache hit - set initial values for fast-path rendering
          const firstPaintReadyAt = Date.now();
          setInitialImageDataUri(cachedItem.dataUri);
          setInitialTitle(cachedItem.title || null);
          setInitialDescription(cachedItem.description || null);
          setJobSucceededAt(cachedItem.jobSucceededAt);
          
          console.debug('[wardrobe_item_render_timing] first_paint_ready_at', {
            ts: firstPaintReadyAt,
            itemId,
            jobId: cachedItem.jobId,
            traceId: cachedItem.traceId,
            msSinceJobSucceeded: firstPaintReadyAt - cachedItem.jobSucceededAt,
          });
        } else {
          // Cache miss - clear any stale initial values
          setInitialImageDataUri(null);
          setInitialTitle(null);
          setInitialDescription(null);
          setJobSucceededAt(null);
        }
        
        // Load full data in parallel (doesn't block first paint)
        const loadItemDataStart = Date.now();
        console.debug('[wardrobe_item_render_timing] load_item_data_start', {
          ts: loadItemDataStart,
          itemId,
          hasCache: !!cachedItem,
        });
        
        await data.loadItemData();
        
        const loadItemDataEnd = Date.now();
        console.debug('[wardrobe_item_render_timing] load_item_data_end', {
          ts: loadItemDataEnd,
          itemId,
          duration: loadItemDataEnd - loadItemDataStart,
        });
        
        // After loadItemData completes, merge initial values if they exist
        // (API data takes precedence, but initial values were already shown for first paint)
        if (cachedItem && cachedItem.title && !data.item?.title) {
          // If API didn't return title yet, keep initial title
          // (data.setItem will be called by loadItemData, so we don't need to update here)
        }

        // Check for batch job first (backward compatibility)
        const { data: activeBatchJob } = await getActiveBatchJob(itemId, userId);
        const { data: activeRenderJob } = await getActiveWardrobeItemRenderJob(itemId, userId);

        if (activeBatchJob) {
          setIsGeneratingProductShot(true);
          setBatchJobId(activeBatchJob.id);
        } else if (activeRenderJob) {
          setIsGeneratingProductShot(true);
          setRenderJobId(activeRenderJob.id);
        } else {
          // No active batch job - check for recent batch job
          const { data: recentBatchJob } = await getRecentBatchJob(itemId, userId);
          
          if (recentBatchJob && recentBatchJob.status === 'succeeded') {
            // Recent batch job completed - refresh data
            await data.refreshImages();
            await data.refreshAttributes();
          } else {
            // No batch job found - fall back to checking individual jobs (legacy support)
            const itemImages = data.allImages;

            if (itemImages && itemImages.length > 0) {
              const hasProductShot = itemImages.some(
                (img) => img.type === 'product_shot'
              );
              const productShotCreatedAt = itemImages
                .filter(
                  (img) => img.type === 'product_shot' && img.image?.created_at
                )
                .map((img) => new Date(img.image.created_at).getTime())
                .reduce((latest, current) => Math.max(latest, current), 0) || null;

              const { data: activeJob } = await getActiveProductShotJob(
                itemId,
                userId
              );

              if (activeJob) {
                const activeJobCreatedAt = new Date(activeJob.created_at).getTime();
                const shouldHandleActiveJob =
                  !productShotCreatedAt ||
                  productShotCreatedAt < activeJobCreatedAt;

                if (shouldHandleActiveJob) {
                  setIsGeneratingProductShot(true);
                  setProductShotJobId(activeJob.id);
                } else {
                  setIsGeneratingProductShot(false);
                }
              } else if (!hasProductShot) {
                const { data: recentJob } = await getRecentProductShotJob(
                  itemId,
                  userId
                );

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

        // Check for auto-tag job (only if no batch job is active)
        if (!activeBatchJob) {
          const currentAttributes = data.attributes;
          const currentItem = data.item;
          if (
            (!currentAttributes || currentAttributes.length === 0 || currentItem?.title === 'New Item') &&
            userId
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
                  const input = job.input as any;
                  return input?.wardrobe_item_id === itemId;
                } catch {
                  return false;
                }
              });

              if (itemAutoTagJob) {
                setAutoTagJobId(itemAutoTagJob.id);
              } else {
                startPeriodicAttributeRefresh();
              }
            } else {
              startPeriodicAttributeRefresh();
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to load item data:', error);
        Alert.alert('Error', 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    loadItemData();

    return () => {
      stopPeriodicImageRefresh();
      stopPeriodicAttributeRefresh();
      productShotPolling.stopPolling();
      autoTagPolling.stopPolling();
      batchJobPolling.stopPolling();
      renderJobPolling.stopPolling();
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
    displayImages: data.displayImages,
    attributes: data.attributes,
    tags: data.tags,
    loading,
    isGeneratingProductShot,
    refreshImages: data.refreshImages,
    refreshAttributes: data.refreshAttributes,
    // Fast-path cache data
    initialImageDataUri,
    initialTitle,
    initialDescription,
    jobSucceededAt,
  };
}
