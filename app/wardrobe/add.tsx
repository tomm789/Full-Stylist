/**
 * Add Wardrobe Item Screen (Refactored)
 * Screen for adding new wardrobe items with AI analysis
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddWardrobeItem } from '@/hooks/wardrobe';
import {
  Header,
  LoadingOverlay,
} from '@/components/shared';
import ImageCropper from '@/components/wardrobe/ImageCropper';
import { theme, commonStyles } from '@/styles';
import { Image } from 'expo-image';

const { colors, spacing, borderRadius, typography } = theme;

export default function AddItemScreen() {
  const router = useRouter();
  const {
    selectedImages,
    handleTakePhoto,
    handleUploadPhoto,
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

  if (wardrobeLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible={true} message="Loading..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Add Item"
        leftContent={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {selectedImages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="image-outline" size={64} color={colors.gray400} />
            <Text style={styles.emptyTitle}>Add Photos</Text>
            <Text style={styles.emptyMessage}>Take a photo or upload from your library</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUploadPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
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

const styles = StyleSheet.create({
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
    fontSize: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
