/**
 * New Bodyshot Screen (Refactored)
 * Generate full-body studio model photo from photo + headshot
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useNewBodyshot } from '@/hooks/profile';
import { useImageGeneration } from '@/hooks/profile';
import { useAuth } from '@/contexts/AuthContext';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import { Header, HeaderActionButton } from '@/components/shared/layout';

export default function NewBodyshotScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const imageGeneration = useImageGeneration();
  const {
    headshots,
    loadingHeadshots,
    selectedHeadshotId,
    setSelectedHeadshotId,
    generating,
    loadingMessage,
    uploadedUri,
    policyModalVisible,
    policyMessage,
    pickImage,
    clearImage,
    closePolicyModal,
    handleGenerate,
  } = useNewBodyshot();

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Header
          title="New Bodyshot"
          leftContent={
            <HeaderActionButton
              label="Cancel"
              onPress={() => router.back()}
              variant="secondary"
            />
          }
        />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          {/* Step 1: Select Headshot */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select a Headshot</Text>
            <Text style={styles.hint}>
              Choose a headshot to use for your bodyshot generation
            </Text>

            {loadingHeadshots ? (
              <ActivityIndicator style={styles.loader} />
            ) : headshots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="image-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No headshots available</Text>
                <TouchableOpacity
                  style={styles.createHeadshotButton}
                  onPress={() => router.push('/headshot/new' as any)}
                >
                  <Text style={styles.createHeadshotButtonText}>Create Headshot</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={headshots}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.headshotOption,
                      selectedHeadshotId === item.id && styles.headshotOptionSelected,
                    ]}
                    onPress={() => setSelectedHeadshotId(item.id)}
                  >
                    <ExpoImage
                      source={{ uri: item.url }}
                      style={styles.headshotImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    {selectedHeadshotId === item.id && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.headshotList}
              />
            )}
          </View>

          {/* Step 2: Upload Photo */}
          {selectedHeadshotId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Upload Body Photo</Text>
              <Text style={styles.hint}>
                Upload a full-body photo to combine with your headshot
              </Text>

              {!uploadedUri ? (
                <>
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

                  <TouchableOpacity style={styles.retakeButton} onPress={clearImage}>
                    <Ionicons name="camera-reverse-outline" size={20} color="#007AFF" />
                    <Text style={styles.retakeButtonText}>Retake Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.generateButton,
                      generating && styles.generateButtonDisabled,
                    ]}
                    onPress={async () => {
                      // Performance tracking: Start time (button click)
                      const startTime = performance.now();
                      console.log('[PERF] Button clicked at:', startTime);

                      if (!user || !selectedHeadshotId) return;

                      const generatedImageId = await imageGeneration.generateBodyShot(
                        user.id,
                        selectedHeadshotId
                      );
                      
                      // Performance tracking: API response time
                      const apiResponseTime = performance.now();
                      const backendProcessingTime = apiResponseTime - startTime;
                      console.log('[PERF] API response received at:', apiResponseTime);
                      console.log('[PERF] Backend processing duration:', backendProcessingTime.toFixed(2), 'ms');

                      if (generatedImageId) {
                        // Pass timing data via route params
                        router.replace({
                          pathname: `/bodyshot/${generatedImageId}` as any,
                          params: {
                            perfStartTime: startTime.toString(),
                            perfApiResponseTime: apiResponseTime.toString(),
                          },
                        } as any);
                      }
                    }}
                    disabled={generating}
                  >
                    <Ionicons name="sparkles-outline" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>Generate Bodyshot</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Loading Overlay */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Generating Bodyshot</Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Policy Block Modal */}
      <PolicyBlockModal
        visible={policyModalVisible}
        message={policyMessage}
        onClose={closePolicyModal}
      />
    </>
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
  loader: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
  },
  createHeadshotButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createHeadshotButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headshotList: {
    paddingVertical: 8,
  },
  headshotOption: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  headshotOptionSelected: {
    borderColor: '#007AFF',
  },
  headshotImage: {
    width: 120,
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
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
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
