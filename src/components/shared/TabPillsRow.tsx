/**
 * TabPillsRow Component
 * Shared pill-style tab row with optional filter icon and add button.
 */

import React from 'react';
import { View, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

export type TabPillItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  removable?: boolean;
};

type TabPillsRowProps = {
  pills: TabPillItem[];
  activeId: string;
  onPress: (id: string) => void;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  showFilter?: boolean;
  onFilter?: () => void;
  hasActiveFilters?: boolean;
};

export default function TabPillsRow({
  pills,
  activeId,
  onPress,
  onRemove,
  onAdd,
  showFilter = true,
  onFilter,
  hasActiveFilters = false,
}: TabPillsRowProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.pillRow}>
      <View style={styles.pillRowInner}>
        {showFilter && onFilter && (
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={onFilter}
            accessibilityLabel="Filters"
          >
            <Ionicons name="options-outline" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
        <FlatList
          horizontal
          data={pills}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PillButton
              label={item.label}
              icon={item.icon}
              selected={activeId === item.id}
              onPress={() => onPress(item.id)}
              onRemove={
                item.removable && onRemove ? () => onRemove(item.id) : undefined
              }
              variant="default"
              size="medium"
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillList}
          style={styles.pillFlatList}
          ListFooterComponent={
            onAdd ? (
              <TouchableOpacity style={styles.addButton} onPress={onAdd}>
                <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  pillRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  pillRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
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
  pillFlatList: {
    flexGrow: 0,
  },
  pillList: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
});
