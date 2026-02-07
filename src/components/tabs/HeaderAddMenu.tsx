/**
 * HeaderAddMenu Component
 * Add menu button and modal for tabs header
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';

const { colors, typography, spacing } = theme;

interface HeaderAddMenuProps {
  title: string;
}

export function HeaderAddMenu({ title }: HeaderAddMenuProps) {
  const router = useRouter();

  const action = title.toLowerCase();
  const hasPrimaryAction = ['outfits', 'calendar', 'wardrobe', 'lookbooks'].includes(action);

  const handlePrimaryAction = () => {
    switch (action) {
      case 'outfits':
        router.push('/outfits/new' as any);
        break;
      case 'calendar':
        router.push('/(tabs)/calendar?openAddPicker=true' as any);
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
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitleText}>{title}</Text>
      {hasPrimaryAction && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handlePrimaryAction}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  addButton: {
    padding: spacing.xs,
  },
});
