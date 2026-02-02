/**
 * New Headshot Screen (Refactored)
 * Generate professional headshot from selfie
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useImageGeneration } from '@/hooks/profile';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';
import { Header, HeaderActionButton } from '@/components/shared/layout';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

export default function NewHeadshotScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');

  const {
    generating,
    loadingMessage,
    uploadedUri,
    policyModalVisible,
    policyMessage,
    error,
    clearError,
    pickImage,
    clearImage,
    generateHeadshot,
    closePolicyModal,
  } = useImageGeneration();

  const handleGenerate = async () => {
    if (!user) return;

    // Performance tracking: Start time (button click)
    const startTime = performance.now();
    console.log('[PERF] Button clicked at:', startTime);

    const imageId = await generateHeadshot(user.id, hairStyle, makeupStyle);

    // Performance tracking: API response time
    const apiResponseTime = performance.now();
    const backendProcessingTime = apiResponseTime - startTime;
    console.log('[PERF] API response received at:', apiResponseTime);
    console.log('[PERF] Backend processing duration:', backendProcessingTime.toFixed(2), 'ms');

    if (imageId) {
      Alert.alert('Success', 'Headshot generated successfully!');
      // Pass timing data via route params
      router.replace({
        pathname: `/headshot/${imageId}` as any,
        params: {
          perfStartTime: startTime.toString(),
          perfApiResponseTime: apiResponseTime.toString(),
        },
      } as any);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Header
          title="New Headshot"
          leftContent={
            <HeaderActionButton
              label="Cancel"
              onPress={() => router.back()}
              variant="secondary"
            />
          }
        />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          {!uploadedUri ? (
            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Take or Upload a Photo</Text>
              <Text style={styles.hint}>
                Take a selfie or upload a photo to generate a professional headshot
              </Text>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => pickImage(true)}
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
                onPress={() => pickImage(false)}
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

              <TouchableOpacity style={styles.retakeButton} onPress={clearImage}>
                <Ionicons name="camera-reverse-outline" size={20} color={colors.primary} />
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>

              <View style={styles.refineSection}>
                <Text style={styles.sectionTitle}>Refine Your Headshot</Text>
                <Text style={styles.hint}>
                  Customize your hairstyle and makeup (optional)
                </Text>

                <Text style={styles.label}>Hairstyle</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Shoulder-length wavy hair, Short pixie cut"
                  value={hairStyle}
                  onChangeText={setHairStyle}
                  editable={!generating}
                  multiline
                />
                <Text style={styles.inputHint}>
                  Describe your desired hairstyle or leave blank to keep original
                </Text>

                <Text style={styles.label}>Makeup Style</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Natural look, Bold red lips, Smokey eye"
                  value={makeupStyle}
                  onChangeText={setMakeupStyle}
                  editable={!generating}
                  multiline
                />
                <Text style={styles.inputHint}>
                  Describe your desired makeup or leave blank for natural look
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.generateButton, generating && styles.generateButtonDisabled]}
                onPress={handleGenerate}
                disabled={generating}
              >
                <Ionicons name="sparkles-outline" size={20} color={colors.textLight} />
                <Text style={styles.generateButtonText}>
                  {generating ? loadingMessage : 'Generate Headshot'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <PolicyBlockModal
        visible={policyModalVisible}
        message={policyMessage}
        onClose={closePolicyModal}
      />

      <ErrorModal
        visible={!!error && !generating}
        message={error || undefined}
        onClose={clearError}
      />
    </>
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
  uploadSection: {
    gap: spacing.lg,
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
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  retakeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
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
});
