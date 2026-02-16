/**
 * Header Component
 * Reusable header with back button, title, and actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { createCommonStyles } from '@/styles/commonStyles';
import { useThemeColors } from '@/contexts/ThemeContext';

const { spacing, typography, layout } = theme;

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Fallback route when there's no navigation history (e.g. after page refresh) */
  backFallback?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'overlay';
}

export default function Header({
  title,
  showBack = false,
  onBack,
  backFallback = '/(tabs)/social',
  leftContent,
  rightContent,
  style,
  variant = 'default',
}: HeaderProps) {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(backFallback as any);
    }
  };

  const headerStyles = [
    commonStyles.header,
    variant === 'overlay' && commonStyles.headerOverlay,
    style,
  ];

  return (
    <View style={headerStyles}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
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
    padding: spacing.xs,
  },
});
