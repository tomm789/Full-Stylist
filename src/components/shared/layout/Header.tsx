/**
 * Header Component
 * Reusable header with back button, title, and actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, typography, layout } = theme;

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
}

export default function Header({
  title,
  showBack = false,
  onBack,
  leftContent,
  rightContent,
  style,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[commonStyles.header, style]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        {leftContent}
      </View>

      {title && <Text style={commonStyles.headerTitle}>{title}</Text>}

      <View style={styles.right}>{rightContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs / 2,
  },
});
