/**
 * LookbookCard Component
 * Card for displaying a lookbook with thumbnail and play button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Lookbook } from '@/lib/lookbooks';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface LookbookCardProps {
  lookbook: Lookbook;
  thumbnailUrl: string | null;
  loading?: boolean;
  onPress: () => void;
  onPlayPress: () => void;
}

export default function LookbookCard({
  lookbook,
  thumbnailUrl,
  loading = false,
  onPress,
  onPlayPress,
}: LookbookCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {loading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>📚</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.playButton}
        onPress={(e) => {
          e.stopPropagation();
          onPlayPress();
        }}
      >
        <Text style={styles.playButtonText}>▶</Text>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {lookbook.title}
        </Text>
        {lookbook.description && (
          <Text style={styles.description} numberOfLines={1}>
            {lookbook.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    width: 130,
    marginRight: spacing.sm + spacing.xs / 2,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  playButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: colors.white,
    fontSize: 14,
    marginLeft: 2,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.textPrimary,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
