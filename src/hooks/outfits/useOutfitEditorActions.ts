/**
 * useOutfitEditorActions Hook
 * Actions and handlers for outfit editor screen.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getWardrobeItems,
  getSavedWardrobeItems,
  WardrobeItem,
} from '@/lib/wardrobe';
import { setInitialCoverDataUri } from '@/lib/outfits/initialCoverCache';
import { toDataUri } from '@/lib/images/dataUri';
import { runDescriptionMessageDrip } from '@/lib/outfits/outfitDescriptionMessages';
import { getUserSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { startTimeline } from '@/lib/perf/timeline';
import { generateAndUploadGrid } from '@/lib/outfits/generateAndUploadGrid';
import { useDescriptionPolling } from '@/lib/outfits/useDescriptionPolling';
import { useItemRevealAnimation } from '@/hooks/outfits/useItemRevealAnimation';
import { useOutfitRenderJob } from '@/hooks/outfits/useOutfitRenderJob';

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
  ensureItemImageUrls: (itemIds: string[]) => Promise<void>;
  onDescriptionReady?: () => void;
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
  ensureItemImageUrls,
  onDescriptionReady,
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
  const [generationPhase, setGenerationPhase] = useState<'items' | 'analysis' | 'finalizing'>(
    'items'
  );
  const [activeMessage, setActiveMessage] = useState<any>(null);
  const descriptionDripRef = useRef<{ cancel: () => void } | null>(null);

  const cancelDescriptionDrip = useCallback(() => {
    descriptionDripRef.current?.cancel();
    descriptionDripRef.current = null;
  }, []);

  // ── Shared animation + polling hooks ────────────────────────────────────────
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

  // ── Item picker ──────────────────────────────────────────────────────────────

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
        await ensureItemImageUrls(items.map((item) => item.id));
      }

      setShowItemPicker(true);
    },
    [user, ensureItemImageUrls]
  );

  const selectItem = useCallback(
    async (item: WardrobeItem) => {
      if (!selectedCategory) return;

      setOutfitItems((prev: Map<string, WardrobeItem>) => {
        const updated = new Map(prev);
        updated.set(selectedCategory, item);
        return updated;
      });

      await ensureItemImageUrls([item.id]);
      setShowItemPicker(false);
      setSelectedCategory(null);
    },
    [selectedCategory, setOutfitItems, ensureItemImageUrls]
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

  // ── Save ─────────────────────────────────────────────────────────────────────

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
            [{ text: 'OK', onPress: () => router.replace(`/outfits/${savedOutfitId}`) }]
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

  // ── Render ───────────────────────────────────────────────────────────────────

  const handleRender = useCallback(async () => {
    if (!user || outfitItems.size === 0) {
      Alert.alert('Error', 'Please add items to the outfit before rendering');
      return;
    }

    setRendering(true);
    setGenerationPhase('items');
    setActiveMessage(null);

    try {
      const savedOutfitId = await saveOutfit();
      if (!savedOutfitId) {
        Alert.alert('Error', 'Failed to save outfit before rendering');
        setRendering(false);
        return;
      }

      // Client-side grid generation: resolve image URLs from the cached map
      let stackedImageId: string | null = null;
      const itemsToStack = Array.from(outfitItems.values());
      const imageUrls: string[] = [];
      let missingUrl = false;

      for (const item of itemsToStack) {
        const url = itemImageUrls.get(item.id);
        if (!url) { missingUrl = true; break; }
        imageUrls.push(url);
      }

      if (!missingUrl && imageUrls.length > 0) {
        const gridResult = await generateAndUploadGrid(imageUrls, user.id);
        stackedImageId = gridResult?.storagePath ?? null;
        if (stackedImageId) {
                    if (__DEV__) console.log(`[OutfitEditor] Grid uploaded successfully: ${stackedImageId}`);
        }
      }

      // Prepare items for render job
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
        Alert.alert('Setup Required', 'Please upload a body photo before generating outfits.');
        setRendering(false);
        return;
      }

      const modelPreference =
        userSettings?.ai_model_outfit_render ||
        userSettings?.ai_model_preference ||
        'gemini-2.5-flash-image';

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

      if (base64Result) {
        const dataUri = toDataUri(base64Result, result.mime_type);
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
      const query = timeline.traceId
        ? `?renderTraceId=${encodeURIComponent(timeline.traceId)}`
        : '';
      router.push(`/outfits/${savedOutfitId}/view${query}`);
      timeline.mark('navigate_to_view');
      console.debug('[outfit_render_timing] navigate_to_view_at', {
        ts: Date.now(),
        outfitId: savedOutfitId,
        traceId: timeline.traceId,
      });
    } catch (error: any) {
      console.error('Render error:', error);
      stopAll();
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
    stopAll,
    revealAnimation,
    descriptionPolling,
    runRenderJob,
  ]);

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!user || !outfit || isNew) return;

    Alert.alert('Archive Outfit', 'Move this outfit to your archive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { archiveOutfit } = await import('@/lib/outfits');
            const { error } = await archiveOutfit(user.id, outfit.id);
            if (error) throw error;
            Alert.alert('Success', 'Outfit archived');
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to archive outfit');
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
    revealedItemsCount: revealAnimation.revealedItemsCount,
    completedItemsCount: revealAnimation.completedItemsCount,
    activeMessage,
    handleSave,
    handleRender,
    handleDelete,
  };
}
