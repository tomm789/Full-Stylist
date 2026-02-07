/**
 * FeedbackFilterBar Component
 * Category and status filters for feedback threads
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';

const { colors, spacing } = theme;

interface FeedbackFilterBarProps {
  selectedCategory: 'bug' | 'feature' | 'general' | 'other' | 'all';
  selectedStatus: 'open' | 'in_progress' | 'resolved' | 'closed' | 'all';
  onCategoryChange: (category: 'bug' | 'feature' | 'general' | 'other' | 'all') => void;
  onStatusChange: (status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'all') => void;
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export function FeedbackFilterBar({
  selectedCategory,
  selectedStatus,
  onCategoryChange,
  onStatusChange,
}: FeedbackFilterBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Category:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtons}
        >
          {(['all', 'bug', 'feature', 'general', 'other'] as const).map((cat) => (
            <PillButton
              key={cat}
              label={cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              selected={selectedCategory === cat}
              onPress={() => onCategoryChange(cat)}
              variant="default"
              size="medium"
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtons}
        >
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(
            (status) => (
              <PillButton
                key={status}
                label={status === 'all' ? 'All' : getStatusLabel(status)}
                selected={selectedStatus === status}
                onPress={() => onStatusChange(status)}
                variant="default"
                size="medium"
              />
            )
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
});
