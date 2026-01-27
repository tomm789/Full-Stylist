/**
 * SortModal Component
 * Modal for sorting outfits by different criteria
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/shared';
import { theme } from '@/styles';
import { SortOption, SortOrder } from '@/hooks/outfits';

const { colors, spacing, borderRadius, typography } = theme;

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortOption;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortOption) => void;
  onOrderToggle: () => void;
}

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'rating', label: 'Rating' },
  { value: 'title', label: 'Title' },
];

export default function SortModal({
  visible,
  onClose,
  sortBy,
  sortOrder,
  onSortChange,
  onOrderToggle,
}: SortModalProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Sort By">
      <ScrollView style={styles.body}>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              sortBy === option.value && styles.optionActive,
            ]}
            onPress={() => onSortChange(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                sortBy === option.value && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.value && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.orderSection}>
          <Text style={styles.orderLabel}>Order</Text>
          <TouchableOpacity style={styles.orderButton} onPress={onOrderToggle}>
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.orderText}>
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.md,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  optionActive: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  orderSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orderLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  orderText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
});
