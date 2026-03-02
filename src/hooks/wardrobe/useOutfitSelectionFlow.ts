import { Alert } from 'react-native';
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { findConflictingItem } from '@/utils';
import type { WardrobeItem } from '@/lib/wardrobe';

interface UseOutfitSelectionFlowProps {
  selectedWardrobeItems: WardrobeItem[];
  outfitCreatorMode: boolean;
  outfitDraft: {
    hasDraft: boolean;
    restoreDraft: () => Promise<void>;
    clearDraft: () => void;
  };
  getCategoryById: (categoryId: string | null) => { name?: string } | null;
  setSelectedOutfitItems: Dispatch<SetStateAction<string[]>>;
  setSelectedOutfitItemMap: Dispatch<SetStateAction<Map<string, WardrobeItem>>>;
  setOutfitCreatorMode: (value: boolean) => void;
}

export function useOutfitSelectionFlow({
  selectedWardrobeItems,
  outfitCreatorMode,
  outfitDraft,
  getCategoryById,
  setSelectedOutfitItems,
  setSelectedOutfitItemMap,
  setOutfitCreatorMode,
}: UseOutfitSelectionFlowProps) {
  const upsertSelectedOutfitItem = useCallback(
    (item: WardrobeItem) => {
      setSelectedOutfitItemMap((prev) => {
        const next = new Map(prev);
        next.set(item.id, item);
        return next;
      });
    },
    [setSelectedOutfitItemMap]
  );

  const removeSelectedOutfitItem = useCallback(
    (itemId: string) => {
      setSelectedOutfitItemMap((prev) => {
        if (!prev.has(itemId)) return prev;
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
    },
    [setSelectedOutfitItemMap]
  );

  const handleOutfitSelectionAttempt = useCallback(
    (item: WardrobeItem, promptOnConflict: boolean) => {
      const conflictingItem = findConflictingItem(
        item,
        selectedWardrobeItems,
        (categoryId) => getCategoryById(categoryId)?.name || ''
      );

      if (conflictingItem && promptOnConflict) {
        Alert.alert('Replace item?', `Replace ${conflictingItem.title} with ${item.title}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              removeSelectedOutfitItem(conflictingItem.id);
              upsertSelectedOutfitItem(item);
              setSelectedOutfitItems((prev) =>
                prev.filter((id) => id !== conflictingItem.id).concat(item.id)
              );
              if (!outfitCreatorMode) setOutfitCreatorMode(true);
            },
          },
        ]);
        return;
      }

      if (!outfitCreatorMode && outfitDraft.hasDraft) {
        Alert.alert(
          'You have a saved draft',
          'Open your saved outfit draft or start a new outfit?',
          [
            {
              text: 'Open Draft',
              onPress: () => {
                outfitDraft.restoreDraft().then(() => {
                  upsertSelectedOutfitItem(item);
                  setSelectedOutfitItems((prev) =>
                    prev.includes(item.id) ? prev : [...prev, item.id]
                  );
                });
              },
            },
            {
              text: 'Start New',
              style: 'destructive',
              onPress: () => {
                outfitDraft.clearDraft();
                setOutfitCreatorMode(true);
                upsertSelectedOutfitItem(item);
                setSelectedOutfitItems([item.id]);
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      if (!outfitCreatorMode) setOutfitCreatorMode(true);
      setSelectedOutfitItems((prev) => {
        if (prev.includes(item.id)) {
          removeSelectedOutfitItem(item.id);
          return prev.filter((id) => id !== item.id);
        }
        upsertSelectedOutfitItem(item);
        return [...prev, item.id];
      });
    },
    [
      selectedWardrobeItems,
      getCategoryById,
      removeSelectedOutfitItem,
      upsertSelectedOutfitItem,
      setSelectedOutfitItems,
      outfitCreatorMode,
      setOutfitCreatorMode,
      outfitDraft,
    ]
  );

  return {
    handleOutfitSelectionAttempt,
    upsertSelectedOutfitItem,
    removeSelectedOutfitItem,
  };
}
