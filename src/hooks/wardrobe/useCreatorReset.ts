import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { WardrobeItem } from '@/lib/wardrobe';

interface UseCreatorResetProps {
  setSelectedOutfitItems: Dispatch<SetStateAction<string[]>>;
  setSelectedOutfitItemMap: (map: Map<string, WardrobeItem>) => void;
  canvas: {
    setOutfitCanvasLayouts: (val: Record<string, any>) => void;
    setOutfitCanvasTrims: (val: Record<string, any>) => void;
    setOutfitCanvasTrimStatuses: (val: Record<string, any>) => void;
  };
  setIsCreatorExpanded: (val: boolean) => void;
  setOutfitCreatorMode: (val: boolean) => void;
  handleCategorySelect: (id: string | null) => void;
  updateFilter: (key: string, val: any) => void;
  sessionData: { endSession: () => void };
  sessionNav: { clearPreview: () => void };
  setAutoSelectNext: (val: boolean) => void;
}

export function useCreatorReset({
  setSelectedOutfitItems,
  setSelectedOutfitItemMap,
  canvas,
  setIsCreatorExpanded,
  setOutfitCreatorMode,
  handleCategorySelect,
  updateFilter,
  sessionData,
  sessionNav,
  setAutoSelectNext,
}: UseCreatorResetProps) {
  const resetOutfitCreatorState = useCallback(() => {
    setSelectedOutfitItems([]);
    setSelectedOutfitItemMap(new Map());
    canvas.setOutfitCanvasLayouts({});
    canvas.setOutfitCanvasTrims({});
    canvas.setOutfitCanvasTrimStatuses({});
    setIsCreatorExpanded(false);
    setOutfitCreatorMode(false);
    handleCategorySelect(null);
    updateFilter('subcategoryId', null);
    sessionData.endSession();
    sessionNav.clearPreview();
    setAutoSelectNext(false);
  }, [
    setSelectedOutfitItems,
    setSelectedOutfitItemMap,
    canvas,
    setIsCreatorExpanded,
    setOutfitCreatorMode,
    handleCategorySelect,
    updateFilter,
    sessionData,
    sessionNav,
    setAutoSelectNext,
  ]);

  return { resetOutfitCreatorState };
}
