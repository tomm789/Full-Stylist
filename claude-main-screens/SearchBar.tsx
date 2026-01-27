/**
 * SearchBar Component
 * Search input with filter and add buttons for wardrobe
 */

import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilter?: () => void;
  onAdd?: () => void;
  hasActiveFilters?: boolean;
  placeholder?: string;
  style?: ViewStyle;
}

export default function SearchBar({
  value,
  onChangeText,
  onFilter,
  onAdd,
  hasActiveFilters = false,
  placeholder = 'Search wardrobe...',
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      {onFilter && (
        <View
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
        >
          <IconButton
            icon="filter"
            onPress={onFilter}
            size={20}
            color={hasActiveFilters ? colors.white : colors.gray600}
          />
        </View>
      )}
      
      {onAdd && (
        <View style={styles.addButton}>
          <IconButton
            icon="add"
            onPress={onAdd}
            size={24}
            color={colors.white}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
