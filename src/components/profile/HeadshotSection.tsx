/**
 * HeadshotSection Component
 * Headshot generation section for profile images
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
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

interface HeadshotSectionProps {
  hairStyle: string;
  makeupStyle: string;
  onHairStyleChange: (style: string) => void;
  onMakeupStyleChange: (style: string) => void;
  headshotImageUrl: string | null;
  uploadedUri: string | null;
  generating: boolean;
  allHeadshots: ProfileImage[];
  activeHeadshotId: string | null;
  onUploadSelfie: () => Promise<void>;
  onGenerateHeadshot: () => Promise<void>;
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
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
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
});

export function HeadshotSection({
  hairStyle,
  makeupStyle,
  onHairStyleChange,
  onMakeupStyleChange,
  headshotImageUrl,
  uploadedUri,
  generating,
  allHeadshots,
  activeHeadshotId,
  onUploadSelfie,
  onGenerateHeadshot,
  onClearImage,
  onSelectImage,
}: HeadshotSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Professional Headshot</Text>
      <Text style={styles.hint}>
        Upload a selfie and customize your hairstyle and makeup
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Hairstyle</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Shoulder-length wavy hair, Short pixie cut"
          value={hairStyle}
          onChangeText={onHairStyleChange}
          editable={!generating}
          blurOnSubmit
        />
        <Text style={styles.inputHint}>
          Describe your desired hairstyle or leave blank to keep original
        </Text>

        <Text style={styles.label}>Makeup Style</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Natural look, Bold red lips, Smokey eye"
          value={makeupStyle}
          onChangeText={onMakeupStyleChange}
          editable={!generating}
          blurOnSubmit
        />
        <Text style={styles.inputHint}>
          Describe your desired makeup or leave blank for natural look
        </Text>
      </View>

      {headshotImageUrl && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Active Headshot</Text>
          <ExpoImage
            source={{ uri: headshotImageUrl }}
            style={styles.imagePreview}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={activeHeadshotId || headshotImageUrl}
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
            onPress={onGenerateHeadshot}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <Text style={styles.generateButtonText}>Generate Headshot</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClearImage}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadSelfie}
          disabled={generating}
        >
          <Text style={styles.uploadButtonText}>
            {headshotImageUrl ? 'Upload New Selfie' : 'Upload Selfie & Generate'}
          </Text>
        </TouchableOpacity>
      )}

      {allHeadshots.length > 0 && (
        <ProfileImageGallery
          title={`All Generated Headshots (${allHeadshots.length})`}
          images={allHeadshots}
          activeImageId={activeHeadshotId}
          onSelectImage={onSelectImage}
        />
      )}
    </View>
  );
}
