/**
 * useOutfitGeneration Hook
 * Handles outfit creation and AI generation from wardrobe with client-side image stacking
 */

import { useState, useCallback } from 'react';
import { saveOutfit } from '@/lib/outfits';
import { createAndTriggerJob, pollAIJobWithFinalCheck } from '@/lib/ai-jobs';
import { getUserSettings } from '@/lib/settings';
import { WardrobeItem, WardrobeCategory } from '@/lib/wardrobe';
import { useImageStacker } from '@/hooks/useImageStacker';
import { supabase } from '@/lib/supabase';

interface GenerationProgress {
  phase: 'saving' | 'preparing' | 'stacking' | 'generating' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
}

interface UseOutfitGenerationOptions {
  userId: string;
  categories: WardrobeCategory[];
}

export function useOutfitGeneration({ userId, categories }: UseOutfitGenerationOptions) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'saving',
    message: '',
    progress: 0,
  });
  const [generatedOutfitId, setGeneratedOutfitId] = useState<string | null>(null);
  
  const { stackAndUpload } = useImageStacker();

  const generateOutfit = useCallback(
    async (selectedItems: WardrobeItem[]): Promise<{ success: boolean; outfitId?: string; error?: string }> => {
      if (!userId || selectedItems.length === 0) {
        return { success: false, error: 'No items selected' };
      }

      setGenerating(true);
      setGeneratedOutfitId(null);

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

        // Phase 3: Download and stack wardrobe item images
        setProgress({
          phase: 'stacking',
          message: `Preparing ${selectedItems.length} items...`,
          progress: 30,
        });

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
          message: `Downloading ${topImages.length} images...`,
          progress: 40,
        });

        console.log(`[OutfitGeneration] Downloading ${topImages.length} images`);

        // Download images as File objects
        const imageFiles = await Promise.all(
          topImages.map(async (link) => {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(link.storage_key);

            if (!urlData?.publicUrl) {
              throw new Error(`Failed to get URL for image ${link.image_id}`);
            }

            // Download image
            const response = await fetch(urlData.publicUrl);
            if (!response.ok) {
              throw new Error(`Failed to download image ${link.image_id}`);
            }

            const blob = await response.blob();
            return new File([blob], `item-${link.image_id}.jpg`, { type: 'image/jpeg' });
          })
        );

        console.log(`[OutfitGeneration] Downloaded ${imageFiles.length} images successfully`);

        // Stack and upload images
        setProgress({
          phase: 'stacking',
          message: `Stacking ${imageFiles.length} images...`,
          progress: 50,
        });

        console.log(`[OutfitGeneration] Starting image stacking...`);

        const stackedResult = await stackAndUpload(imageFiles);

        if (!stackedResult) {
          throw new Error('Failed to stack images. Please try again.');
        }

        console.log(`[OutfitGeneration] Images stacked successfully. Image ID: ${stackedResult.imageId}`);

        // Phase 4: Prepare items data for AI job
        setProgress({
          phase: 'preparing',
          message: 'Preparing AI generation...',
          progress: 60,
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

        // Phase 5: Create and trigger AI job with stacked image
        setProgress({
          phase: 'generating',
          message: 'Generating outfit image...',
          progress: 70,
        });

        console.log(`[OutfitGeneration] Creating AI job with stacked image ID: ${stackedResult.imageId}`);

        const { data: jobData, error: jobError } = await createAndTriggerJob(
          userId,
          'outfit_render',
          {
            user_id: userId,
            outfit_id: outfitId,
            selected: selectedForJob,
            stacked_image_id: stackedResult.imageId, // KEY: Send stacked image ID!
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

        console.log(`[OutfitGeneration] AI job created: ${jobData.jobId}`);

        // Phase 6: Poll for completion
        setProgress({
          phase: 'generating',
          message: 'AI is working on your outfit...',
          progress: 80,
        });

        const { data: completedJob, error: pollError } = await pollAIJobWithFinalCheck(
          jobData.jobId,
          60, // max attempts
          2000, // 2 second intervals
          '[OutfitGeneration]'
        );

        if (pollError || !completedJob) {
          // Don't throw - the outfit was saved successfully, just the image generation timed out
          console.warn('[OutfitGeneration] AI generation polling timed out, but outfit was saved');
          setProgress({
            phase: 'complete',
            message: 'Outfit saved! Image generation in progress...',
            progress: 100,
          });
          return { success: true, outfitId };
        }

        if (completedJob.status === 'failed') {
          throw new Error(completedJob.error || 'AI generation failed');
        }

        // Success!
        console.log(`[OutfitGeneration] Generation completed successfully!`);
        setProgress({
          phase: 'complete',
          message: 'Outfit generated successfully!',
          progress: 100,
        });

        return { success: true, outfitId };
      } catch (error: any) {
        console.error('[OutfitGeneration] Error:', error);
        setProgress({
          phase: 'error',
          message: error.message || 'Generation failed',
          progress: 0,
        });
        return { success: false, error: error.message };
      } finally {
        setGenerating(false);
      }
    },
    [userId, categories, stackAndUpload]
  );

  const reset = useCallback(() => {
    setGenerating(false);
    setProgress({
      phase: 'saving',
      message: '',
      progress: 0,
    });
    setGeneratedOutfitId(null);
  }, []);

  return {
    generating,
    progress,
    generatedOutfitId,
    generateOutfit,
    reset,
  };
}

export default useOutfitGeneration;
