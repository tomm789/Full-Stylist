/**
 * useOutfitEditorActions Hook
 * Composition layer for outfit editor actions.
 * Combines item picking, save/archive, render pipeline, and session management.
 */

import { useRouter } from 'expo-router';
import type { Dispatch, SetStateAction } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { WardrobeItem } from '@/lib/wardrobe';
import { useItemPicker, type UseItemPickerReturn } from './useItemPicker';
import { useRenderPipeline, type UseRenderPipelineReturn } from './useRenderPipeline';
import { useSaveAndArchive, type UseSaveAndArchiveReturn } from './useSaveAndArchive';
import { useOutfitSessionData } from './useOutfitSessionData';
import {
  useOutfitSessionNavigation,
  type OutfitSessionPreview,
} from './useOutfitSessionNavigation';
import type { OutfitGenerationVariation } from '@/lib/outfits/sessions';

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

export interface UseOutfitEditorActionsReturn
  extends UseItemPickerReturn,
    UseSaveAndArchiveReturn,
    UseRenderPipelineReturn {
  // Session state
  sessionNav: {
    preview: OutfitSessionPreview;
    completedVariations: OutfitGenerationVariation[];
    currentIndex: number;
    showNav: boolean;
    canNavigateBack: boolean;
    canNavigateForward: boolean;
    selectVariation: (v: OutfitGenerationVariation) => Promise<void>;
    handleNavigate: (direction: 'back' | 'forward') => void;
    selectLatest: () => void;
    clearPreview: () => void;
  };
  variations: OutfitGenerationVariation[];
}

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
    outfitItems,
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

  // Session management
  const sessionData = useOutfitSessionData({
    userId: user?.id ?? null,
    enabled: true,
  });

  const sessionNav = useOutfitSessionNavigation({
    variations: sessionData.variations,
    variationUrls: sessionData.variationUrls,
    resolveImageUrl: sessionData.resolveImageUrl,
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
    ensureSession: sessionData.ensureSession,
    refreshVariations: sessionData.refreshVariations,
    selectLatest: sessionNav.selectLatest,
  });

  return {
    ...picker,
    ...saveArchive,
    ...render,
    sessionNav,
    variations: sessionData.variations,
  };
}
