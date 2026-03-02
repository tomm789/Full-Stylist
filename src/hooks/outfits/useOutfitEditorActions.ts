/**
 * useOutfitEditorActions Hook
 * Thin composition layer for outfit editor actions.
 */

import { useRouter } from 'expo-router';
import type { Dispatch, SetStateAction } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { WardrobeItem } from '@/lib/wardrobe';
import { useItemPicker, type UseItemPickerReturn } from './useItemPicker';
import { useRenderPipeline, type UseRenderPipelineReturn } from './useRenderPipeline';
import { useSaveAndArchive, type UseSaveAndArchiveReturn } from './useSaveAndArchive';

interface UseOutfitEditorActionsProps {
  outfitId: string;
  isNew: boolean;
  outfit: any | null;
  categories: Array<{ id: string; name: string }>;
  outfitItems: Map<string, WardrobeItem>;
  itemImageUrls: Map<string, string>;
  notes: string;
  saveOutfit: () => Promise<string | null>;
  setOutfitItems: Dispatch<SetStateAction<Map<string, WardrobeItem>>>;
  ensureItemImageUrls: (itemIds: string[]) => Promise<void>;
  onDescriptionReady?: () => void;
}

type UseOutfitEditorActionsReturn =
  UseItemPickerReturn &
  UseSaveAndArchiveReturn &
  UseRenderPipelineReturn;

export function useOutfitEditorActions({
  outfitId: _outfitId,
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

  const picker = useItemPicker({
    user,
    setOutfitItems,
    ensureItemImageUrls,
  });

  const saveArchive = useSaveAndArchive({
    user,
    outfit,
    isNew,
    saveOutfit,
    router: router as any,
  });

  const render = useRenderPipeline({
    user,
    categories,
    outfitItems,
    itemImageUrls,
    notes,
    saveOutfit,
    router: router as any,
    onDescriptionReady,
  });

  return {
    ...picker,
    ...saveArchive,
    ...render,
  };
}
