/**
 * FeedOutfitCard Component
 * Display outfit in feed with optional try-on badge
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/styles';

const { colors, spacing } = theme;

interface FeedOutfitCardProps {
  outfit: any;
  imageUrl: string | null | undefined;
  onPress: () => void;
  tryOnAvatarUrl?: string | null;
  loading?: boolean;
}

export default function FeedOutfitCard({
  outfit,
  imageUrl,
  onPress,
  tryOnAvatarUrl,
  loading = false,
}: FeedOutfitCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {loading || !imageUrl ? (
        <View style={styles.imagePlaceholder}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.placeholderText}>No image</Text>
          )}
        </View>
      ) : (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
      )}

      {/* Try-on badge */}
      {tryOnAvatarUrl && (
        <View style={styles.tryOnBadge}>
          <Image source={{ uri: tryOnAvatarUrl }} style={styles.tryOnAvatar} />
        </View>
      )}

      {/* Title */}
      {outfit.title && <Text style={styles.title}>{outfit.title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 0,
    backgroundColor: colors.backgroundSecondary,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 0,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  tryOnBadge: {
    position: 'absolute',
    top: spacing.sm + spacing.xs / 2,
    right: spacing.sm + spacing.xs / 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  tryOnAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs / 2,
    color: colors.textPrimary,
  },
});
