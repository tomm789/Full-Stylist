/**
 * SystemLookbookCard Component
 * Card for displaying system lookbooks (favorites, recent, top)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SystemLookbookData } from '@/hooks/lookbooks';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface SystemLookbookCardProps {
  lookbook: SystemLookbookData;
  onPress: () => void;
  onPlayPress: () => void;
}

export default function SystemLookbookCard({
  lookbook,
  onPress,
  onPlayPress,
}: SystemLookbookCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {lookbook.coverImageUrl ? (
        <Image
          source={{ uri: lookbook.coverImageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{lookbook.icon}</Text>
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
        <Text style={styles.description} numberOfLines={1}>
          {lookbook.outfits.length} outfits
        </Text>
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
