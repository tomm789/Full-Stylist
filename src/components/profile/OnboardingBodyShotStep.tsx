/**
 * OnboardingBodyShotStep Component
 * Body shot generation step in onboarding
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  const handleGenerate = () => {
    onGenerate();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Studio Model</Text>
      <Text style={styles.subtitle}>
        Upload a body photo to combine with your headshot
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
            <Text style={styles.uploadText}>Upload Body Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleGenerate}
          disabled={!uploadedUri || generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate Studio Model</Text>
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
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  uploadButton: {
    width: 300,
    height: 400,
    borderRadius: 12,
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
});
