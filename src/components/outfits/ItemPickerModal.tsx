/**
 * ItemPickerModal Component
 * Modal for selecting wardrobe items for outfit
 */

import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { WardrobeItem } from '@/lib/wardrobe';
import { BottomSheet } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface ItemPickerModalProps {
  visible: boolean;
  onClose: () => void;
  items: WardrobeItem[];
  itemImageUrls: Map<string, string>;
  onSelectItem: (item: WardrobeItem) => void;
  title?: string;
}

export default function ItemPickerModal({
  visible,
  onClose,
  items,
  itemImageUrls,
  onSelectItem,
  title = 'Select Item',
}: ItemPickerModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const imageUrl = itemImageUrls.get(item.id);
          return (
            <TouchableOpacity
              style={styles.itemOption}
              onPress={() => onSelectItem(item)}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
              <Text style={styles.itemText} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items in this category</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  listContent: {
    padding: spacing.md,
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm + spacing.xs / 2,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray500,
  },
  itemText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  emptyText: {
    padding: spacing.lg,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
});
