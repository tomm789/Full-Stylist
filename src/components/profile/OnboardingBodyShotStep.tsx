/**
 * OnboardingBodyShotStep Component (Improved)
 * Body shot generation step in onboarding - matches styling of bodyshot/new.tsx
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface OnboardingBodyShotStepProps {
  onComplete: () => void;
  onSkip: () => void;
  generating: boolean;
  loadingMessage: string;
  uploadedUri: string | null;
  onPickImage: () => void;
  onGenerate: () => void;
}

export function OnboardingBodyShotStep({
  onSkip,
  generating,
  loadingMessage,
  uploadedUri,
  onPickImage,
  onGenerate,
}: OnboardingBodyShotStepProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.stepIndicator}>Step 2 of 2</Text>
          <Text style={styles.title}>Create Your Studio Model</Text>
          <Text style={styles.subtitle}>
            Upload a full-body photo to combine with your headshot and create studio-quality model photos
          </Text>
        </View>

        {/* Upload Body Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Body Photo</Text>
          <Text style={styles.hint}>
            Upload a full-body photo to combine with your headshot
          </Text>

          {!uploadedUri ? (
            <>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onPickImage}
                disabled={generating}
              >
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtext}>Use your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={onPickImage}
                disabled={generating}
              >
                <Ionicons name="images-outline" size={32} color={colors.primary} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Upload Photo</Text>
                  <Text style={styles.optionSubtext}>Choose from library</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.imagePreviewContainer}>
                <ExpoImage
                  source={{ uri: uploadedUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  generating && styles.generateButtonDisabled,
                ]}
                onPress={onGenerate}
                disabled={generating}
              >
                <Ionicons name="sparkles-outline" size={20} color={colors.textLight} />
                <Text style={styles.generateButtonText}>
                  {generating ? loadingMessage : 'Generate Studio Model'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer Actions */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={generating}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    marginBottom: spacing.xxxl,
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
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  optionSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing.lg,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  footerSection: {
    marginTop: spacing.xxl,
    paddingTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
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
