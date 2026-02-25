/**
 * OutfitCreatorSection
 * Renders the OutfitCreatorPanel + CreatorBar when the user is in outfit-creator mode.
 * Replaces the IIFE JSX antipattern in wardrobe.tsx and derives selectedCategoryIds
 * from the list of selected WardrobeItems internally.
 */

import React, { useMemo } from 'react';
import CreatorBar from '@/components/shared/CreatorBar';
import OutfitCreatorPanel from '@/components/wardrobe/OutfitCreatorPanel';
import type { WardrobeCategory } from '@/lib/wardrobe';
import type { WardrobeItem } from '@/lib/wardrobe';
import type {
  OutfitCanvasItemLayout,
  OutfitCanvasLayoutMap,
  OutfitCanvasTrimMap,
  OutfitCanvasTrimStatus,
} from '@/lib/outfits/canvasLayout';

interface SelectedBarItem {
  id: string;
  imageUrl: string | null;
  trimStatus: OutfitCanvasTrimStatus;
}

interface OutfitCreatorSectionProps {
  visible: boolean;

  // Panel layout
  isExpanded: boolean;
  onToggleExpanded: () => void;
  expandedHeight: number;
  bottomOffset: number;

  // Items & categories
  selectedItems: SelectedBarItem[];
  selectedWardrobeItems: WardrobeItem[];
  categories: WardrobeCategory[];
  onRemoveItem: (id: string) => void;
  onCategorySelect: (categoryId: string) => void;
  selectedCategoryId: string | null;
  currentHeadshotUrl: string | null;
  onHeadshotSelect: () => void;

  // Canvas
  isPreparing: boolean;
  layoutMap: OutfitCanvasLayoutMap;
  trimMap: OutfitCanvasTrimMap;
  onLayoutChange: (itemId: string, next: OutfitCanvasItemLayout) => void;
  onBringForward: (itemId: string) => void;
  onSendBackward: (itemId: string) => void;

  // Creator bar
  label: string;
  onGenerate: () => void;
  onOptions: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export default function OutfitCreatorSection({
  visible,
  isExpanded,
  onToggleExpanded,
  expandedHeight,
  bottomOffset,
  selectedItems,
  selectedWardrobeItems,
  categories,
  onRemoveItem,
  onCategorySelect,
  selectedCategoryId,
  currentHeadshotUrl,
  onHeadshotSelect,
  isPreparing,
  layoutMap,
  trimMap,
  onLayoutChange,
  onBringForward,
  onSendBackward,
  label,
  onGenerate,
  onOptions,
  isGenerating,
  disabled,
}: OutfitCreatorSectionProps) {
  const selectedCategoryIds = useMemo(
    () => new Set(selectedWardrobeItems.map((item) => item.category_id)),
    [selectedWardrobeItems]
  );

  if (!visible) return null;

  return (
    <>
      <OutfitCreatorPanel
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
        expandedHeight={expandedHeight}
        bottomOffset={bottomOffset}
        zIndex={13}
        selectedItems={selectedItems}
        categories={categories}
        onRemoveItem={onRemoveItem}
        onCategorySelect={onCategorySelect}
        selectedCategoryId={selectedCategoryId}
        selectedCategoryIds={selectedCategoryIds}
        currentHeadshotUrl={currentHeadshotUrl}
        onHeadshotSelect={onHeadshotSelect}
        isPreparing={isPreparing}
        layoutMap={layoutMap}
        trimMap={trimMap}
        onLayoutChange={onLayoutChange}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
      />
      <CreatorBar
        label={label}
        onGenerate={onGenerate}
        onOptions={onOptions}
        isGenerating={isGenerating}
        disabled={disabled}
      />
    </>
  );
}
