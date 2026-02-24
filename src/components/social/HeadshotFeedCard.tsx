/**
 * HeadshotFeedCard Component
 * Display a headshot in the social feed (3:4 aspect ratio, no try-on badge)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

interface HeadshotFeedCardProps {
  headshot: {
    id: string;
    storage_bucket: string;
    storage_key: string;
    width?: number;
    height?: number;
  };
  imageUrl: string | null;
  loading?: boolean;
  onPress?: () => void;
}

export default function HeadshotFeedCard({
  headshot,
  imageUrl,
  loading = false,
  onPress,
}: HeadshotFeedCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={onPress ? 0.85 : 1}>
      {loading || !imageUrl ? (
        <View style={styles.imagePlaceholder}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.placeholderText}>No image</Text>
          )}
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  });
