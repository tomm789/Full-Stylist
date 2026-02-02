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
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

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
  onComplete,
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
              <Ionicons name="camera-outline" size={32} color="#007AFF" />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionSubtext}>Use your camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={onPickImage}
              disabled={generating}
            >
              <Ionicons name="images-outline" size={32} color="#007AFF" />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Upload Photo</Text>
                <Text style={styles.optionSubtext}>Choose from library</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
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
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
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
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  uploadSection: {
    gap: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  previewSection: {
    gap: 16,
    marginBottom: 32,
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  refineSection: {
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
