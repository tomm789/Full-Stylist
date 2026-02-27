import React from 'react';
import { Animated, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import OutfitsHeaderBar from './OutfitsHeaderBar';
import OccasionPills from './OccasionPills';
import type { OutfitsTab } from './OutfitsHeaderBar';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

export type OutfitsHeaderSectionProps = {
  headerReady: boolean;
  headerHeight: number | undefined;
  headerOpacity: Animated.Value | number;
  headerTranslate: Animated.Value | number;
  uiHidden: boolean;
  onHeaderLayout: (event: any) => void;
  activeTab: OutfitsTab;
  showTabLabels: boolean;
  activeView: 'grid' | 'feed';
  onChangeTab: (tab: OutfitsTab) => void;
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
  pinnedLookbooks?: { id: string; title: string }[];
  onAddLookbookTab?: () => void;
  onRemoveLookbookTab?: (id: string) => void;
  occasionOptions?: string[];
  selectedOccasions?: string[];
  onToggleOccasion?: (occasion: string) => void;
  onClearOccasions?: () => void;
  showOccasionPills?: boolean;
  searchHeader?: React.ReactNode;
  hideTabs?: boolean;
};

export default function OutfitsHeaderSection({
  headerReady,
  headerHeight,
  headerOpacity,
  headerTranslate,
  uiHidden,
  onHeaderLayout,
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
  pinnedLookbooks,
  onAddLookbookTab,
  onRemoveLookbookTab,
  occasionOptions = [],
  selectedOccasions = [],
  onToggleOccasion,
  onClearOccasions,
  showOccasionPills = true,
  searchHeader,
  hideTabs = false,
}: OutfitsHeaderSectionProps) {
  const colors = useThemeColors();
  const sectionStyles = createStyles(colors);

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          height: headerHeight,
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }],
        },
      ]}
      pointerEvents={uiHidden ? 'none' : 'auto'}
    >
      <View onLayout={onHeaderLayout}>
        {searchHeader}
        {!hideTabs && (
          <>
            <OutfitsHeaderBar
              activeTab={activeTab}
              showTabLabels={showTabLabels}
              activeView={activeView}
              onChangeTab={onChangeTab}
              onChangeView={onChangeView}
              showViewToggle={showViewToggle}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onOpenSort={onOpenSort ?? (() => {})}
              hasActiveFilters={hasActiveFilters ?? false}
              showSearch={showSearch}
            />
            {showOccasionPills &&
              occasionOptions.length > 0 &&
              onToggleOccasion &&
              onClearOccasions && (
                <View style={sectionStyles.filterAndOccasionsRow}>
                  {onOpenSort && (
                    <TouchableOpacity
                      style={[sectionStyles.filterButton, hasActiveFilters && sectionStyles.filterButtonActive]}
                      onPress={onOpenSort}
                      accessibilityLabel="Sort / Filter"
                    >
                      <Ionicons
                        name="options-outline"
                        size={18}
                        color={hasActiveFilters ? colors.textLight : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  <View style={sectionStyles.occasionPillsWrap}>
                    <OccasionPills
                      occasions={occasionOptions}
                      selectedOccasions={selectedOccasions}
                      onToggleOccasion={onToggleOccasion}
                      onClear={onClearOccasions}
                    />
                  </View>
                </View>
              )}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    filterAndOccasionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.backgroundDark,
    },
    filterButton: {
      marginLeft: spacing.sm,
      marginRight: spacing.xs,
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.backgroundDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    occasionPillsWrap: {
      flex: 1,
      minWidth: 0,
    },
  });
