/**
 * useOutfitEditorActions Hook
 * Actions and handlers for outfit editor screen
 */

import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getWardrobeItems,
  getSavedWardrobeItems,
  WardrobeItem,
} from '@/lib/wardrobe';
import {
  createAIJob,
  triggerAIJobExecution,
} from '@/lib/ai-jobs';
import { getUserSettings } from '@/lib/settings';
import { generateClothingGrid } from '@/utils/clothing-grid';
import { supabase } from '@/lib/supabase';
import { startTimeline } from '@/lib/perf/timeline';

interface UseOutfitEditorActionsProps {
  outfitId: string;
  isNew: boolean;
  outfit: any | null;
  categories: Array<{ id: string; name: string }>;
  outfitItems: Map<string, WardrobeItem>;
  itemImageUrls: Map<string, string>;
  notes: string;
  saveOutfit: () => Promise<string | null>;
  setOutfitItems: React.Dispatch<React.SetStateAction<Map<string, WardrobeItem>>>;
  getItemImageUrl: (itemId: string) => Promise<string | null>;
}

interface UseOutfitEditorActionsReturn {
  // Item picker
  showItemPicker: boolean;
  selectedCategory: string | null;
  categoryItems: WardrobeItem[];
  setShowItemPicker: (show: boolean) => void;
  openItemPicker: (categoryId: string) => Promise<void>;
  selectItem: (item: WardrobeItem) => Promise<void>;
  removeItem: (categoryId: string) => void;

  // Actions
  saving: boolean;
  rendering: boolean;
  generationPhase: 'items' | 'analysis' | 'finalizing';
  revealedItemsCount: number;
  completedItemsCount: number;
  activeMessage: any;
  handleSave: () => Promise<void>;
  handleRender: () => Promise<void>;
  handleDelete: () => void;
}

export function useOutfitEditorActions({
  outfitId,
  isNew,
  outfit,
  categories,
  outfitItems,
  itemImageUrls,
  notes,
  saveOutfit,
  setOutfitItems,
  getItemImageUrl,
}: UseOutfitEditorActionsProps): UseOutfitEditorActionsReturn {
  const router = useRouter();
  const { user } = useAuth();

  // Item picker state
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<WardrobeItem[]>([]);

  // Action states
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<
    'items' | 'analysis' | 'finalizing'
  >('items');
  const [revealedItemsCount, setRevealedItemsCount] = useState(0);
  const [completedItemsCount, setCompletedItemsCount] = useState(0);
  const [activeMessage, setActiveMessage] = useState<any>(null);

  const openItemPicker = useCallback(
    async (categoryId: string) => {
      if (!user) return;

      setSelectedCategory(categoryId);

      const { getDefaultWardrobeId } = await import('@/lib/wardrobe');
      const { data: defaultWardrobeId } = await getDefaultWardrobeId(user.id);
      if (!defaultWardrobeId) return;

      const { data: ownedItems } = await getWardrobeItems(defaultWardrobeId, {
        category_id: categoryId,
      });

      const { data: savedItems } = await getSavedWardrobeItems(user.id, {
        category_id: categoryId,
      });

      const items = [...(ownedItems || []), ...(savedItems || [])];
      setCategoryItems(items);

      if (items && items.length > 0) {
        const imagePromises = items.map(async (item) => {
          const url = await getItemImageUrl(item.id);
          return { itemId: item.id, url };
        });
        const imageResults = await Promise.all(imagePromises);
        // Note: itemImageUrls is managed by useOutfitEditor, so we don't update it here
        // The hook should handle image URL caching
      }

      setShowItemPicker(true);
    },
    [user, getItemImageUrl]
  );

  const selectItem = useCallback(
    async (item: WardrobeItem) => {
      if (!selectedCategory) return;

      setOutfitItems((prev: Map<string, WardrobeItem>) => {
        const updated = new Map(prev);
        updated.set(selectedCategory, item);
        return updated;
      });

      setShowItemPicker(false);
      setSelectedCategory(null);
    },
    [selectedCategory, setOutfitItems]
  );

  const removeItem = useCallback(
    (categoryId: string) => {
      setOutfitItems((prev: Map<string, WardrobeItem>) => {
        const updated = new Map(prev);
        updated.delete(categoryId);
        return updated;
      });
    },
    [setOutfitItems]
  );

  const handleSave = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const savedOutfitId = await saveOutfit();
      if (savedOutfitId) {
        if (isNew) {
          Alert.alert(
            'Success',
            'Outfit saved! You can now generate the outfit image.',
            [
              {
                text: 'OK',
                onPress: () => router.replace(`/outfits/${savedOutfitId}`),
              },
            ]
          );
        } else {
          Alert.alert('Success', 'Outfit saved!');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [user, isNew, saveOutfit, router]);

  const handleRender = useCallback(async () => {
    if (!user || outfitItems.size === 0) {
      Alert.alert('Error', 'Please add items to the outfit before rendering');
      return;
    }

    setRendering(true);
    setGenerationPhase('items');
    setRevealedItemsCount(0);
    setCompletedItemsCount(0);

    try {
      // Save outfit first
      const savedOutfitId = await saveOutfit();
      if (!savedOutfitId) {
        Alert.alert('Error', 'Failed to save outfit before rendering');
        setRendering(false);
        return;
      }

      // Client-side grid generation
      let stackedImageId = null;
      try {
        const itemsToStack = Array.from(outfitItems.values());
        const imageUrls = itemsToStack.map((item) => {
          const url = itemImageUrls.get(item.id);
          if (!url) throw new Error(`No image URL for item ${item.id}`);
          return url;
        });

        console.log(`[OutfitEditor] Generating grid for ${imageUrls.length} items...`);
        const gridBase64 = await generateClothingGrid(imageUrls);
        console.log(`[OutfitEditor] Grid generated successfully, base64 length: ${gridBase64.length}`);

        // Convert base64 to Blob and upload to storage
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
        const storagePath = `${user.id}/ai/stacked/${fileName}`;

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

        console.log(`[OutfitEditor] Grid uploaded successfully. Storage path: ${uploadDataResult.path}`);
        stackedImageId = uploadDataResult.path;
      } catch (gridError) {
        console.warn('[OutfitEditor] Client-side grid generation failed:', gridError);
      }

      // Prepare items for render job
      const selected = Array.from(outfitItems.entries()).map(
        ([categoryId, item]) => {
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
        }
      );

      const { data: userSettings } = await getUserSettings(user.id);
      if (!userSettings?.body_shot_image_id) {
        Alert.alert(
          'Setup Required',
          'Please upload a body photo before generating outfits.'
        );
        setRendering(false);
        return;
      }

      const modelPreference =
        userSettings?.ai_model_preference || 'gemini-2.5-flash-image';

      const timeline = startTimeline('outfit_render_editor');
      timeline.mark('generate_press');

      // Create render job
      const { data: renderJob, error } = await createAIJob(
        user.id,
        'outfit_render',
        {
          user_id: user.id,
          outfit_id: savedOutfitId,
          stacked_image_id: stackedImageId,
          selected,
          prompt: notes.trim() || undefined,
          body_shot_image_id: userSettings.body_shot_image_id,
          model_preference: modelPreference,
        }
      );

      if (error || !renderJob) {
        Alert.alert('Error', 'Failed to start render job');
        setRendering(false);
        return;
      }

      timeline.mark('job_created', { job_id: renderJob.id });

      await triggerAIJobExecution(renderJob.id);
      timeline.mark('execution_triggered');

      setRendering(false);
      const query = new URLSearchParams({
        renderJobId: renderJob.id,
        renderTraceId: timeline.traceId,
      }).toString();
      router.push(`/outfits/${savedOutfitId}/view?${query}`);
      timeline.mark('navigate_to_view');
    } catch (error: any) {
      console.error('Render error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      setRendering(false);
    }
  }, [
    user,
    outfitItems,
    itemImageUrls,
    categories,
    notes,
    saveOutfit,
    router,
  ]);

  const handleDelete = useCallback(() => {
    if (!user || !outfit || isNew) return;

    Alert.alert('Delete Outfit', 'Are you sure you want to delete this outfit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase
              .from('outfits')
              .update({ archived_at: new Date().toISOString() })
              .eq('id', outfit.id)
              .eq('owner_user_id', user.id);

            if (error) throw error;
            Alert.alert('Success', 'Outfit deleted');
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete outfit');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [user, outfit, isNew, router]);

  return {
    // Item picker
    showItemPicker,
    selectedCategory,
    categoryItems,
    setShowItemPicker,
    openItemPicker,
    selectItem,
    removeItem,

    // Actions
    saving,
    rendering,
    generationPhase,
    revealedItemsCount,
    completedItemsCount,
    activeMessage,
    handleSave,
    handleRender,
    handleDelete,
  };
}
