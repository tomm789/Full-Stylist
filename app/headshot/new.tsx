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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Headshot</Text>
          <View style={styles.backButton} />
        </View>

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
                <Ionicons name="camera-outline" size={32} color="#007AFF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtext}>Use your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => pickImage(false)}
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

              <TouchableOpacity style={styles.retakeButton} onPress={clearImage}>
                <Ionicons name="camera-reverse-outline" size={20} color="#007AFF" />
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
                <Ionicons name="sparkles-outline" size={20} color="#fff" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  uploadSection: {
    gap: 16,
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
});
