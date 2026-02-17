/**
 * OutfitCreatorContainer Component
 * Displays selected items and category shortcuts for quick filtering during outfit creation
 */

import React, { useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder, WardrobeCategoryIcon } from '@/components/shared';
import HeadshotSelectorCard from './HeadshotSelectorCard';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory } from '@/lib/wardrobe';

const { spacing, borderRadius } = theme;

interface SelectedItem {
  id: string;
  imageUrl: string | null;
}

interface OutfitCreatorContainerProps {
  selectedItems: SelectedItem[];
  categories: WardrobeCategory[];
  onRemoveItem: (itemId: string) => void;
  onCategorySelect: (categoryId: string) => void;
  selectedCategoryId?: string | null;
  currentHeadshotUrl: string | null;
  onHeadshotSelect: () => void;
  selectedCategoryIds?: Set<string>;
}

export default function OutfitCreatorContainer({
  selectedItems,
  categories,
  onRemoveItem,
  onCategorySelect,
  selectedCategoryId,
  currentHeadshotUrl,
  onHeadshotSelect,
  selectedCategoryIds,
}: OutfitCreatorContainerProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {/* Headshot Selector Card */}
        <HeadshotSelectorCard
          headshotUrl={currentHeadshotUrl}
          onSelect={onHeadshotSelect}
        />

        {/* Selected Items */}
        {selectedItems.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.itemImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <ImagePlaceholder text="" iconSize={20} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveItem(item.id)}
              hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Category Shortcuts */}
        {categories.length > 0 && (
          <View style={styles.categoryShortcutsContainer}>
            {categories
              .filter((category) => !selectedCategoryIds?.has(category.id))
              .map((category) => {
                const isSelected = selectedCategoryId === category.id;
                const iconColor = isSelected
                  ? colors.primary
                  : colors.textTertiary;
                const opacity = isSelected ? 1 : 0.6;

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryShortcut,
                      isSelected && styles.categoryShortcutSelected,
                    ]}
                    onPress={() => onCategorySelect(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryIconContainer, { opacity }]}>
                      <WardrobeCategoryIcon
                        categoryName={category.name}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.categoryPlusIcon}>
                      <Ionicons
                        name="add-circle"
                        size={14}
                        color={colors.black}
                        style={styles.plusIconOverlay}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl + 60 + spacing.md, // Position above the pill (pill height 60 + spacing)
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  itemCard: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.gray200,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.white,
    borderRadius: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryShortcutsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  categoryShortcut: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryShortcutSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  categoryIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPlusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  plusIconOverlay: {
    padding: 2,
  },
});
