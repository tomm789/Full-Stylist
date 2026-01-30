/**
 * useOutfitGeneration Hook
 * Handles outfit creation and AI generation from wardrobe with client-side image stacking
 * NOW WITH REAL-TIME DESCRIPTION POLLING
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { saveOutfit } from '@/lib/outfits';
import { setInitialCoverDataUri } from '@/lib/outfits/initialCoverCache';
import {
  outfitDescriptionToGenerationMessages,
  runDescriptionMessageDrip,
  type OutfitDescription,
  type GenerationMessage,
} from '@/lib/outfits/outfitDescriptionMessages';
import { createAndTriggerJob, pollAIJobWithFinalCheck } from '@/lib/ai-jobs';
import { getUserSettings } from '@/lib/settings';
import { WardrobeItem, WardrobeCategory } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { generateClothingGrid } from '@/utils/clothing-grid';
import { startTimeline } from '@/lib/perf/timeline';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { toDataUri } from '@/lib/images/dataUri';

const DESCRIPTION_POLL_MAX_MS = 30_000;

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
}

export function useOutfitGeneration({ userId, categories, backgroundGrid }: UseOutfitGenerationOptions) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'saving',
    message: '',
    progress: 0,
  });
  const [generatedOutfitId, setGeneratedOutfitId] = useState<string | null>(null);

  // NEW: Modal-specific state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPhase, setModalPhase] = useState<'items' | 'analysis' | 'finalizing'>('items');
  const [modalItems, setModalItems] = useState<GenerationItem[]>([]);
  const [revealedItemsCount, setRevealedItemsCount] = useState(-1);
  const [completedItemsCount, setCompletedItemsCount] = useState(-1);
  const [activeMessage, setActiveMessage] = useState<GenerationMessage | null>(null);
  const [outfitDescription, setOutfitDescription] = useState<OutfitDescription | null>(null);

  // Polling interval refs
  const descriptionPollingInterval = useRef<NodeJS.Timeout | null>(null);
  const itemRevealInterval = useRef<NodeJS.Timeout | null>(null);
  const descriptionPollingStartedAtRef = useRef<number | null>(null);
  const descriptionPollingOutfitIdRef = useRef<string | null>(null);

  const clearAllIntervals = useCallback(() => {
    if (descriptionPollingInterval.current) {
      clearInterval(descriptionPollingInterval.current);
      descriptionPollingInterval.current = null;
      const outfitId = descriptionPollingOutfitIdRef.current;
      descriptionPollingStartedAtRef.current = null;
      descriptionPollingOutfitIdRef.current = null;
      if (outfitId) {
        console.debug('[outfit_render_timing] description_poll_stopped', { outfitId, reason: 'cleanup' });
      }
    }
    if (itemRevealInterval.current) {
      clearInterval(itemRevealInterval.current);
      itemRevealInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAllIntervals();
  }, [clearAllIntervals]);

  // NEW: Animate item checking
  const startItemRevealAnimation = useCallback((items: GenerationItem[]) => {
    setModalItems(items);
    setRevealedItemsCount(-1);
    setCompletedItemsCount(-1);
    setModalPhase('items');

    let currentRevealed = -1;
    let currentCompleted = -1;

    itemRevealInterval.current = setInterval(() => {
      if (currentRevealed < items.length - 1) {
        currentRevealed++;
        setRevealedItemsCount(currentRevealed);

        // Mark previous item as completed
        if (currentRevealed > 0) {
          currentCompleted = currentRevealed - 1;
          setCompletedItemsCount(currentCompleted);
        }
      } else {
        // All items revealed, mark last one as completed
        currentCompleted = items.length - 1;
        setCompletedItemsCount(currentCompleted);

        // Transition to analysis phase
        setTimeout(() => {
          setModalPhase('analysis');
        }, 500);

        if (itemRevealInterval.current) {
          clearInterval(itemRevealInterval.current);
          itemRevealInterval.current = null;
        }
      }
    }, 500); // Reveal one item every 500ms
  }, []);

  // Poll for outfit description from backend (Supabase only). Max 30s; stop on success or timeout.
  const startDescriptionPolling = useCallback((outfitId: string) => {
    if (descriptionPollingInterval.current != null) {
      return;
    }

    descriptionPollingStartedAtRef.current = Date.now();
    descriptionPollingOutfitIdRef.current = outfitId;
    console.debug('[outfit_render_timing] description_poll_started', { outfitId });

    descriptionPollingInterval.current = setInterval(async () => {
      const started = descriptionPollingStartedAtRef.current;
      const elapsed = started != null ? Date.now() - started : 0;
      if (elapsed >= DESCRIPTION_POLL_MAX_MS) {
        if (descriptionPollingInterval.current) {
          clearInterval(descriptionPollingInterval.current);
          descriptionPollingInterval.current = null;
        }
        descriptionPollingStartedAtRef.current = null;
        descriptionPollingOutfitIdRef.current = null;
        console.debug('[outfit_render_timing] description_poll_timeout', { outfitId, elapsedMs: elapsed });
        return;
      }

      try {
        const { data: outfitData } = await supabase
          .from('outfits')
          .select('description, occasions, style_tags, season, description_generated_at')
          .eq('id', outfitId)
          .maybeSingle();

        if (outfitData?.description_generated_at) {
          if (descriptionPollingInterval.current) {
            clearInterval(descriptionPollingInterval.current);
            descriptionPollingInterval.current = null;
          }
          descriptionPollingStartedAtRef.current = null;
          descriptionPollingOutfitIdRef.current = null;
          console.debug('[outfit_render_timing] description_poll_stopped', { outfitId, reason: 'success' });

          const description: OutfitDescription = {
            description: outfitData.description ?? '',
            occasions: outfitData.occasions ?? [],
            styleTags: outfitData.style_tags ?? [],
            season: outfitData.season ?? 'all-season',
          };

          setOutfitDescription(description);
          setModalPhase('analysis');
          const messages = outfitDescriptionToGenerationMessages(description);
          runDescriptionMessageDrip(messages, setActiveMessage, setModalPhase);
        }
      } catch (error) {
        console.error('[OutfitGeneration] Description polling error:', error);
      }
    }, 500);
  }, []);

  const generateOutfit = useCallback(
    async (selectedItems: WardrobeItem[]): Promise<{ success: boolean; outfitId?: string; error?: string; renderTraceId?: string }> => {
      if (!userId || selectedItems.length === 0) {
        return { success: false, error: 'No items selected' };
      }

      setGenerating(true);
      setGeneratedOutfitId(null);
      setModalVisible(true); // Show modal
      setOutfitDescription(null);
      setActiveMessage(null);
      clearAllIntervals();

      const timeline = startTimeline('outfit_generation');
      timeline.mark('generate_click');

      try {
        // Phase 1: Save outfit
        setProgress({
          phase: 'saving',
          message: 'Saving outfit...',
          progress: 10,
        });

        // Build outfit items with category mapping
        const outfitItems = selectedItems.map((item, index) => ({
          category_id: item.category_id || null,
          wardrobe_item_id: item.id,
          position: index,
        }));

        const { data: savedData, error: saveError } = await saveOutfit(
          userId,
          {
            title: 'Generated Outfit',
            notes: 'AI-generated outfit',
          },
          outfitItems
        );

        if (saveError || !savedData) {
          throw new Error('Failed to save outfit');
        }

        const outfitId = savedData.outfit.id;
        setGeneratedOutfitId(outfitId);

        if (PERF_MODE) {
          console.debug('[outfit_render_timing] perf_mode_enabled', { ts: Date.now(), traceId: timeline.traceId, outfitId, where: 'generation' });
        }

        // Phase 2: Get user settings
        setProgress({
          phase: 'preparing',
          message: 'Preparing generation...',
          progress: 20,
        });

        const { data: userSettings } = await getUserSettings(userId);
        if (!userSettings?.body_shot_image_id) {
          throw new Error('Please upload a body photo in settings before generating outfits');
        }

        // NEW: Start item reveal animation (skipped in PERF_MODE to measure UI overhead)
        if (!PERF_MODE) {
          const itemsForModal: GenerationItem[] = selectedItems.map((item, index) => ({
            id: item.id,
            title: item.title || 'Untitled Item',
            orderIndex: index,
          }));
          startItemRevealAnimation(itemsForModal);
        }

        // Phase 3: Grid image — use pre-uploaded key if available (0s), else generate + upload
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
            console.log(`[OutfitGeneration] Using pre-uploaded grid (0s latency): ${storedKey}`);
          }
        }

        if (!stackedResult) {
          console.log(`[OutfitGeneration] Fetching images for ${selectedItems.length} items`);

          // Get image links for all selected items
          const wardrobeItemIds = selectedItems.map(item => item.id);
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

          // Flatten the nested images data structure
          const flattenedLinks = imageLinks.map(link => ({
            image_id: link.image_id,
            wardrobe_item_id: link.wardrobe_item_id,
            type: link.type,
            sort_order: link.sort_order,
            storage_key: (link.images as any).storage_key
          }));

          // Get the top image for each item (prioritize product shots)
          const imagesByItem = new Map<string, typeof flattenedLinks>();
          flattenedLinks.forEach(link => {
            if (!imagesByItem.has(link.wardrobe_item_id)) {
              imagesByItem.set(link.wardrobe_item_id, []);
            }
            imagesByItem.get(link.wardrobe_item_id)!.push(link);
          });

          const topImages: typeof flattenedLinks = [];
          wardrobeItemIds.forEach(itemId => {
            const images = imagesByItem.get(itemId);
            if (!images || images.length === 0) return;

            // Sort: product shots first, then by sort_order
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

          console.log(`[OutfitGeneration] Getting image URLs for ${topImages.length} images`);

          // Get public URLs for all images
          const imageUrls = topImages.map((link) => {
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(link.storage_key);

            if (!urlData?.publicUrl) {
              throw new Error(`Failed to get URL for image ${link.image_id}`);
            }

            return urlData.publicUrl;
          });

          console.log(`[OutfitGeneration] Got ${imageUrls.length} image URLs`);

          // Generate grid using the new grid function
          setProgress({
            phase: 'stacking',
            message: `Creating grid for ${imageUrls.length} items...`,
            progress: 50,
          });

          console.log(`[OutfitGeneration] Starting grid generation...`);
          timeline.mark('grid_start');

          const gridBase64 = await generateClothingGrid(imageUrls);
          timeline.mark('grid_done');
          console.log(`[OutfitGeneration] Grid generated successfully, base64 length: ${gridBase64.length}`);

          // Convert base64 to Blob and upload to storage
          setProgress({
            phase: 'stacking',
            message: `Uploading grid image...`,
            progress: 60,
          });

          // Verify user session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session?.user?.id || session.user.id !== userId) {
            throw new Error('User not authenticated or session mismatch');
          }

          // Convert base64 to Blob
          const byteCharacters = atob(gridBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const gridBlob = new Blob([byteArray], { type: 'image/jpeg' });

          // Upload to Supabase storage
          const timestamp = Date.now();
          const fileName = `grid-${timestamp}.jpg`;
          const storagePath = `${userId}/ai/stacked/${fileName}`;

          const arrayBuffer = await gridBlob.arrayBuffer();
          const uploadData = new Uint8Array(arrayBuffer);

          timeline.mark('upload_start');
          const { data: uploadDataResult, error: uploadError } = await supabase.storage
            .from('media')
            .upload(storagePath, uploadData, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            });

          if (uploadError || !uploadDataResult) {
            throw new Error(`Failed to upload grid image: ${uploadError?.message || 'Unknown error'}`);
          }
          timeline.mark('upload_done');

          console.log(`[OutfitGeneration] Grid uploaded successfully. Storage path: ${uploadDataResult.path}`);

          stackedResult = {
            imageId: uploadDataResult.path,
            publicUrl: supabase.storage.from('media').getPublicUrl(uploadDataResult.path).data.publicUrl,
            storagePath: uploadDataResult.path
          };
        }

        if (!stackedResult) {
          throw new Error('Failed to prepare grid image');
        }

        // Phase 4: Prepare items data for AI job
        setProgress({
          phase: 'preparing',
          message: 'Preparing AI generation...',
          progress: 70,
        });

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

        const modelPreference = userSettings?.ai_model_preference || 'gemini-2.5-flash-image';

        // Phase 5: Create and trigger AI job with grid image
        setProgress({
          phase: 'generating',
          message: 'Generating outfit image...',
          progress: 80,
        });

        console.log(`[OutfitGeneration] Creating AI job with stacked image ID: ${stackedResult.imageId}`);

        const { data: jobData, error: jobError } = await createAndTriggerJob(
          userId,
          'outfit_render',
          {
            user_id: userId,
            outfit_id: outfitId,
            selected: selectedForJob,
            stacked_image_id: stackedResult.imageId,
            body_shot_image_id: userSettings.body_shot_image_id,
            model_preference: modelPreference,
            settings: {
              items_count: selectedItems.length,
              used_client_stacking: true,
            },
          }
        );

        if (jobError || !jobData?.jobId) {
          throw new Error('Failed to start AI generation');
        }

        timeline.mark('job_created', { job_id: jobData.jobId });
        timeline.mark('trigger_sent');

        console.log(`[OutfitGeneration] AI job created: ${jobData.jobId}`);

        // NEW: Start polling for description (skipped in PERF_MODE)
        if (!PERF_MODE) {
          startDescriptionPolling(outfitId);
        }

        // Phase 6: Poll for completion
        setProgress({
          phase: 'generating',
          message: 'AI is working on your outfit...',
          progress: 90,
        });

        timeline.mark('poll_start');
        const { data: completedJob, error: pollError } = await pollAIJobWithFinalCheck(
          jobData.jobId,
          60,
          2000,
          '[OutfitGeneration]',
          'outfit_render'
        );

        // Clean up intervals
        clearAllIntervals();

        if (pollError || !completedJob) {
          timeline.mark('poll_timeout');
          console.warn('[OutfitGeneration] AI generation polling timed out, but outfit was saved');
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
          throw new Error(completedJob.error || 'AI generation failed');
        }

        const resultKeys = completedJob.result ? Object.keys(completedJob.result) : [];
        const jobStatusSucceededAt = Date.now();
        timeline.mark('poll_success', { resultKeys });
        timeline.mark('job_status_succeeded_at', { ts: jobStatusSucceededAt });
        console.debug('[outfit_render_timing] job_status_succeeded_at', { ts: jobStatusSucceededAt, traceId: timeline.traceId, outfitId });

        // Pass base64 to view so image shows immediately (no storage/CDN wait)
        const result = completedJob.result || {};
        if (result.base64_result) {
          const dataUri = toDataUri(result.base64_result, result.mime_type);
          const coverSetAt = Date.now();
          setInitialCoverDataUri(
            outfitId,
            dataUri,
            jobStatusSucceededAt,
            completedJob.id,
            (completedJob as { feedback_at?: string | null }).feedback_at ?? null
          );
          timeline.mark('cover_set_base64_at', { ts: coverSetAt });
          console.debug('[outfit_render_timing] cover_set_base64_at', { ts: coverSetAt, traceId: timeline.traceId, outfitId, from: 'generation' });
        } else {
          console.debug('[outfit_render_timing] base64_result missing', { traceId: timeline.traceId, outfitId, resultKeys });
        }

        // Success! Hide modal immediately so navigation isn't delayed
        console.log(`[OutfitGeneration] Generation completed successfully!`);
        setProgress({
          phase: 'complete',
          message: 'Outfit generated successfully!',
          progress: 100,
        });
        setModalVisible(false);

        return { success: true, outfitId, renderTraceId: timeline.traceId };
      } catch (error: any) {
        console.error('[OutfitGeneration] Error:', error);
        clearAllIntervals();
        setProgress({
          phase: 'error',
          message: error.message || 'Generation failed',
          progress: 0,
        });
        setModalVisible(false);
        return { success: false, error: error.message };
      } finally {
        setGenerating(false);
      }
    },
    [userId, categories, startItemRevealAnimation, startDescriptionPolling, clearAllIntervals]
  );

  const reset = useCallback(() => {
    clearAllIntervals();
    setGenerating(false);
    setProgress({
      phase: 'saving',
      message: '',
      progress: 0,
    });
    setGeneratedOutfitId(null);
    setModalVisible(false);
    setModalPhase('items');
    setModalItems([]);
    setRevealedItemsCount(-1);
    setCompletedItemsCount(-1);
    setActiveMessage(null);
    setOutfitDescription(null);
  }, [clearAllIntervals]);

  return {
    generating,
    progress,
    generatedOutfitId,
    generateOutfit,
    reset,
    // NEW: Modal state
    modalVisible,
    modalPhase,
    modalItems,
    revealedItemsCount,
    completedItemsCount,
    activeMessage,
    outfitDescription,
  };
}

export default useOutfitGeneration;