/**
 * SearchBar Component
 * Reusable search bar with filter and add buttons
 */

import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import IconButton from '../buttons/IconButton';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  onFilter?: () => void;
  onAdd?: () => void;
  hasActiveFilters?: boolean;
  showFilter?: boolean;
  showAdd?: boolean;
  containerStyle?: ViewStyle;
}

export default function SearchBar({
  value,
  onChangeText,
  onFilter,
  onAdd,
  hasActiveFilters = false,
  showFilter = true,
  showAdd = true,
  containerStyle,
  placeholder = 'Search...',
  ...textInputProps
}: SearchBarProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textPlaceholder}
        autoCapitalize="none"
        {...textInputProps}
      />
      
      {showFilter && onFilter && (
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
      
      {showAdd && onAdd && (
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
    padding: spacing.sm + spacing.xs / 2,
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
