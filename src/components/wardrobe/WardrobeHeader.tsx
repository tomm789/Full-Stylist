/**
 * WardrobeHeader Component
 * Header for the wardrobe screen: search row + filter/category pills.
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderTabPill } from '@/components/shared';
import { WardrobeTabIcon } from '@/components/icons/tabs';
import SearchHeaderRow from '@/components/search/SearchHeaderRow';
import { CategoryPills } from '@/components/wardrobe';
import type { WardrobeCategory, WardrobeSubcategory } from '@/lib/wardrobe';
import type { ThemeColors } from '@/styles/themeColors';

interface WardrobeHeaderProps {
  colors: ThemeColors;
  styles: Record<string, any>;
  activeTab: 'my' | 'following' | 'discover';
  onTabChange: (tab: 'my' | 'following' | 'discover') => void;
  onOpenCamera: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchToggle: (open: boolean) => void;
  searchOpen: boolean;
  avatarUri?: string;
  avatarInitials?: string;
  onProfile: () => void;
  hasDraft: boolean;
  outfitCreatorMode: boolean;
  onRestoreDraft: () => void;
  hasActiveFilters: boolean;
  onOpenFilterDrawer: () => void;
  categories: WardrobeCategory[];
  subcategories: WardrobeSubcategory[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onSelectSubcategory: (id: string | null) => void;
}

const PILLS = [
  {
    id: 'my',
    label: 'My Wardrobe',
    icon: 'shirt-outline' as const,
    iconComponent: ({ size, color }: { size: number; color: string }) => (
      <WardrobeTabIcon width={size} height={size} color={color} fill={color} />
    ),
  },
  { id: 'following', label: 'Following', icon: 'people-outline' as const },
  { id: 'discover', label: 'Discover', icon: 'compass-outline' as const },
];

export default function WardrobeHeader({
  colors,
  styles,
  activeTab,
  onTabChange,
  onOpenCamera,
  searchQuery,
  onSearchChange,
  onSearchToggle,
  searchOpen,
  avatarUri,
  avatarInitials,
  onProfile,
  hasDraft,
  outfitCreatorMode,
  onRestoreDraft,
  hasActiveFilters,
  onOpenFilterDrawer,
  categories,
  subcategories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
}: WardrobeHeaderProps) {
  return (
    <>
      <SearchHeaderRow
        title="Wardrobe"
        leftIcon="camera-outline"
        onLeftAction={onOpenCamera}
        centerSlot={
          <HeaderTabPill
            pills={PILLS}
            activeId={activeTab}
            onPress={(id) => onTabChange(id as 'my' | 'following' | 'discover')}
          />
        }
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchToggle={onSearchToggle}
        searchOpen={searchOpen}
        placeholder="Search wardrobe..."
        avatarUri={avatarUri}
        avatarInitials={avatarInitials}
        onProfile={onProfile}
      />

      {/* Filter icon + Category Pills row */}
      <View style={styles.filterAndCategoriesRow}>
        {hasDraft && !outfitCreatorMode && (
          <TouchableOpacity
            style={styles.draftButton}
            onPress={onRestoreDraft}
            accessibilityLabel="Open draft outfit"
          >
            <Ionicons name="bookmark" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={onOpenFilterDrawer}
          accessibilityLabel="Filters"
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? colors.textLight : colors.textSecondary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <CategoryPills
            categories={categories}
            subcategories={subcategories}
            selectedCategoryId={selectedCategoryId}
            selectedSubcategoryId={selectedSubcategoryId}
            onSelectCategory={onSelectCategory}
            onSelectSubcategory={onSelectSubcategory}
          />
        </View>
      </View>
    </>
  );
}
