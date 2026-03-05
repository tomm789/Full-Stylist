/**
 * useRenderPipeline Hook
 * Orchestrates outfit image generation with session/variation tracking.
 * After generation completes, stays on the editor page and updates the
 * session thumbnail strip instead of navigating away.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { WardrobeItem } from '@/lib/wardrobe';
import { showErrorToast } from '@/utils/toast';
import { setInitialCoverDataUri } from '@/lib/outfits/initialCoverCache';
import { toDataUri } from '@/lib/images/dataUri';
import { runDescriptionMessageDrip } from '@/lib/outfits/outfitDescriptionMessages';
import { getUserSettings } from '@/lib/settings';
import { startTimeline } from '@/lib/perf/timeline';
import { generateAndUploadGrid } from '@/lib/outfits/generateAndUploadGrid';
import { useDescriptionPolling } from './useDescriptionPolling';
import { useItemRevealAnimation } from '@/hooks/outfits/useItemRevealAnimation';
import { useOutfitRenderJob } from '@/hooks/outfits/useOutfitRenderJob';
import {
  createOutfitVariation,
  updateOutfitVariation,
} from '@/lib/outfits/sessions';

interface UseRenderPipelineProps {
  user: { id: string } | null;
  categories: Array<{ id: string; name: string }>;
  outfitItems: Map<string, WardrobeItem>;
  itemImageUrls: Map<string, string>;
  notes: string;
  saveOutfit: () => Promise<string | null>;
  router: { push: (path: string) => void };
  onDescriptionReady?: () => void;
  // Session integration
  ensureSession: () => Promise<string | null>;
  refreshVariations: () => Promise<void>;
  selectLatest: () => void;
}

export interface UseRenderPipelineReturn {
  rendering: boolean;
  generationPhase: 'items' | 'analysis' | 'finalizing';
  revealedItemsCount: number;
  completedItemsCount: number;
  activeMessage: any;
  handleRender: () => Promise<void>;
}

export function useRenderPipeline({
  user,
  categories,
  outfitItems,
  itemImageUrls,
  notes,
  saveOutfit,
  router: _router,
  onDescriptionReady,
  ensureSession,
  refreshVariations,
  selectLatest,
}: UseRenderPipelineProps): UseRenderPipelineReturn {
  const [rendering, setRendering] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<'items' | 'analysis' | 'finalizing'>(
    'items'
  );
  const [activeMessage, setActiveMessage] = useState<any>(null);
  const descriptionDripRef = useRef<{ cancel: () => void } | null>(null);

  const cancelDescriptionDrip = useCallback(() => {
    descriptionDripRef.current?.cancel();
    descriptionDripRef.current = null;
  }, []);

  const revealAnimation = useItemRevealAnimation({ setPhase: setGenerationPhase });

  const descriptionPolling = useDescriptionPolling({
    onSuccess: (_description, messages) => {
      cancelDescriptionDrip();
      setGenerationPhase('analysis');
      descriptionDripRef.current = runDescriptionMessageDrip(
        messages,
        setActiveMessage,
        setGenerationPhase
      );
      onDescriptionReady?.();
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

  const handleRender = useCallback(async () => {
    if (!user || outfitItems.size === 0) {
      showErrorToast('Please add items to the outfit before rendering');
      return;
    }

    setRendering(true);
    setGenerationPhase('items');
    setActiveMessage(null);

    let variationId: string | null = null;

    try {
      const savedOutfitId = await saveOutfit();
      if (!savedOutfitId) {
        showErrorToast('Failed to save outfit before rendering');
        setRendering(false);
        return;
      }

      // Ensure session exists for variation tracking
      const sessionId = await ensureSession();

      let stackedImageId: string | null = null;
      const itemsToStack = Array.from(outfitItems.values());
      const imageUrls: string[] = [];
      let missingUrl = false;

      for (const item of itemsToStack) {
        const url = itemImageUrls.get(item.id);
        if (!url) {
          missingUrl = true;
          break;
        }
        imageUrls.push(url);
      }

      if (!missingUrl && imageUrls.length > 0) {
        const gridResult = await generateAndUploadGrid(imageUrls, user.id);
        stackedImageId = gridResult?.storagePath ?? null;
        if (stackedImageId && __DEV__) {
          console.log(`[OutfitEditor] Grid uploaded successfully: ${stackedImageId}`);
        }
      }

      const selected = Array.from(outfitItems.entries()).map(([categoryId, item]) => {
        const categoryName = categoryId
          ? categories.find((c) => c.id === categoryId)?.name || ''
          : '';
        return {
          category: categoryName,
          category_id: categoryId || null,
          subcategory_id: item.subcategory_id || null,
          wardrobe_item_id: item.id,
          text_snapshot: {
            title: item.title || '',
            description: item.description || '',
            brand: item.brand || '',
            color_primary: item.color_primary || '',
            category: categoryName,
            category_id: categoryId || null,
            subcategory_id: item.subcategory_id || null,
          },
        };
      });

      const { data: userSettings } = await getUserSettings(user.id);
      if (!userSettings?.body_shot_image_id) {
        showErrorToast('Please upload a body photo before generating outfits.');
        setRendering(false);
        return;
      }

      const modelPreference =
        userSettings?.ai_model_outfit_render ||
        userSettings?.ai_model_preference ||
        'gemini-2.5-flash-image';

      // Create pending variation record
      if (sessionId) {
        const snapshotItems = selected.map((s, i) => ({
          wardrobe_item_id: s.wardrobe_item_id,
          category_id: s.category_id,
          position: i,
          text_snapshot: s.text_snapshot as Record<string, unknown>,
        }));
        const variation = await createOutfitVariation({
          session_id: sessionId,
          user_id: user.id,
          outfit_id: savedOutfitId,
          status: 'pending',
          input_snapshot_json: {
            items: snapshotItems,
            canvas_layout: null,
            canvas_trim_map: null,
            body_shot_image_id: userSettings.body_shot_image_id,
            model_preference: modelPreference,
            stacked_image_id: stackedImageId,
          },
        });
        variationId = variation?.id ?? null;
        // Refresh so the pending thumbnail shows in the strip
        await refreshVariations();
      }

      const timeline = startTimeline('outfit_render_editor');
      timeline.mark('generate_press');

      const editorItems = Array.from(outfitItems.values()).map((item, index) => ({
        id: item.id,
        title: item.title || `Item ${index + 1}`,
        orderIndex: index,
      }));

      const { job: completedJob, base64Result } = await runRenderJob({
        userId: user.id,
        jobType: 'outfit_render',
        jobParams: {
          user_id: user.id,
          outfit_id: savedOutfitId,
          stacked_image_id: stackedImageId,
          selected,
          prompt: notes.trim() || undefined,
          body_shot_image_id: userSettings.body_shot_image_id,
          model_preference: modelPreference,
        },
        timeout: 120000,
        interval: 2000,
        logPrefix: '[OutfitEditor]',
        pollJobType: 'outfit_render',
        onJobCreated: (jobId) => {
          timeline.mark('job_created', { job_id: jobId });
        },
        onJobTriggered: () => {
          timeline.mark('execution_triggered');
          stopAll();
          revealAnimation.start(editorItems);
          descriptionPolling.start(savedOutfitId);
          timeline.mark('poll_start');
        },
      });

      stopAll();

      if (!completedJob) {
        timeline.mark('poll_timeout');
        // Update variation to failed on timeout
        if (variationId) {
          await updateOutfitVariation(variationId, { status: 'failed' });
          await refreshVariations();
        }
        setRendering(false);
        return;
      }

      if (completedJob.status === 'failed') {
        showErrorToast(completedJob.error ?? 'Outfit generation failed');
        if (variationId) {
          await updateOutfitVariation(variationId, { status: 'failed' });
          await refreshVariations();
        }
        setRendering(false);
        return;
      }

      const result = completedJob.result ?? {};
      const jobStatusSucceededAt = Date.now();
      timeline.mark('job_status_succeeded_at', { ts: jobStatusSucceededAt });

      const generatedImageId =
        result.image_id ?? result.generated_image_id ?? result.output_image_id ?? null;

      if (base64Result) {
        const dataUri = toDataUri(base64Result, result.mime_type);
        setInitialCoverDataUri(
          savedOutfitId,
          dataUri,
          jobStatusSucceededAt,
          completedJob.id,
          (completedJob as { feedback_at?: string | null }).feedback_at ?? null
        );
      }

      // Update variation to complete with the generated image
      if (variationId) {
        await updateOutfitVariation(variationId, {
          ai_job_id: completedJob.id,
          image_id: generatedImageId,
          status: 'complete',
        });
        await refreshVariations();
        selectLatest();
      }

      setRendering(false);
      timeline.mark('generation_complete');
    } catch (error: any) {
      console.error('Render error:', error);
      stopAll();
      if (variationId) {
        await updateOutfitVariation(variationId, { status: 'failed' }).catch(() => {});
        await refreshVariations().catch(() => {});
      }
      showErrorToast(error.message || 'An unexpected error occurred');
      setRendering(false);
    }
  }, [
    user,
    outfitItems,
    itemImageUrls,
    categories,
    notes,
    saveOutfit,
    runRenderJob,
    revealAnimation,
    descriptionPolling,
    stopAll,
    ensureSession,
    refreshVariations,
    selectLatest,
  ]);

  return {
    rendering,
    generationPhase,
    revealedItemsCount: revealAnimation.revealedItemsCount,
    completedItemsCount: revealAnimation.completedItemsCount,
    activeMessage,
    handleRender,
  };
}
