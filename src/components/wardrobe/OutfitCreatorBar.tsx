/**
 * OutfitCreatorBar Component
 * Bar showing selected items for outfit creation
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, IconButton, ImagePlaceholder } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius } = theme;

interface SelectedItem {
  id: string;
  imageUrl: string | null;
}

interface OutfitCreatorBarProps {
  selectedItems: SelectedItem[];
  onRemoveItem: (itemId: string) => void;
  onGenerate: () => void;
  onExit: () => void;
}

export default function OutfitCreatorBar({
  selectedItems,
  onRemoveItem,
  onGenerate,
  onExit,
}: OutfitCreatorBarProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <>
      {/* Selection Bar */}
      <View style={styles.bar}>
        <ScrollView
          horizontal
          style={styles.scroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
                  <ImagePlaceholder text="" iconSize={24} />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveItem(item.id)}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <IconButton
          icon="close"
          onPress={onExit}
          size={24}
          color={colors.textPrimary}
        />
      </View>

      {/* Generate Button */}
      {selectedItems.length > 0 && (
        <View style={styles.generateContainer}>
          <PrimaryButton
            title={`Generate Outfit (${selectedItems.length} items)`}
            onPress={onGenerate}
            fullWidth
          />
        </View>
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundTertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  itemCard: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  generateContainer: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
});
