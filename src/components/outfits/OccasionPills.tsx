/**
 * OccasionPills Component
 * Horizontal scrolling occasion pills for filtering outfits.
 */

import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

type OccasionPillsProps = {
  occasions: string[];
  selectedOccasions: string[];
  onToggleOccasion: (occasion: string) => void;
  onClear: () => void;
};

export default function OccasionPills({
  occasions,
  selectedOccasions,
  onToggleOccasion,
  onClear,
}: OccasionPillsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (occasions.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={occasions}
        keyExtractor={(item) => item}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={5}
        renderItem={({ item }) => (
          <PillButton
            label={item.length > 22 ? `${item.substring(0, 22)}...` : item}
            selected={selectedOccasions.includes(item)}
            onPress={() => onToggleOccasion(item)}
            size="small"
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <PillButton
            label="All"
            selected={selectedOccasions.length === 0}
            onPress={onClear}
            size="small"
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
});
