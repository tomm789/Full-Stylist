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
  onComplete,
  onSkip,
  generating,
  loadingMessage,
  uploadedUri,
  onPickImage,
  onGenerate,
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
                <Ionicons name="sparkles-outline" size={20} color="#fff" />
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
  section: {
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
    marginBottom: 12,
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
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
