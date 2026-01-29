/**
 * useOutfitGeneration Hook
 * Handles outfit creation and AI generation from wardrobe with client-side image stacking
 * NOW WITH REAL-TIME DESCRIPTION POLLING
 */

import { useState, useCallback, useRef } from 'react';
import { saveOutfit } from '@/lib/outfits';
import { createAndTriggerJob, pollAIJobWithFinalCheck } from '@/lib/ai-jobs';
import { getUserSettings } from '@/lib/settings';
import { WardrobeItem, WardrobeCategory } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { generateClothingGrid } from '@/utils/clothing-grid';
import { startTimeline } from '@/lib/perf/timeline';

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

interface GenerationMessage {
  id: string;
  kind: 'description' | 'contexts' | 'style' | 'versatility' | 'finalizing';
  text: string;
}

interface OutfitDescription {
  description: string;
  occasions: string[];
  styleTags: string[];
  season: string;
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

  const clearAllIntervals = useCallback(() => {
    if (descriptionPollingInterval.current) {
      clearInterval(descriptionPollingInterval.current);
      descriptionPollingInterval.current = null;
    }
    if (itemRevealInterval.current) {
      clearInterval(itemRevealInterval.current);
      itemRevealInterval.current = null;
    }
  }, []);

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
    }, 400); // Reveal one item every 400ms
  }, []);

  // NEW: Poll for outfit description from backend
  const startDescriptionPolling = useCallback((outfitId: string) => {
    console.log('[OutfitGeneration] Starting description polling...');

    descriptionPollingInterval.current = setInterval(async () => {
      try {
        const { data: outfitData } = await supabase
          .from('outfits')
          .select('description, occasions, style_tags, season, description_generated_at')
          .eq('id', outfitId)
          .single();

        if (outfitData?.description_generated_at) {
          console.log('[OutfitGeneration] Description received!');

          const description: OutfitDescription = {
            description: outfitData.description || '',
            occasions: outfitData.occasions || [],
            styleTags: outfitData.style_tags || [],
            season: outfitData.season || 'all-season',
          };

          setOutfitDescription(description);

          // Animate through messages
          animateDescriptionMessages(description);

          // Stop polling
          if (descriptionPollingInterval.current) {
            clearInterval(descriptionPollingInterval.current);
            descriptionPollingInterval.current = null;
          }
        }
      } catch (error) {
        console.error('[OutfitGeneration] Description polling error:', error);
      }
    }, 500); // Poll every 500ms
  }, []);

  // NEW: Animate through description messages
  const animateDescriptionMessages = useCallback((description: OutfitDescription) => {
    const messages: GenerationMessage[] = [];

    // Message 1: Description
    if (description.description) {
      messages.push({
        id: 'msg-description',
        kind: 'description',
        text: description.description,
      });
    }

    // Message 2: Occasions (contexts)
    if (description.occasions.length > 0) {
      messages.push({
        id: 'msg-contexts',
        kind: 'contexts',
        text: `Perfect for ${description.occasions.join(', ')}.`,
      });
    }

    // Message 3: Style tags
    if (description.styleTags.length > 0) {
      messages.push({
        id: 'msg-style',
        kind: 'style',
        text: `This outfit embodies ${description.styleTags.join(', ')} vibes.`,
      });
    }

    // Message 4: Versatility/Season
    if (description.season && description.season !== 'all-season') {
      messages.push({
        id: 'msg-versatility',
        kind: 'versatility',
        text: `Best suited for ${description.season} weather.`,
      });
    } else {
      messages.push({
        id: 'msg-versatility',
        kind: 'versatility',
        text: `A versatile outfit that works year-round.`,
      });
    }

    // Animate through messages
    let currentIndex = 0;

    const showNextMessage = () => {
      if (currentIndex < messages.length) {
        setActiveMessage(messages[currentIndex]);
        currentIndex++;
        setTimeout(showNextMessage, 2000); // Show each message for 2 seconds
      } else {
        // All messages shown, transition to finalizing
        setModalPhase('finalizing');
        setActiveMessage({
          id: 'msg-finalizing',
          kind: 'finalizing',
          text: 'Applying final touches to your outfit visualization...',
        });
      }
    };

    // Start animation after a brief delay
    setTimeout(showNextMessage, 300);
  }, []);

  const generateOutfit = useCallback(
    async (selectedItems: WardrobeItem[]): Promise<{ success: boolean; outfitId?: string; error?: string }> => {
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
      timeline.mark('generate_press');

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

        // NEW: Start item reveal animation
        const itemsForModal: GenerationItem[] = selectedItems.map((item, index) => ({
          id: item.id,
          title: item.title || 'Untitled Item',
          orderIndex: index,
        }));
        startItemRevealAnimation(itemsForModal);

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

          const gridBase64 = await generateClothingGrid(imageUrls);
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
        timeline.mark('execution_triggered');

        console.log(`[OutfitGeneration] AI job created: ${jobData.jobId}`);

        // NEW: Start polling for description (runs in parallel with image generation)
        startDescriptionPolling(outfitId);

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
          '[OutfitGeneration]'
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
          return { success: true, outfitId };
        }

        if (completedJob.status === 'failed') {
          timeline.mark('poll_failed', { error: completedJob.error });
          throw new Error(completedJob.error || 'AI generation failed');
        }

        const resultKeys = completedJob.result ? Object.keys(completedJob.result) : [];
        timeline.mark('poll_success', { resultKeys });

        // Success!
        console.log(`[OutfitGeneration] Generation completed successfully!`);
        setProgress({
          phase: 'complete',
          message: 'Outfit generated successfully!',
          progress: 100,
        });

        // Hide modal after a brief delay
        setTimeout(() => {
          setModalVisible(false);
        }, 1500);

        return { success: true, outfitId };
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