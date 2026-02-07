/**
 * useTryOnOutfit Hook
 * Handle try-on outfit logic for social feed
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getOutfit, saveOutfit } from '@/lib/outfits';
import { createAIJob, triggerAIJobExecution, waitForAIJobCompletion, getOutfitRenderItemLimit } from '@/lib/ai-jobs';
import { supabase } from '@/lib/supabase';
import { getWardrobeCategories, getWardrobeItemsByIds } from '@/lib/wardrobe';

interface UseTryOnOutfitProps {
  userId: string | undefined;
}

interface UseTryOnOutfitReturn {
  tryingOnOutfit: boolean;
  generatingOutfitId: string | null;
  tryOnOutfit: (outfitId: string, referenceImageUrl: string | null) => Promise<void>;
}

export function useTryOnOutfit({ userId }: UseTryOnOutfitProps): UseTryOnOutfitReturn {
  const router = useRouter();
  const [tryingOnOutfit, setTryingOnOutfit] = useState(false);
  const [generatingOutfitId, setGeneratingOutfitId] = useState<string | null>(null);

  const tryOnOutfit = async (outfitId: string, referenceImageUrl: string | null) => {
    if (!userId) {
      Alert.alert('Error', 'Unable to try on outfit');
      return;
    }

    const tryOnStartMs = Date.now();
    setTryingOnOutfit(true);

    try {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('body_shot_image_id, headshot_image_id, ai_model_preference, ai_model_outfit_render')
        .eq('user_id', userId)
        .single();

      if (!userSettings?.body_shot_image_id || !userSettings?.headshot_image_id) {
        Alert.alert('Setup Required', 'Please upload a body photo and generate a headshot before trying on outfits.');
        setTryingOnOutfit(false);
        return;
      }

      const { data: outfitData } = await getOutfit(outfitId);
      if (!outfitData?.outfit || !outfitData.items || outfitData.items.length === 0) {
        throw new Error('Outfit not found or has no items');
      }

      const { data: categories } = await getWardrobeCategories();
      const categoriesMap = new Map(categories?.map(cat => [cat.id, cat.name]) || []);

      const outfitItems = outfitData.items.map((item, index) => ({
        category_id: item.category_id,
        wardrobe_item_id: item.wardrobe_item_id,
        position: item.position ?? index,
      }));

      const originalOutfitTitle = outfitData.outfit.title || 'Outfit';
      const { data: savedOutfit, error: saveError } = await saveOutfit(
        userId,
        {
          title: `Try on: ${originalOutfitTitle}`,
          visibility: 'private',
        },
        outfitItems
      );

      if (saveError || !savedOutfit?.outfit?.id) {
        throw new Error(saveError?.message || 'Failed to save outfit');
      }

      const newOutfitId = savedOutfit.outfit.id;

      const wardrobeItemIds = outfitData.items.map(item => item.wardrobe_item_id);
      const { data: wardrobeItems, error: wardrobeError } = await getWardrobeItemsByIds(wardrobeItemIds);
      
      if (wardrobeError) {
        await supabase
          .from('outfits')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', newOutfitId);
        console.error('[Social] Error fetching wardrobe items:', wardrobeError);
        throw new Error('Failed to access outfit items. Please try again.');
      }
      
      if (!wardrobeItems || wardrobeItems.length === 0) {
        await supabase
          .from('outfits')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', newOutfitId);
        throw new Error('Could not access outfit items. The outfit may contain items from users you don\'t follow.');
      }
      
      if (wardrobeItems.length < wardrobeItemIds.length) {
        const missingCount = wardrobeItemIds.length - wardrobeItems.length;
        console.warn(`[Social] Only ${wardrobeItems.length} of ${wardrobeItemIds.length} wardrobe items accessible`);
      }

      const wardrobeItemsMap = new Map(wardrobeItems.map(item => [item.id, item]));
      const selected = outfitData.items.map((outfitItem) => {
        const wardrobeItem = wardrobeItemsMap.get(outfitItem.wardrobe_item_id);
        const categoryId = wardrobeItem?.category_id || outfitItem.category_id;
        return {
          category: categoryId ? (categoriesMap.get(categoryId) || '') : '',
          wardrobe_item_id: outfitItem.wardrobe_item_id,
        };
      });

      const modelPreference =
        userSettings?.ai_model_outfit_render ||
        userSettings?.ai_model_preference ||
        'gemini-2.5-flash-image';
      const renderLimit = getOutfitRenderItemLimit(modelPreference);
      let mannequinImageId: string | undefined;

      if (selected.length > renderLimit) {
        const { data: mannequinJob, error: mannequinError } = await createAIJob(userId, 'outfit_mannequin', {
          user_id: userId,
          outfit_id: newOutfitId,
          selected,
        });

        if (mannequinError || !mannequinJob) {
          throw new Error('Failed to start mannequin generation');
        }

        await triggerAIJobExecution(mannequinJob.id);
        const { data: mannequinResult, error: mannequinPollError } = await waitForAIJobCompletion(
          mannequinJob.id,
          60,
          2000,
          '[Social] Mannequin'
        );

        if (mannequinPollError || !mannequinResult?.result?.mannequin_image_id) {
          throw new Error('Mannequin generation timed out. Please try again.');
        }

        mannequinImageId = mannequinResult.result.mannequin_image_id;
      }

      const { data: renderJob, error: jobError } = await createAIJob(userId, 'outfit_render', {
        user_id: userId,
        outfit_id: newOutfitId,
        selected,
        mannequin_image_id: mannequinImageId,
      });

      if (jobError || !renderJob) {
        throw new Error('Failed to start render job');
      }

      const triggerResult = await triggerAIJobExecution(renderJob.id);
      if (triggerResult.error) {
        console.error('[Social] Job trigger returned error:', triggerResult.error);
        if (triggerResult.error.message?.includes('URL') || triggerResult.error.message?.includes('configuration')) {
          await supabase
            .from('outfits')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', newOutfitId);
          throw new Error('Failed to start outfit generation. Please check your network connection and try again.');
        }
        console.warn('[Social] Job trigger may have timed out, but job might still be processing');
      }

      setGeneratingOutfitId(newOutfitId);

      try {
        const { data: finalJob, error: pollError } = await waitForAIJobCompletion(
          renderJob.id,
          120,
          2000,
          '[Social]'
        );

        if (pollError || !finalJob) {
          setGeneratingOutfitId(null);
          setTryingOnOutfit(false);
          Alert.alert(
            'Generation In Progress',
            'The outfit is still generating. You can check your outfits page to see when it\'s ready.',
            [{ text: 'OK' }]
          );
          return;
        }

        const pollElapsedMs = Date.now() - tryOnStartMs;
        console.info('[Social] Try-on poll succeeded', { jobId: renderJob.id, outfitId: newOutfitId, elapsedMs: pollElapsedMs });

        if (finalJob.status === 'succeeded') {
          setGeneratingOutfitId(null);
          setTryingOnOutfit(false);
          router.push(`/outfits/${newOutfitId}/view`);
          const navElapsedMs = Date.now() - tryOnStartMs;
          console.info('[Social] Try-on navigation', { outfitId: newOutfitId, elapsedMs: navElapsedMs });
        } else if (finalJob.status === 'failed') {
          setGeneratingOutfitId(null);
          setTryingOnOutfit(false);
          Alert.alert('Generation Failed', finalJob.error || 'Outfit generation failed');
        }
      } catch (error: any) {
        console.error('[Social] Error polling outfit render:', error);
        setGeneratingOutfitId(null);
        setTryingOnOutfit(false);
        Alert.alert(
          'Generation Error',
          'An error occurred while generating the outfit. You can check your outfits page to see if it completed.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error: any) {
      console.error('[Social] Error in handleTryOnOutfit:', error);
      
      let errorMessage = 'Failed to try on outfit';
      if (error.message) {
        if (error.message.includes('access outfit items') || error.message.includes("don't follow")) {
          errorMessage = 'Unable to access some items in this outfit. You may need to follow the outfit creator to try it on.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('URL') || error.message.includes('configuration')) {
          errorMessage = 'Configuration error. Please contact support if this persists.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
      setTryingOnOutfit(false);
      setGeneratingOutfitId(null);
    } finally {
      setTryingOnOutfit(false);
    }
  };

  return {
    tryingOnOutfit,
    generatingOutfitId,
    tryOnOutfit,
  };
}
