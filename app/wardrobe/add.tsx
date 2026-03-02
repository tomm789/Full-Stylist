/**
 * Add Wardrobe Item Screen
 * Screen for adding new wardrobe items with AI analysis.
 * Expects either an imageUri param (from camera overlay) or an action param
 * (photo/upload) for fallback auto-launch from external callers.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddWardrobeItem } from '@/hooks/wardrobe';
import {
  Header,
  LoadingOverlay,
  LoadingSpinner,
} from '@/components/shared';
import { HeaderIconButton } from '@/components/shared/layout';
import ImageCropper from '@/components/wardrobe/ImageCropper';
import { theme } from '@/styles';
import { Image } from 'expo-image';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export default function AddItemScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { action, imageUri } = useLocalSearchParams<{ action?: string; imageUri?: string }>();
  const didAutoActionRef = useRef(false);
  const {
    selectedImages,
    handleTakePhoto,
    handleUploadPhoto,
    addImageFromUri,
    removeImage,
    cropperVisible,
    cropperImageUri,
    handleCropperCancel,
    handleCropperDone,
    loading,
    generatingAI,
    analysisStep,
    aiError,
    handleSubmit,
    wardrobeLoading,
  } = useAddWardrobeItem();

  useEffect(() => {
    if (didAutoActionRef.current) return;
    didAutoActionRef.current = true;

    // If a pre-captured image URI was passed (from camera overlay), add it directly
    if (imageUri) {
      void addImageFromUri(decodeURIComponent(imageUri));
      return;
    }

    // Fallback auto-launch for external callers (HeaderAddMenu, tab menu, etc.)
    if (action === 'photo') {
      handleTakePhoto();
    } else if (action === 'upload') {
      handleUploadPhoto();
    } else {
      // No image and no action — redirect back
      router.back();
    }
  }, [action, imageUri, handleTakePhoto, handleUploadPhoto, addImageFromUri, router]);

  if (wardrobeLoading) {
    return (
      <View style={styles.container}>
        <View style={commonStyles.loadingContainer}>
          <LoadingSpinner text="Loading..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Add Item"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {selectedImages.length > 0 && (
          <>
            <View style={styles.imageGrid}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.image}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading || generatingAI}
            >
              <Text style={styles.submitButtonText}>
                {loading || generatingAI ? 'Processing...' : 'Add Item'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <LoadingOverlay
        visible={generatingAI}
        message={analysisStep || 'Processing your item...'}
      />

      {aiError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{aiError}</Text>
        </View>
      )}

      <ImageCropper
        visible={cropperVisible}
        imageUri={cropperImageUri || ''}
        onCancel={handleCropperCancel}
        onDone={handleCropperDone}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
  },
  submitButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
