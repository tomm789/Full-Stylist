/**
 * SearchResultItem Component
 * Individual search result item
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '@/hooks/search';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  resultIcon: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTertiary,
  },
  resultInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resultTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  typeLabel: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  typeLabelText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  resultSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
});

interface SearchResultItemProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}

export function SearchResultItem({ result, onPress }: SearchResultItemProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return 'person-circle-outline';
      case 'outfit':
        return 'shirt-outline';
      case 'lookbook':
        return 'albums-outline';
      case 'wardrobe_item':
        return 'pricetag-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return 'User';
      case 'outfit':
        return 'Outfit';
      case 'lookbook':
        return 'Lookbook';
      case 'wardrobe_item':
        return 'Item';
      default:
        return 'Unknown';
    }
  };

  return (
    <TouchableOpacity style={styles.resultItem} onPress={() => onPress(result)}>
      <View style={styles.resultIcon}>
        {result.type === 'user' && result.avatarUrl ? (
          <ExpoImage
            source={{ uri: result.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name={getResultIcon(result.type)} size={48} color={colors.textTertiary} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.resultTitle}>{result.title}</Text>
          <View style={styles.typeLabel}>
            <Text style={styles.typeLabelText}>{getResultTypeLabel(result.type)}</Text>
          </View>
        </View>
        {result.subtitle && (
          <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}
