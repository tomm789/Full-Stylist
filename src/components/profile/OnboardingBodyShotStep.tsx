/**
 * OnboardingBodyShotStep Component (Improved)
 * Mirror selfie capture step in onboarding
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface OnboardingBodyShotStepProps {
  onSkip: () => void;
  processing: boolean;
  uploadedUri: string | null;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  onUndo: () => void;
  onAccept: () => void;
}

export function OnboardingBodyShotStep({
  onSkip,
  processing,
  uploadedUri,
  onPickCamera,
  onPickLibrary,
  onUndo,
  onAccept,
}: OnboardingBodyShotStepProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.stepIndicator}>Step 3 of 3</Text>
          <Text style={styles.title}>Mirror Selfie</Text>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>For best results:</Text>
          <View style={styles.instructionsItem}>
            <Text style={styles.instructionsBullet}>•</Text>
            <Text style={styles.instructionsText}>Turn the lights to max brightness</Text>
          </View>
          <View style={styles.instructionsItem}>
            <Text style={styles.instructionsBullet}>•</Text>
            <Text style={styles.instructionsText}>
              Hold your phone exactly vertical (or parallel to the mirror)
            </Text>
          </View>
          <View style={styles.instructionsItem}>
            <Text style={styles.instructionsBullet}>•</Text>
            <Text style={styles.instructionsText}>
              Don't use a wide-angle lens to take the photo
            </Text>
          </View>
          <View style={styles.instructionsItem}>
            <Text style={styles.instructionsBullet}>•</Text>
            <Text style={styles.instructionsText}>
              Ensure you can be seen from head to toe on your phone screen, and it's showing your head, upper body, and lower body in proportion.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.imagePreviewContainer}>
            {uploadedUri ? (
              <ExpoImage
                source={{ uri: uploadedUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
            ) : (
              <TouchableOpacity
                style={styles.placeholder}
                onPress={onPickCamera}
                disabled={processing}
              >
                <Ionicons name="camera-outline" size={42} color={colors.textSecondary} />
                <Text style={styles.placeholderText}>Tap to open camera</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.mediaButton}
              onPress={onPickLibrary}
              disabled={processing}
            >
              <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {uploadedUri ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.undoButton}
                onPress={onUndo}
                disabled={processing}
              >
                <Ionicons name="arrow-undo-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  processing && styles.acceptButtonDisabled,
                ]}
                onPress={onAccept}
                disabled={processing}
              >
                <Text style={styles.acceptButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Footer Actions */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={processing}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  stepIndicator: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  instructions: {
    marginBottom: spacing.xxl,
  },
  instructionsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  instructionsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  instructionsBullet: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.normal,
  },
  instructionsText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  placeholderText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mediaButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  undoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  acceptButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  footerSection: {
    marginTop: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  skipButton: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
});
