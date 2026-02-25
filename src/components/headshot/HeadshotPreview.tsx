import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

interface HeadshotPreviewProps {
  imageUrl: string | null;
}

export default function HeadshotPreview({ imageUrl }: HeadshotPreviewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.previewCard}>
      <Text style={styles.sectionTitle}>Preview</Text>
      <View style={styles.previewFrame}>
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.previewImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="person-circle-outline" size={72} color={colors.gray400} />
            <Text style={styles.previewPlaceholderText}>
              Add a headshot to preview
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    previewCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: 0,
    },
    previewFrame: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.gray100,
      aspectRatio: 3 / 4,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewPlaceholder: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    previewPlaceholderText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
    },
  });
