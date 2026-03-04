import { useCallback } from 'react';
import { showErrorToast } from '@/utils/toast';
import { logClientTiming } from '@/lib/perf/logClientTiming';
import type { WardrobeItem } from '@/lib/wardrobe';

interface UseGenerateOutfitFlowProps {
  selectedOutfitItems: string[];
  selectedWardrobeItems: WardrobeItem[];
  hasCustomCreatorLayout: boolean;
  activeOutfitCanvasLayouts: Record<string, any>;
  activeOutfitCanvasTrims: Record<string, any>;
  sessionData: { ensureSession: () => Promise<string | null> };
  generateOutfit: (
    items: WardrobeItem[],
    layouts: Record<string, any> | null,
    trims: Record<string, any> | null,
    sessionId?: string | null
  ) => Promise<{ success: boolean; outfitId?: string; error?: string }>;
  setAutoSelectNext: (value: boolean) => void;
}

export function useGenerateOutfitFlow({
  selectedOutfitItems,
  selectedWardrobeItems,
  hasCustomCreatorLayout,
  activeOutfitCanvasLayouts,
  activeOutfitCanvasTrims,
  sessionData,
  generateOutfit,
  setAutoSelectNext,
}: UseGenerateOutfitFlowProps) {
  const handleGenerateOutfit = useCallback(async () => {
    if (selectedOutfitItems.length === 0) {
      showErrorToast('Please select items for your outfit');
      return;
    }
    if (selectedWardrobeItems.length === 0) {
      showErrorToast('Failed to load selected items');
      return;
    }

    const sessionId = await sessionData.ensureSession();
    const result = await logClientTiming('outfit_generation_client', async () =>
      generateOutfit(
        selectedWardrobeItems,
        hasCustomCreatorLayout ? activeOutfitCanvasLayouts : null,
        hasCustomCreatorLayout ? activeOutfitCanvasTrims : null,
        sessionId
      )
    );

    if (result.success && result.outfitId) {
      setAutoSelectNext(true);
    } else {
      showErrorToast(result.error || 'Failed to generate outfit');
    }
  }, [
    selectedOutfitItems,
    selectedWardrobeItems,
    sessionData,
    generateOutfit,
    hasCustomCreatorLayout,
    activeOutfitCanvasLayouts,
    activeOutfitCanvasTrims,
    setAutoSelectNext,
  ]);

  return { handleGenerateOutfit };
}
