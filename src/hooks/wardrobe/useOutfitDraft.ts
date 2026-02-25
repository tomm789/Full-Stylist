/**
 * useOutfitDraft
 * Manages outfit draft persistence via AsyncStorage.
 * Owns: hasDraft flag.
 * Handles: initial mount check, focus-restore effect, save/clear/restore.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WardrobeItem } from '@/lib/wardrobe';

export type DraftRestoredData = {
  items: WardrobeItem[];
  headshotId: string | null;
};

export type UseOutfitDraftParams = {
  userId: string | null | undefined;
  isFocused: boolean;
  selectedOutfitItems: string[];
  selectedOutfitItemMap: Map<string, WardrobeItem>;
  currentHeadshotId: string | null;
  onDraftRestored: (data: DraftRestoredData) => void;
};

export function useOutfitDraft({
  userId,
  isFocused,
  selectedOutfitItems,
  selectedOutfitItemMap,
  currentHeadshotId,
  onDraftRestored,
}: UseOutfitDraftParams) {
  const [hasDraft, setHasDraft] = useState(false);

  // Check for a saved draft on mount.
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(`outfit_draft_${userId}`).then((val) => {
      if (val) setHasDraft(true);
    });
  }, [userId]);

  // On focus: restore if Hair & Make-Up redirected back with a pending draft restore.
  useEffect(() => {
    if (!isFocused || !userId) return;
    AsyncStorage.getItem('wardrobe_draft_restore_pending').then(async (val) => {
      if (!val) return;
      await AsyncStorage.removeItem('wardrobe_draft_restore_pending');
      const draftJson = await AsyncStorage.getItem(`outfit_draft_${userId}`);
      if (!draftJson) return;
      try {
        const draft = JSON.parse(draftJson) as { items: WardrobeItem[]; headshotId: string | null };
        await AsyncStorage.removeItem(`outfit_draft_${userId}`);
        setHasDraft(false);
        onDraftRestored(draft);
      } catch (e) {
        console.error('[wardrobe] Failed to restore draft on focus:', e);
      }
    });
  }, [isFocused, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = useCallback(async () => {
    if (!userId || selectedOutfitItems.length === 0) return;
    const draft = {
      items: Array.from(selectedOutfitItemMap.values()),
      headshotId: currentHeadshotId,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(`outfit_draft_${userId}`, JSON.stringify(draft));
    setHasDraft(true);
  }, [userId, selectedOutfitItems, selectedOutfitItemMap, currentHeadshotId]);

  const clearDraft = useCallback(async () => {
    if (!userId) return;
    await AsyncStorage.removeItem(`outfit_draft_${userId}`);
    setHasDraft(false);
  }, [userId]);

  const restoreDraft = useCallback(async () => {
    if (!userId) return;
    const draftJson = await AsyncStorage.getItem(`outfit_draft_${userId}`);
    if (!draftJson) return;
    try {
      const draft = JSON.parse(draftJson) as { items: WardrobeItem[]; headshotId: string | null };
      await AsyncStorage.removeItem(`outfit_draft_${userId}`);
      setHasDraft(false);
      onDraftRestored(draft);
    } catch (e) {
      console.error('[wardrobe] Failed to restore draft:', e);
    }
  }, [userId, onDraftRestored]);

  return { hasDraft, saveDraft, clearDraft, restoreDraft };
}
