import React from 'react';
import { Animated, View } from 'react-native';
import LookbookSelectionBar from './LookbookSelectionBar';
import OutfitsHeaderBar from './OutfitsHeaderBar';

export type OutfitsHeaderSectionProps = {
  headerReady: boolean;
  headerHeight: Animated.Value | number;
  headerOpacity: Animated.AnimatedInterpolation<string | number> | number;
  headerTranslate: Animated.AnimatedInterpolation<string | number> | number;
  uiHidden: boolean;
  onHeaderLayout: (event: any) => void;
  selectionMode: boolean;
  selectedOutfits: { id: string; imageUrl: string | null }[];
  selectionCount: number;
  isSaving: boolean;
  onRemoveOutfit: (id: string) => void;
  onExitSelection: () => void;
  onOpenPicker: () => void;
  activeTab: 'my_outfits' | 'explore' | 'following';
  showTabLabels: boolean;
  activeView: 'grid' | 'feed';
  onChangeTab: (tab: 'my_outfits' | 'explore' | 'following') => void;
  onChangeView: (view: 'grid' | 'feed') => void;
  showViewToggle: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onOpenSort: () => void;
  hasActiveFilters: boolean;
  showSearch: boolean;
  styles: {
    headerContainer: any;
  };
};

export default function OutfitsHeaderSection({
  headerReady,
  headerHeight,
  headerOpacity,
  headerTranslate,
  uiHidden,
  onHeaderLayout,
  selectionMode,
  selectedOutfits,
  selectionCount,
  isSaving,
  onRemoveOutfit,
  onExitSelection,
  onOpenPicker,
  activeTab,
  showTabLabels,
  activeView,
  onChangeTab,
  onChangeView,
  showViewToggle,
  searchQuery,
  onSearchChange,
  onOpenSort,
  hasActiveFilters,
  showSearch,
  styles,
}: OutfitsHeaderSectionProps) {
  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          height: headerReady ? headerHeight : undefined,
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }],
        },
      ]}
      pointerEvents={uiHidden ? 'none' : 'auto'}
    >
      <View onLayout={onHeaderLayout}>
        {selectionMode && (
          <LookbookSelectionBar
            selectedOutfits={selectedOutfits}
            selectionCount={selectionCount}
            isSaving={isSaving}
            onRemoveOutfit={onRemoveOutfit}
            onExit={onExitSelection}
            onOpenPicker={onOpenPicker}
          />
        )}
        <OutfitsHeaderBar
          activeTab={activeTab}
          showTabLabels={showTabLabels}
          activeView={activeView}
          onChangeTab={onChangeTab}
          onChangeView={onChangeView}
          showViewToggle={showViewToggle}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onOpenSort={onOpenSort}
          hasActiveFilters={hasActiveFilters}
          showSearch={showSearch}
        />
      </View>
    </Animated.View>
  );
}
