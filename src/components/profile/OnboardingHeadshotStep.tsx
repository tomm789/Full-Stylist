/**
 * OnboardingHeadshotStep Component (Improved)
 * Headshot generation step in onboarding - matches styling of headshot/new.tsx
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface OnboardingHeadshotStepProps {
  onComplete: () => void;
  onSkip: () => void;
  generating: boolean;
  loadingMessage: string;
  uploadedUri: string | null;
  hairStyle?: string;
  makeupStyle?: string;
  onPickImage: () => void;
  onGenerate: () => void;
  onHairStyleChange?: (style: string) => void;
  onMakeupStyleChange?: (style: string) => void;
}

export function OnboardingHeadshotStep({
  onSkip,
  generating,
  loadingMessage,
  uploadedUri,
  hairStyle = '',
  makeupStyle = '',
  onPickImage,
  onGenerate,
  onHairStyleChange,
  onMakeupStyleChange,
}: OnboardingHeadshotStepProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.stepIndicator}>Step 1 of 2</Text>
          <Text style={styles.title}>Create Your Headshot</Text>
          <Text style={styles.subtitle}>
            Upload a selfie to generate your professional headshot
          </Text>
        </View>

        {!uploadedUri ? (
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Take or Upload a Photo</Text>
            <Text style={styles.hint}>
              Take a selfie or upload a photo to generate a professional headshot
            </Text>

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
          </View>
        ) : (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Your Photo</Text>

            <View style={styles.imagePreviewContainer}>
              <ExpoImage
                source={{ uri: uploadedUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
            </View>

            <View style={styles.refineSection}>
              <Text style={styles.sectionTitle}>Refine Your Headshot</Text>
              <Text style={styles.hint}>
                Customize your hairstyle and makeup (optional)
              </Text>

              {onHairStyleChange && (
                <>
                  <Text style={styles.label}>Hairstyle</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Shoulder-length wavy hair, Short pixie cut"
                    value={hairStyle}
                    onChangeText={onHairStyleChange}
                    editable={!generating}
                    multiline
                  />
                  <Text style={styles.inputHint}>
                    Describe your desired hairstyle or leave blank to keep original
                  </Text>
                </>
              )}

              {onMakeupStyleChange && (
                <>
                  <Text style={styles.label}>Makeup Style</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Natural look, Bold red lips, Smokey eye"
                    value={makeupStyle}
                    onChangeText={onMakeupStyleChange}
                    editable={!generating}
                    multiline
                  />
                  <Text style={styles.inputHint}>
                    Describe your desired makeup or leave blank for natural look
                  </Text>
                </>
              )}
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
                {generating ? loadingMessage : 'Generate Headshot'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
  uploadSection: {
    gap: spacing.lg,
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
  previewSection: {
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  refineSection: {
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.backgroundSecondary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
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
