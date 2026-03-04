/**
 * useOutfitView Hook
 * Load and manage outfit view data with polling
 */

import { useState, useEffect, useRef } from 'react';
import { getOutfit, archiveOutfit } from '@/lib/outfits';
import { showErrorToast } from '@/utils/toast';
import { getInitialCoverDataUri } from '@/lib/outfits/initialCoverCache';
import { getWardrobeItemImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import {
  getActiveOutfitRenderJob,
  pollAIJobWithFinalCheck,
} from '@/lib/ai-jobs';
import { startTimeline, continueTimeline, type Timeline } from '@/lib/perf/timeline';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { toDataUri } from '@/lib/images/dataUri';

interface UseOutfitViewProps {
  outfitId: string | undefined;
  userId: string | undefined;
  renderJobIdParam?: string;
  /** When present, timeline marks are logged under this trace (e.g. from editor navigate). */
  renderTraceId?: string;
}

interface UseOutfitViewReturn {
  outfit: any | null;
  coverImage: any | null;
  /** When set, use this data URI for instant render instead of fetching from storage (from job.result.base64_result) */
  coverImageDataUri: string | null;
  outfitItems: any[];
  wardrobeItems: Map<string, any>;
  itemImageUrls: Map<string, string>;
  loading: boolean;
  isGenerating: boolean;
  renderJobId: string | null;
  /** Trace ID for this render (for image load timeline + bounded retry). */
  renderTraceId: string | null;
  /** When set, used for client-only timing log: job succeeded → image_load_end. */
  jobSucceededAt: number | null;
  /** Job that produced the current cover (for feedback overlay). */
  lastSucceededJobId: string | null;
  /** If set, user has already submitted feedback for this job; do not show feedback overlay. */
  lastSucceededJobFeedbackAt: string | null;
  refreshOutfit: () => Promise<void>;
  deleteOutfit: () => Promise<void>;
}

export function useOutfitView({
  outfitId,
  userId,
  renderJobIdParam,
  renderTraceId: renderTraceIdParam,
}: UseOutfitViewProps): UseOutfitViewReturn {
  const [outfit, setOutfit] = useState<any | null>(null);
  const [coverImage, setCoverImage] = useState<any | null>(null);
  const [coverImageDataUri, setCoverImageDataUri] = useState<string | null>(null);
  const [outfitItems, setOutfitItems] = useState<any[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<Map<string, any>>(
    new Map()
  );
  const [itemImageUrls, setItemImageUrls] = useState<Map<string, string>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [jobSucceededAt, setJobSucceededAt] = useState<number | null>(null);
  const [lastSucceededJobId, setLastSucceededJobId] = useState<string | null>(null);
  const [lastSucceededJobFeedbackAt, setLastSucceededJobFeedbackAt] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const pollingTokenRef = useRef(0);
  const renderTraceIdRef = useRef<string | null>(renderTraceIdParam ?? null);

  const refreshOutfit = async () => {
    if (!outfitId) return;

    const { data } = await getOutfit(outfitId);
    if (!mountedRef.current) return;
    if (data) {
      setOutfit(data.outfit);
      setCoverImage(data.coverImage);
      setOutfitItems(data.items);

      if (data.coverImage) {
        setIsGenerating(false);
      }
    }
  };

  const startPollingForOutfitRender = async (
    jobId: string,
    timeline?: Timeline,
    pollingToken?: number
  ) => {
    try {
      timeline?.mark('poll_start');
      const { data: finalJob } = await pollAIJobWithFinalCheck(
        jobId,
        60,
        1500,
        '[OutfitView]',
        'outfit_render'
      );

      if (
        !mountedRef.current ||
        (pollingToken !== undefined && pollingTokenRef.current !== pollingToken)
      ) {
        return;
      }

      if (finalJob && finalJob.status === 'succeeded') {
        const result = finalJob.result || {};
        const resultKeys = result ? Object.keys(result) : [];
        const jobStatusSucceededAt = Date.now();
        timeline?.mark('poll_success', {
          resultKeys,
          resultSize: typeof result === 'object' ? JSON.stringify(result).length : 0,
        });
        timeline?.mark('job_status_succeeded_at', { ts: jobStatusSucceededAt });
                if (__DEV__) {
          console.debug('[outfit_render_timing] job_status_succeeded_at', { ts: jobStatusSucceededAt, outfitId, from: 'view_poll' });
        }

        setRenderJobId(null);
        setIsGenerating(false);
        setJobSucceededAt(jobStatusSucceededAt);
        setLastSucceededJobId(finalJob.id);
        setLastSucceededJobFeedbackAt((finalJob as { feedback_at?: string | null }).feedback_at ?? null);

        // Immediate UI: use base64 or storage URL from job result so image shows before refetch
        if (result.base64_result) {
          const coverSetAt = Date.now();
          setCoverImageDataUri(toDataUri(result.base64_result, result.mime_type));
          timeline?.mark('cover_set_base64_at', { ts: coverSetAt });
                    if (__DEV__) {
            console.debug('[outfit_render_timing] cover_set_base64_at', { ts: coverSetAt, outfitId, from: 'view_poll' });
          }
        } else {
                    if (__DEV__) {
            console.debug('[outfit_render_timing] base64_result missing (view poll)', { outfitId, resultKeys });
          }
          const storageKey =
            result.storage_key ?? result.renders?.[0]?.storage_key;
          if (storageKey) {
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(storageKey);
            setCoverImageDataUri(urlData.publicUrl);
          }
        }
        timeline?.mark('image_set_from_result');

        timeline?.mark('outfit_fetch_start');
        await refreshOutfit();
        if (
          !mountedRef.current ||
          (pollingToken !== undefined && pollingTokenRef.current !== pollingToken)
        ) {
          return;
        }
        timeline?.mark('outfit_fetch_end');
      } else if (finalJob && finalJob.status === 'failed') {
        setRenderJobId(null);
        setIsGenerating(false);
        showErrorToast('Outfit generation failed');
      } else {
        // Polling timed out or job stuck in queued/running — clear generating state
        setRenderJobId(null);
        setIsGenerating(false);
      }
    } catch (error) {
      if (
        !mountedRef.current ||
        (pollingToken !== undefined && pollingTokenRef.current !== pollingToken)
      ) {
        return;
      }
      console.error('Error polling:', error);
      timeline?.mark('poll_error', { error: String(error) });
      setRenderJobId(null);
      setIsGenerating(false);
    }
  };

  const deleteOutfitAction = async () => {
    if (!userId || !outfit) return;

    const { error } = await archiveOutfit(userId, outfit.id);
    if (error) {
      throw error;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingTokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!outfitId || !userId) {
      if (mountedRef.current) {
        setLoading(false);
      }
      return;
    }

    const loadOutfitData = async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      setCoverImageDataUri(null);
      setJobSucceededAt(null);
      setLastSucceededJobId(null);
      setLastSucceededJobFeedbackAt(null);

      if (PERF_MODE) {
                if (__DEV__) {
          console.debug('[outfit_render_timing] perf_mode_enabled', { ts: Date.now(), outfitId, where: 'view', traceId: renderTraceIdParam ?? undefined });
        }
      }

      try {
        // Use cached cover from generation so image shows immediately
        const cached = getInitialCoverDataUri(outfitId);
        if (cached) {
          const coverSetAt = Date.now();
          setCoverImageDataUri(cached.dataUri);
          setJobSucceededAt(cached.jobSucceededAt);
          if (cached.jobId) setLastSucceededJobId(cached.jobId);
          if (cached.feedbackAt !== undefined) setLastSucceededJobFeedbackAt(cached.feedbackAt);
                    if (__DEV__) {
            console.debug('[outfit_render_timing] cover_set_base64_at', { ts: coverSetAt, outfitId, from: 'cache' });
          }
        }

        const { data, error } = await getOutfit(outfitId);
        if (!mountedRef.current) return;
        if (error || !data) {
          showErrorToast('Failed to load outfit');
          return;
        }

        setOutfit(data.outfit);
        setCoverImage(data.coverImage);
        setOutfitItems(data.items);

        // Check for active render jobs
        const { data: activeJob } = await getActiveOutfitRenderJob(
          outfitId,
          userId
        );
        if (!mountedRef.current) return;

        if (activeJob) {
          const coverImageCreatedAt = data.coverImage?.created_at
            ? new Date(data.coverImage.created_at).getTime()
            : null;
          const activeJobCreatedAt = new Date(activeJob.created_at).getTime();
          const shouldHandleActiveJob =
            !coverImageCreatedAt || coverImageCreatedAt < activeJobCreatedAt;

          if (shouldHandleActiveJob) {
            setRenderJobId(activeJob.id);
            setIsGenerating(true);
            const timeline = startTimeline('outfit_view_active_job');
            renderTraceIdRef.current = timeline.traceId;
            const pollingToken = pollingTokenRef.current + 1;
            pollingTokenRef.current = pollingToken;
            void startPollingForOutfitRender(activeJob.id, timeline, pollingToken);
          }
        } else if (renderJobIdParam) {
          setIsGenerating(true);
          setRenderJobId(renderJobIdParam);
          const timeline = renderTraceIdParam
            ? continueTimeline(renderTraceIdParam)
            : startTimeline('outfit_view_poll');
          renderTraceIdRef.current = timeline.traceId;
          const pollingToken = pollingTokenRef.current + 1;
          pollingTokenRef.current = pollingToken;
          void startPollingForOutfitRender(renderJobIdParam, timeline, pollingToken);
        }

        // Load wardrobe items
        if (data.items.length > 0) {
          const wardrobeItemIds = data.items.map(
            (item) => item.wardrobe_item_id
          );

          try {
            const { data: items } = await supabase
              .from('wardrobe_items')
              .select('*')
              .in('id', wardrobeItemIds);
            if (!mountedRef.current) return;

            if (items) {
              const itemsMap = new Map();
              items.forEach((item: any) => {
                itemsMap.set(item.id, item);
              });
              setWardrobeItems(itemsMap);

              // Load images
              const imagePromises = items.map(async (item: any) => {
                const { data: imageData } = await getWardrobeItemImages(
                  item.id
                );
                if (imageData && imageData.length > 0) {
                  const imageRecord = imageData[0].image;
                  if (imageRecord) {
                    const { data: urlData } = supabase.storage
                      .from(imageRecord.storage_bucket || 'media')
                      .getPublicUrl(imageRecord.storage_key);
                    return { itemId: item.id, url: urlData.publicUrl };
                  }
                }
                return { itemId: item.id, url: null };
              });

              const imageResults = await Promise.all(imagePromises);
              if (!mountedRef.current) return;
              const newImageUrls = new Map<string, string>();
              imageResults.forEach(({ itemId, url }) => {
                if (url) {
                  newImageUrls.set(itemId, url);
                }
              });
              setItemImageUrls(newImageUrls);
            }
          } catch (error) {
            console.error('Error loading items:', error);
          }
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.error('Error loading outfit:', error);
        showErrorToast('Failed to load outfit');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void loadOutfitData();

    return () => {
      pollingTokenRef.current += 1;
    };
  }, [outfitId, userId, renderJobIdParam, renderTraceIdParam]);

  return {
    outfit,
    coverImage,
    coverImageDataUri,
    outfitItems,
    wardrobeItems,
    itemImageUrls,
    loading,
    isGenerating,
    renderJobId,
    renderTraceId: renderTraceIdParam ?? renderTraceIdRef.current,
    jobSucceededAt,
    lastSucceededJobId,
    lastSucceededJobFeedbackAt,
    refreshOutfit,
    deleteOutfit: deleteOutfitAction,
  };
}
