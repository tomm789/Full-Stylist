/**
 * useOutfitGeneration Hook
 * Handles outfit creation and AI generation from wardrobe with client-side image stacking.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { saveOutfit } from '@/lib/outfits';
import { setInitialCoverDataUri } from '@/lib/outfits/initialCoverCache';
import {
  runDescriptionMessageDrip,
  type OutfitDescription,
  type GenerationMessage,
} from '@/lib/outfits/outfitDescriptionMessages';
import { getUserSettings } from '@/lib/settings';
import { WardrobeItem, WardrobeCategory } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { startTimeline } from '@/lib/perf/timeline';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { toDataUri } from '@/lib/images/dataUri';
import type { OutfitCanvasLayoutMap, OutfitCanvasTrimMap } from '@/lib/outfits/canvasLayout';
import { generateAndUploadGrid } from '@/lib/outfits/generateAndUploadGrid';
import { useDescriptionPolling } from '@/lib/outfits/useDescriptionPolling';
import { useItemRevealAnimation } from '@/hooks/outfits/useItemRevealAnimation';
import { useOutfitRenderJob } from '@/hooks/outfits/useOutfitRenderJob';
import {
  createOutfitVariation,
  updateOutfitVariation,
  type OutfitVariationSnapshot,
} from '@/lib/outfits/sessions';

interface GenerationProgress {
  phase: 'saving' | 'preparing' | 'stacking' | 'generating' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
}

interface GenerationItem {
  id: string;
  title: string;
  orderIndex: number;
}

/** Optional: use pre-uploaded grid from useBackgroundGridGenerator for 0s latency */
export interface BackgroundGridApi {
  getStoredKeyOrAwaitPending: (selectionKey: string) => Promise<string | null>;
}

interface UseOutfitGenerationOptions {
  userId: string;
  categories: WardrobeCategory[];
  backgroundGrid?: BackgroundGridApi | null;
  /** Session ID for variation tracking. If null, session is not used. */
  sessionId?: string | null;
  /** Called after a variation is created/updated so the session data hook can refresh. */
  onVariationCreated?: () => void;
}

export function useOutfitGeneration({
  userId,
  categories,
  backgroundGrid,
  sessionId = null,
  onVariationCreated,
}: UseOutfitGenerationOptions) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'saving',
    message: '',
    progress: 0,
  });
  const [generatedOutfitId, setGeneratedOutfitId] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPhase, setModalPhase] = useState<'items' | 'analysis' | 'finalizing'>('items');
  const [modalItems, setModalItems] = useState<GenerationItem[]>([]);
  const [activeMessage, setActiveMessage] = useState<GenerationMessage | null>(null);
  const [outfitDescription, setOutfitDescription] = useState<OutfitDescription | null>(null);
  const descriptionDripRef = useRef<{ cancel: () => void } | null>(null);

  const cancelDescriptionDrip = useCallback(() => {
    descriptionDripRef.current?.cancel();
    descriptionDripRef.current = null;
  }, []);

  // ── Shared animation + polling hooks ────────────────────────────────────────
  const revealAnimation = useItemRevealAnimation({ setPhase: setModalPhase });

  const descriptionPolling = useDescriptionPolling({
    onSuccess: (description, messages) => {
      cancelDescriptionDrip();
      setOutfitDescription(description);
      setModalPhase('analysis');
      descriptionDripRef.current = runDescriptionMessageDrip(messages, setActiveMessage, setModalPhase);
    },
  });
  const { runRenderJob } = useOutfitRenderJob();

  const stopAll = useCallback(() => {
    cancelDescriptionDrip();
    revealAnimation.stop();
    descriptionPolling.stop();
  }, [cancelDescriptionDrip, revealAnimation.stop, descriptionPolling.stop]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // ── Main generation flow ─────────────────────────────────────────────────────
  const generateOutfit = useCallback(
    async (
      selectedItems: WardrobeItem[],
      canvasLayoutMap?: OutfitCanvasLayoutMap | null,
      canvasTrimMap?: OutfitCanvasTrimMap | null,
      sessionIdOverride?: string | null
    ): Promise<{ success: boolean; outfitId?: string; error?: string; renderTraceId?: string }> => {
      const effectiveSessionId = sessionIdOverride ?? sessionId;
      if (!userId || selectedItems.length === 0) {
        return { success: false, error: 'No items selected' };
      }

      setGenerating(true);
      setGeneratedOutfitId(null);
      setModalVisible(true);
      setOutfitDescription(null);
      setActiveMessage(null);
      stopAll();

      const timeline = startTimeline('outfit_generation');
      timeline.mark('generate_click');

      // Hoisted so it's accessible in the catch block for failure updates
      let variationId: string | null = null;

      try {
        // Phase 1 + 2: Save outfit and fetch user settings in parallel
        setProgress({ phase: 'saving', message: 'Saving outfit...', progress: 10 });

        const outfitItems = selectedItems.map((item, index) => ({
          category_id: item.category_id || null,
          wardrobe_item_id: item.id,
          position: index,
        }));

        const [saveResult, settingsResult] = await Promise.all([
          saveOutfit(
            userId,
            { title: 'Generated Outfit', notes: 'AI-generated outfit' },
            outfitItems
          ),
          getUserSettings(userId),
        ]);

        const { data: savedData, error: saveError } = saveResult;
        if (saveError || !savedData) {
          throw new Error('Failed to save outfit');
        }

        const outfitId = savedData.outfit.id;
        setGeneratedOutfitId(outfitId);

        if (PERF_MODE) {
                    if (__DEV__) {
            console.debug('[outfit_render_timing] perf_mode_enabled', {
              ts: Date.now(),
              traceId: timeline.traceId,
              outfitId,
              where: 'generation',
            });
          }
        }

        setProgress({ phase: 'preparing', message: 'Preparing generation...', progress: 20 });

        const { data: userSettings } = settingsResult;
        if (!userSettings?.body_shot_image_id) {
          throw new Error('Please upload a body photo in settings before generating outfits');
        }

        // Start item reveal animation (skipped in PERF_MODE to measure UI overhead)
        if (!PERF_MODE) {
          const itemsForModal: GenerationItem[] = selectedItems.map((item, index) => ({
            id: item.id,
            title: item.title || 'Untitled Item',
            orderIndex: index,
          }));
          setModalItems(itemsForModal);
          revealAnimation.start(itemsForModal);
        }

        // Phase 3: Grid image — use pre-uploaded key if available, else generate + upload
        setProgress({
          phase: 'stacking',
          message: `Preparing ${selectedItems.length} items...`,
          progress: 30,
        });

        const selectionKey = selectedItems.map((item) => item.id).join(',');
        let stackedResult: { imageId: string; publicUrl: string; storagePath: string } | null = null;

        if (backgroundGrid) {
          const storedKey = await backgroundGrid.getStoredKeyOrAwaitPending(selectionKey);
          if (storedKey) {
            stackedResult = {
              imageId: storedKey,
              publicUrl: supabase.storage.from('media').getPublicUrl(storedKey).data.publicUrl,
              storagePath: storedKey,
            };
                        if (__DEV__) console.log(`[OutfitGeneration] Using pre-uploaded grid (0s latency): ${storedKey}`);
          }
        }

        if (!stackedResult) {
          try {
                        if (__DEV__) console.log(`[OutfitGeneration] Fetching images for ${selectedItems.length} items`);

            const wardrobeItemIds = selectedItems.map((item) => item.id);
            const { data: imageLinks, error: linksError } = await supabase
              .from('wardrobe_item_images')
              .select(`
                image_id,
                wardrobe_item_id,
                type,
                sort_order,
                images!inner(storage_key)
              `)
              .in('wardrobe_item_id', wardrobeItemIds);

            if (linksError || !imageLinks) {
              throw new Error(`Failed to load item images: ${linksError?.message}`);
            }

            const flattenedLinks = imageLinks.map((link) => ({
              image_id: link.image_id,
              wardrobe_item_id: link.wardrobe_item_id,
              type: link.type,
              sort_order: link.sort_order,
              storage_key: (link.images as any).storage_key,
            }));

            const imagesByItem = new Map<string, typeof flattenedLinks>();
            flattenedLinks.forEach((link) => {
              if (!imagesByItem.has(link.wardrobe_item_id)) {
                imagesByItem.set(link.wardrobe_item_id, []);
              }
              imagesByItem.get(link.wardrobe_item_id)!.push(link);
            });

            const topImages: typeof flattenedLinks = [];
            wardrobeItemIds.forEach((itemId) => {
              const images = imagesByItem.get(itemId);
              if (!images || images.length === 0) return;
              images.sort((a, b) => {
                if (a.type === 'product_shot' && b.type !== 'product_shot') return -1;
                if (b.type === 'product_shot' && a.type !== 'product_shot') return 1;
                return (a.sort_order || 999) - (b.sort_order || 999);
              });
              topImages.push(images[0]);
            });

            if (topImages.length === 0) {
              throw new Error('No images found for selected items');
            }

            setProgress({
              phase: 'stacking',
              message: `Preparing ${topImages.length} images...`,
              progress: 40,
            });

            // Verify session before upload
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.user?.id || session.user.id !== userId) {
              throw new Error('User not authenticated or session mismatch');
            }

            const imageUrls = topImages.map((link) => {
              const { data: urlData } = supabase.storage
                .from('media')
                .getPublicUrl(link.storage_key);
              if (!urlData?.publicUrl) {
                throw new Error(`Failed to get URL for image ${link.image_id}`);
              }
              return urlData.publicUrl;
            });

            setProgress({
              phase: 'stacking',
              message: `Creating grid for ${imageUrls.length} items...`,
              progress: 50,
            });

            const hasCustomLayout = Boolean(
              (canvasLayoutMap && Object.keys(canvasLayoutMap).length > 0) ||
              (canvasTrimMap && Object.keys(canvasTrimMap).length > 0)
            );
            const topImageItemIds = topImages.map((link) => link.wardrobe_item_id);

            timeline.mark('grid_start');
            stackedResult = await generateAndUploadGrid(imageUrls, userId, {
              itemIds: topImageItemIds,
              layoutByItemId: hasCustomLayout ? canvasLayoutMap : null,
            });
            timeline.mark('grid_done');

            if (stackedResult) {
                            if (__DEV__) console.log(`[OutfitGeneration] Grid uploaded successfully: ${stackedResult.storagePath}`);
            }
          } catch (gridError) {
                        if (__DEV__) console.warn(
              '[OutfitGeneration] Client-side grid generation failed; falling back to server stacking',
              gridError
            );
          }
        }

        // Phase 4: Prepare items data for AI job
        setProgress({ phase: 'preparing', message: 'Preparing AI generation...', progress: 70 });

        const hasCustomLayout = Boolean(
          (canvasLayoutMap && Object.keys(canvasLayoutMap).length > 0) ||
          (canvasTrimMap && Object.keys(canvasTrimMap).length > 0)
        );

        const selectedForJob = selectedItems.map((item) => {
          const categoryName = item.category_id
            ? categories.find((c) => c.id === item.category_id)?.name || ''
            : '';
          return {
            category: categoryName,
            category_id: item.category_id || null,
            subcategory_id: item.subcategory_id || null,
            wardrobe_item_id: item.id,
            text_snapshot: {
              title: item.title || '',
              description: item.description || '',
              brand: item.brand || '',
              color_primary: item.color_primary || '',
              category: categoryName,
              category_id: item.category_id || null,
              subcategory_id: item.subcategory_id || null,
            },
          };
        });

        const modelPreference =
          userSettings?.ai_model_outfit_render ||
          userSettings?.ai_model_preference ||
          'gemini-2.5-flash-image';

        // ── Session: create variation record (pending) ─────────────────────────
        if (effectiveSessionId) {
          const snapshot: OutfitVariationSnapshot = {
            items: selectedForJob.map((item, index) => ({
              wardrobe_item_id: item.wardrobe_item_id,
              category_id: item.category_id,
              position: index,
              text_snapshot: item.text_snapshot,
            })),
            canvas_layout: hasCustomLayout ? canvasLayoutMap ?? null : null,
            canvas_trim_map: hasCustomLayout ? canvasTrimMap ?? null : null,
            body_shot_image_id: userSettings.body_shot_image_id,
            model_preference: modelPreference,
            stacked_image_id: stackedResult?.imageId ?? null,
          };

          const variation = await createOutfitVariation({
            session_id: effectiveSessionId,
            user_id: userId,
            outfit_id: outfitId,
            status: 'pending',
            input_snapshot_json: snapshot,
          });
          variationId = variation?.id ?? null;
        }

        // Phase 5: Create and trigger AI job
        setProgress({ phase: 'generating', message: 'Generating outfit image...', progress: 80 });

                if (__DEV__) console.log(
          `[OutfitGeneration] Creating AI job with stacked image ID: ${stackedResult?.imageId || 'none'}`
        );

        let createdJobId: string | null = null;
        const { job: completedJob, base64Result } = await runRenderJob({
          userId,
          jobType: 'outfit_render',
          jobParams: {
            user_id: userId,
            outfit_id: outfitId,
            selected: selectedForJob,
            stacked_image_id: stackedResult?.imageId ?? null,
            body_shot_image_id: userSettings.body_shot_image_id,
            model_preference: modelPreference,
            settings: {
              items_count: selectedItems.length,
              used_client_stacking: !!stackedResult,
              custom_layout_enabled: hasCustomLayout,
              canvas_layout: hasCustomLayout ? canvasLayoutMap : null,
              canvas_trim_map: hasCustomLayout ? canvasTrimMap ?? null : null,
            },
          },
          timeout: 120000,
          interval: 2000,
          logPrefix: '[OutfitGeneration]',
          pollJobType: 'outfit_render',
          onJobCreated: (jobId) => {
            createdJobId = jobId;
            timeline.mark('job_created', { job_id: jobId });
                        if (__DEV__) console.log(`[OutfitGeneration] AI job created: ${jobId}`);
          },
          onJobTriggered: () => {
            timeline.mark('trigger_sent');
            // Start polling for description (skipped in PERF_MODE)
            if (!PERF_MODE) {
              descriptionPolling.start(outfitId);
            }
            // Phase 6: Poll for completion
            setProgress({
              phase: 'generating',
              message: 'AI is working on your outfit...',
              progress: 90,
            });
            timeline.mark('poll_start');
          },
        });

        stopAll();

        if (!completedJob) {
          timeline.mark('poll_timeout');
                    if (__DEV__) console.warn('[OutfitGeneration] AI generation polling timed out, but outfit was saved');
          // Update variation with job ID even on timeout
          if (variationId && createdJobId) {
            await updateOutfitVariation(variationId, { ai_job_id: createdJobId });
          }
          setProgress({
            phase: 'complete',
            message: 'Outfit saved! Image generation in progress...',
            progress: 100,
          });
          setModalVisible(false);
          return { success: true, outfitId, renderTraceId: timeline.traceId };
        }

        if (completedJob.status === 'failed') {
          timeline.mark('poll_failed', { error: completedJob.error });
          if (variationId) {
            await updateOutfitVariation(variationId, {
              ai_job_id: completedJob.id,
              status: 'failed',
            });
            onVariationCreated?.();
          }
          throw new Error(completedJob.error || 'AI generation failed');
        }

        const resultKeys = completedJob.result ? Object.keys(completedJob.result) : [];
        const jobStatusSucceededAt = Date.now();
        timeline.mark('poll_success', { resultKeys });
        timeline.mark('job_status_succeeded_at', { ts: jobStatusSucceededAt });
                if (__DEV__) {
          console.debug('[outfit_render_timing] job_status_succeeded_at', {
            ts: jobStatusSucceededAt,
            traceId: timeline.traceId,
            outfitId,
          });
        }

        const result = completedJob.result || {};
        if (base64Result) {
          const dataUri = toDataUri(base64Result, result.mime_type);
          const coverSetAt = Date.now();
          setInitialCoverDataUri(
            outfitId,
            dataUri,
            jobStatusSucceededAt,
            completedJob.id,
            (completedJob as { feedback_at?: string | null }).feedback_at ?? null
          );
          timeline.mark('cover_set_base64_at', { ts: coverSetAt });
                    if (__DEV__) {
            console.debug('[outfit_render_timing] cover_set_base64_at', {
              ts: coverSetAt,
              traceId: timeline.traceId,
              outfitId,
              from: 'generation',
            });
          }
        } else {
                    if (__DEV__) {
            console.debug('[outfit_render_timing] base64_result missing', {
              traceId: timeline.traceId,
              outfitId,
              resultKeys,
            });
          }
        }

        // ── Session: mark variation complete ────────────────────────────────────
        if (variationId) {
          const resultImageId: string | null =
            result.image_id || result.generated_image_id || result.output_image_id || null;
          await updateOutfitVariation(variationId, {
            ai_job_id: completedJob.id,
            image_id: resultImageId,
            status: 'complete',
          });
          onVariationCreated?.();
        }

                if (__DEV__) console.log('[OutfitGeneration] Generation completed successfully!');
        setProgress({ phase: 'complete', message: 'Outfit generated successfully!', progress: 100 });
        setModalVisible(false);

        return { success: true, outfitId, renderTraceId: timeline.traceId };
      } catch (error: any) {
        console.error('[OutfitGeneration] Error:', error);
        stopAll();
        if (variationId) {
          await updateOutfitVariation(variationId, { status: 'failed' });
          onVariationCreated?.();
        }
        setProgress({ phase: 'error', message: error.message || 'Generation failed', progress: 0 });
        setModalVisible(false);
        return { success: false, error: error.message };
      } finally {
        setGenerating(false);
      }
    },
    [
      userId,
      categories,
      backgroundGrid,
      sessionId,
      onVariationCreated,
      revealAnimation,
      descriptionPolling,
      runRenderJob,
      stopAll,
    ]
  );

  const reset = useCallback(() => {
    stopAll();
    revealAnimation.reset();
    setGenerating(false);
    setProgress({ phase: 'saving', message: '', progress: 0 });
    setGeneratedOutfitId(null);
    setModalVisible(false);
    setModalPhase('items');
    setModalItems([]);
    setActiveMessage(null);
    setOutfitDescription(null);
  }, [stopAll, revealAnimation.reset]);

  return {
    generating,
    progress,
    generatedOutfitId,
    generateOutfit,
    reset,
    // Modal state
    modalVisible,
    modalPhase,
    modalItems,
    revealedItemsCount: revealAnimation.revealedItemsCount,
    completedItemsCount: revealAnimation.completedItemsCount,
    activeMessage,
    outfitDescription,
  };
}

export default useOutfitGeneration;
