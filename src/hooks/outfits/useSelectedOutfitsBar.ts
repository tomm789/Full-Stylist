import { useMemo } from 'react';

export function useSelectedOutfitsBar(
  selectedOutfitIds: Set<string>,
  selectedOutfitImages: Map<string, string | null>
) {
  return useMemo(
    () =>
      Array.from(selectedOutfitIds).map((id) => ({
        id,
        imageUrl: selectedOutfitImages.get(id) || null,
      })),
    [selectedOutfitIds, selectedOutfitImages]
  );
}
