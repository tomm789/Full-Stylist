/**
 * HeaderAddMenu Component
 * Add menu button and modal for tabs header
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useCalendarEntryFlow } from '@/contexts/CalendarEntryFlowContext';
import HeaderTitleRow from './HeaderTitleRow';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

interface HeaderAddMenuProps {
  title: string;
}

export function HeaderAddMenu({ title }: HeaderAddMenuProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { openDateSelector } = useCalendarEntryFlow();

  const action = title.toLowerCase();
  const hasPrimaryAction = ['outfits', 'calendar', 'wardrobe', 'lookbooks'].includes(action);

  const handlePrimaryAction = () => {
    switch (action) {
      case 'outfits':
        router.push('/outfits/new' as any);
        break;
      case 'calendar':
        openDateSelector(new Date());
        break;
      case 'wardrobe':
        router.push('/wardrobe/add' as any);
        break;
      case 'lookbooks':
        router.push('/lookbooks/new' as any);
        break;
      default:
        break;
    }
  };

  return (
    <HeaderTitleRow
      title={title}
      rightSlot={
        hasPrimaryAction ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handlePrimaryAction}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  addButton: {
    padding: spacing.xs,
  },
});
