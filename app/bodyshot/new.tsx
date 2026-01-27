/**
 * New Bodyshot Screen (Refactored)
 * Generate full-body studio model photo from photo + headshot
 */

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useImageGeneration } from '@/hooks/profile';
import { supabase } from '@/lib/supabase';
import PolicyBlockModal from '@/components/PolicyBlockModal';

interface HeadshotOption {
  id: string;
  url: string;
}

export default function NewBodyshotScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [headshots, setHeadshots] = useState<HeadshotOption[]>([]);
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(null);
  const [loadingHeadshots, setLoadingHeadshots] = useState(true);

  const {
    generating,
    loadingMessage,
    uploadedUri,
    policyModalVisible,
    policyMessage,
    pickImage,
    clearImage,
    generateBodyShot,
    closePolicyModal,
  } = useImageGeneration();

  // Load user's headshots
  useEffect(() => {
    if (user) {
      loadHeadshots();
    }
  }, [user]);

  const loadHeadshots = async () => {
    if (!user) return;

    setLoadingHeadshots(true);

    try {
      // Get all headshots
      const { data: images } = await supabase
        .from('images')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('source', 'ai_generated')
        .order('created_at', { ascending: false });

      if (images) {
        // Filter headshots by checking AI jobs
        const { data: jobs } = await supabase
          .from('ai_jobs')
          .select('*')
          .eq('owner_user_id', user.id)
          .eq('job_type', 'headshot_generate')
          .eq('status', 'succeeded');

        const headshotIds = new Set(
          jobs?.map((j) => j.result?.image_id || j.result?.generated_image_id).filter(Boolean) || []
        );

        const headshotImages = images
          .filter((img) => headshotIds.has(img.id))
          .map((img) => {
            const { data: urlData } = supabase.storage
              .from(img.storage_bucket || 'media')
              .getPublicUrl(img.storage_key);
            return { id: img.id, url: urlData.publicUrl };
          });

        setHeadshots(headshotImages);
      }
    } catch (error) {
      console.error('Error loading headshots:', error);
    } finally {
      setLoadingHeadshots(false);
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedHeadshotId) return;

    const generatedImageId = await generateBodyShot(user.id, selectedHeadshotId);
    if (generatedImageId) {
      router.replace(`/bodyshot/${generatedImageId}` as any);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Bodyshot</Text>
          <View style={styles.backButton} />
        </View>

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
                    onPress={handleGenerate}
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
