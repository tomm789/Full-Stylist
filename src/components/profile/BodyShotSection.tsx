/**
 * BodyShotSection Component
 * Body shot generation section for profile images
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ProfileImageGallery } from './ProfileImageGallery';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

interface ProfileImage {
  id: string;
  url: string;
  created_at: string;
}

interface BodyShotSectionProps {
  bodyShotImageUrl: string | null;
  uploadedUri: string | null;
  generating: boolean;
  hasActiveHeadshot: boolean;
  allBodyShots: ProfileImage[];
  activeBodyShotId: string | null;
  onUploadBodyPhoto: () => Promise<void>;
  onGenerateBodyShot: () => Promise<void>;
  onClearImage: () => void;
  onSelectImage: (imageId: string) => Promise<void>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginBottom: spacing.huge,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  previewContainer: {
    marginBottom: spacing.lg,
  },
  previewLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },
  uploadedPreview: {
    marginBottom: spacing.lg,
  },
  uploadedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing.md,
  },
  uploadButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  uploadButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  generateButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  generateButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  cancelButton: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  warningText: {
    fontSize: typography.fontSize.md,
    color: colors.warning,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export function BodyShotSection({
  bodyShotImageUrl,
  uploadedUri,
  generating,
  hasActiveHeadshot,
  allBodyShots,
  activeBodyShotId,
  onUploadBodyPhoto,
  onGenerateBodyShot,
  onClearImage,
  onSelectImage,
}: BodyShotSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Studio Model</Text>
      <Text style={styles.hint}>
        Upload a full-body photo to create your studio model for outfit rendering
      </Text>

      {bodyShotImageUrl && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Active Studio Model</Text>
          <ExpoImage
            source={{ uri: bodyShotImageUrl }}
            style={styles.imagePreview}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={activeBodyShotId || bodyShotImageUrl}
          />
        </View>
      )}

      {uploadedUri ? (
        <View style={styles.uploadedPreview}>
          <ExpoImage
            source={{ uri: uploadedUri }}
            style={styles.uploadedImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={uploadedUri}
          />
          <TouchableOpacity
            style={styles.generateButton}
            onPress={onGenerateBodyShot}
            disabled={generating || !hasActiveHeadshot}
          >
            {generating ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <Text style={styles.generateButtonText}>Generate Studio Model</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClearImage}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadBodyPhoto}
          disabled={generating || !hasActiveHeadshot}
        >
          <Text style={styles.uploadButtonText}>
            {bodyShotImageUrl
              ? 'Upload New Body Photo'
              : 'Upload Body Photo & Generate'}
          </Text>
        </TouchableOpacity>
      )}

      {!hasActiveHeadshot && (
        <Text style={styles.warningText}>
          Generate a headshot first to create your studio model
        </Text>
      )}

      {allBodyShots.length > 0 && (
        <ProfileImageGallery
          title={`All Generated Studio Models (${allBodyShots.length})`}
          images={allBodyShots}
          activeImageId={activeBodyShotId}
          onSelectImage={onSelectImage}
        />
      )}
    </View>
  );
}
