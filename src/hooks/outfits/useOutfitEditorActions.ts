/**
 * useOutfitEditorActions Hook
 * Actions and handlers for outfit editor screen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  pollAIJobWithFinalCheck,
} from '@/lib/ai-jobs';
import { setInitialCoverDataUri } from '@/lib/outfits/initialCoverCache';
import { toDataUri } from '@/lib/images/dataUri';
import {
  outfitDescriptionToGenerationMessages,
  runDescriptionMessageDrip,
  type OutfitDescription,
} from '@/lib/outfits/outfitDescriptionMessages';
import { getUserSettings } from '@/lib/settings';
import { generateClothingGrid } from '@/utils/clothing-grid';
import { supabase } from '@/lib/supabase';
import { startTimeline } from '@/lib/perf/timeline';

const DESCRIPTION_POLL_MAX_MS = 30_000;

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

  const descriptionPollingInterval = useRef<NodeJS.Timeout | null>(null);
  const descriptionPollingStartedAtRef = useRef<number | null>(null);
  const descriptionPollingOutfitIdRef = useRef<string | null>(null);
  const itemRevealInterval = useRef<NodeJS.Timeout | null>(null);

  const clearDescriptionPoll = useCallback(() => {
    if (itemRevealInterval.current) {
      clearInterval(itemRevealInterval.current);
      itemRevealInterval.current = null;
    }
    if (descriptionPollingInterval.current) {
      clearInterval(descriptionPollingInterval.current);
      descriptionPollingInterval.current = null;
      const oid = descriptionPollingOutfitIdRef.current;
      descriptionPollingStartedAtRef.current = null;
      descriptionPollingOutfitIdRef.current = null;
      if (oid) {
        console.debug('[outfit_render_timing] description_poll_stopped', { outfitId: oid, reason: 'cleanup' });
      }
    }
  }, []);

  useEffect(() => {
    return () => clearDescriptionPoll();
  }, [clearDescriptionPoll]);

  const startDescriptionPolling = useCallback((outfitId: string) => {
    if (descriptionPollingInterval.current != null) return;
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
          const messages = outfitDescriptionToGenerationMessages(description);
          setGenerationPhase('analysis');
          runDescriptionMessageDrip(messages, setActiveMessage, setGenerationPhase);
        }
      } catch (e) {
        console.error('[OutfitEditor] Description polling error:', e);
      }
    }, 500);
  }, []);

  type EditorGenerationItem = { id: string; title: string; orderIndex: number };

  const startItemRevealAnimation = useCallback((items: EditorGenerationItem[]) => {
    setRevealedItemsCount(-1);
    setCompletedItemsCount(-1);
    setGenerationPhase('items');

    let currentRevealed = -1;
    let currentCompleted = -1;

    itemRevealInterval.current = setInterval(() => {
      if (currentRevealed < items.length - 1) {
        currentRevealed++;
        setRevealedItemsCount(currentRevealed);
        if (currentRevealed > 0) {
          currentCompleted = currentRevealed - 1;
          setCompletedItemsCount(currentCompleted);
        }
      } else {
        currentCompleted = items.length - 1;
        setCompletedItemsCount(currentCompleted);
        setTimeout(() => setGenerationPhase('analysis'), 500);
        if (itemRevealInterval.current) {
          clearInterval(itemRevealInterval.current);
          itemRevealInterval.current = null;
        }
      }
    }, 500);
  }, []);

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
    setActiveMessage(null);

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

      clearDescriptionPoll();
      const editorItems: EditorGenerationItem[] = Array.from(outfitItems.values()).map((item, index) => ({
        id: item.id,
        title: item.title || `Item ${index + 1}`,
        orderIndex: index,
      }));
      startItemRevealAnimation(editorItems);
      startDescriptionPolling(savedOutfitId);

      timeline.mark('poll_start');
      const { data: completedJob, error: pollError } = await pollAIJobWithFinalCheck(
        renderJob.id,
        60,
        2000,
        '[OutfitEditor]',
        'outfit_render'
      );

      clearDescriptionPoll();

      if (pollError || !completedJob) {
        timeline.mark('poll_timeout');
        setRendering(false);
        const q = timeline.traceId ? `?renderTraceId=${encodeURIComponent(timeline.traceId)}` : '';
        router.push(`/outfits/${savedOutfitId}/view${q}`);
        timeline.mark('navigate_to_view');
        return;
      }

      if (completedJob.status === 'failed') {
        Alert.alert('Error', completedJob.error ?? 'Outfit generation failed');
        setRendering(false);
        return;
      }

      const result = completedJob.result ?? {};
      const jobStatusSucceededAt = Date.now();
      timeline.mark('job_status_succeeded_at', { ts: jobStatusSucceededAt });
      console.debug('[outfit_render_timing] job_status_succeeded_at', {
        ts: jobStatusSucceededAt,
        outfitId: savedOutfitId,
        from: 'editor',
        traceId: timeline.traceId,
      });

      if (result.base64_result) {
        const dataUri = toDataUri(result.base64_result, result.mime_type);
        setInitialCoverDataUri(
          savedOutfitId,
          dataUri,
          jobStatusSucceededAt,
          completedJob.id,
          (completedJob as { feedback_at?: string | null }).feedback_at ?? null
        );
        console.debug('[outfit_render_timing] cover_set_base64_at', {
          ts: Date.now(),
          outfitId: savedOutfitId,
          from: 'editor',
          traceId: timeline.traceId,
        });
      }

      setRendering(false);
      const query = timeline.traceId ? `?renderTraceId=${encodeURIComponent(timeline.traceId)}` : '';
      router.push(`/outfits/${savedOutfitId}/view${query}`);
      timeline.mark('navigate_to_view');
      console.debug('[outfit_render_timing] navigate_to_view_at', {
        ts: Date.now(),
        outfitId: savedOutfitId,
        traceId: timeline.traceId,
      });
    } catch (error: any) {
      console.error('Render error:', error);
      clearDescriptionPoll();
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
    clearDescriptionPoll,
    startDescriptionPolling,
    startItemRevealAnimation,
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
