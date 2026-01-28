/**
 * OnboardingHeadshotStep Component
 * Headshot generation step in onboarding
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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
  const handleGenerate = () => {
    onGenerate();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Headshot</Text>
      <Text style={styles.subtitle}>
        Upload a selfie to generate your professional headshot
      </Text>

      <View style={styles.imageSection}>
        {uploadedUri ? (
          <ExpoImage
            source={{ uri: uploadedUri }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onPickImage}
          >
            <Ionicons name="camera-outline" size={48} color="#666" />
            <Text style={styles.uploadText}>Upload Selfie</Text>
          </TouchableOpacity>
        )}
      </View>

      {uploadedUri && (
        <View style={styles.optionsSection}>
          {onHairStyleChange && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Hairstyle (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., Shoulder-length wavy hair"
                value={hairStyle}
                onChangeText={onHairStyleChange}
                editable={!generating}
              />
              <Text style={styles.fieldHint}>
                Describe your desired hairstyle or leave blank to keep original
              </Text>
            </View>
          )}

          {onMakeupStyleChange && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Makeup Style (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., Natural look, Bold red lips"
                value={makeupStyle}
                onChangeText={onMakeupStyleChange}
                editable={!generating}
              />
              <Text style={styles.fieldHint}>
                Describe your desired makeup or leave blank for natural look
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleGenerate}
          disabled={!uploadedUri || generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate Headshot</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={onSkip}
        >
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>

      {generating && loadingMessage && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
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
    marginBottom: 32,
  },
  imageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#f0f0f0',
  },
  uploadButton: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  actions: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#000',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  optionsSection: {
    width: '100%',
    marginBottom: 24,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
  },
});
