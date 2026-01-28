/**
 * FilterPillGroup Component
 * Reusable component for pill-based filters
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';

const { spacing } = theme;

interface FilterPill {
  id: string;
  label: string;
}

interface FilterPillGroupProps {
  label: string;
  pills: FilterPill[];
  selectedId: string | null | string[];
  onToggle: (id: string) => void;
  showAllOption?: boolean;
  allLabel?: string;
}

export function FilterPillGroup({
  label,
  pills,
  selectedId,
  onToggle,
  showAllOption = true,
  allLabel = 'All',
}: FilterPillGroupProps) {
  const isSelected = (id: string) => {
    if (Array.isArray(selectedId)) {
      return selectedId.includes(id);
    }
    return selectedId === id;
  };

  const handleToggle = (id: string) => {
    if (Array.isArray(selectedId)) {
      const newIds = isSelected(id)
        ? selectedId.filter((selectedId) => selectedId !== id)
        : [...selectedId, id];
      onToggle(newIds as any);
    } else {
      onToggle(id);
    }
  };

  return (
    <View style={styles.pillsContainer}>
      {showAllOption && (
        <PillButton
          label={allLabel}
          selected={
            Array.isArray(selectedId)
              ? selectedId.length === 0
              : selectedId === null
          }
          onPress={() => onToggle(null as any)}
          size="small"
        />
      )}
      {pills.map((pill) => (
        <PillButton
          key={pill.id}
          label={pill.label.length > 20 ? `${pill.label.substring(0, 20)}...` : pill.label}
          selected={isSelected(pill.id)}
          onPress={() => handleToggle(pill.id)}
          size="small"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
