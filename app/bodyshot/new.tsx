import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { triggerBodyShotGenerate, triggerAIJobExecution, waitForAIJobCompletion, isGeminiPolicyBlockError } from '@/lib/ai-jobs';
import { getUserSettings } from '@/lib/settings';
import PolicyBlockModal from '@/components/PolicyBlockModal';

interface Headshot {
  id: string;
  url: string;
  created_at: string;
}

export default function NewBodyshotScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bodyPhotoUri, setBodyPhotoUri] = useState<string | null>(null);
  const [bodyPhotoBlob, setBodyPhotoBlob] = useState<Blob | null>(null);
  const [headshots, setHeadshots] = useState<Headshot[]>([]);
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(null);
  const [activeHeadshotId, setActiveHeadshotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadHeadshots();
    }
  }, [user]);

  const loadHeadshots = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user settings to get active headshot
      const { data: settings } = await getUserSettings(user.id);
      if (settings?.headshot_image_id) {
        setActiveHeadshotId(settings.headshot_image_id);
        setSelectedHeadshotId(settings.headshot_image_id); // Default to active headshot
      }

      // Load all user headshots
      const { data: allImages, error: imagesError } = await supabase
        .from('images')
        .select('id, storage_bucket, storage_key, created_at')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (imagesError) {
        console.error('Error loading headshots:', imagesError);
        setLoading(false);
        return;
      }

      if (allImages) {
        // Filter for headshots
        const headshotImages = allImages.filter(img => img.storage_key?.includes('/ai/headshots/'));
        
        const headshotsWithUrls = headshotImages.map((img) => {
          const { data } = supabase.storage
            .from(img.storage_bucket || 'media')
            .getPublicUrl(img.storage_key);
          return {
            id: img.id,
            url: data.publicUrl,
            created_at: img.created_at
          };
        });

        setHeadshots(headshotsWithUrls);

        // If no headshot selected yet and we have headshots, select the first one or active one
        if (!selectedHeadshotId && headshotsWithUrls.length > 0) {
          const toSelect = activeHeadshotId && headshotsWithUrls.find(h => h.id === activeHeadshotId)
            ? activeHeadshotId
            : headshotsWithUrls[0].id;
          setSelectedHeadshotId(toSelect);
        }
      }
    } catch (error: any) {
      console.error('Error loading headshots:', error);
      Alert.alert('Error', 'Failed to load headshots');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    // Use uriToBlob for proper file:// handling on iOS
    const { uriToBlob } = await import('@/lib/wardrobe');
    const blob = await uriToBlob(result.assets[0].uri, 'image/jpeg');
    
    setBodyPhotoUri(result.assets[0].uri);
    setBodyPhotoBlob(blob);
  };

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    // Use uriToBlob for proper file:// handling on iOS
    const { uriToBlob } = await import('@/lib/wardrobe');
    const blob = await uriToBlob(result.assets[0].uri, 'image/jpeg');
    
    setBodyPhotoUri(result.assets[0].uri);
    setBodyPhotoBlob(blob);
  };

  const handleRetake = () => {
    setBodyPhotoUri(null);
    setBodyPhotoBlob(null);
  };

  const handleGenerate = async () => {
    if (!user || !bodyPhotoBlob) {
      Alert.alert('Error', 'Please take or upload a body photo first');
      return;
    }

    if (headshots.length === 0) {
      Alert.alert('Headshot Required', 'Please generate a headshot first before creating a studio model.');
      return;
    }

    // Use selected headshot or fallback to active headshot
    const headshotToUse = selectedHeadshotId || activeHeadshotId;
    if (!headshotToUse) {
      Alert.alert('Headshot Required', 'Please select a headshot to combine with your body photo.');
      return;
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');
    
    try {
      // Upload body photo to storage
      const uploadResult = await uploadImageToStorage(user.id, bodyPhotoBlob, `body-${Date.now()}.jpg`);
      if (uploadResult.error) {
        throw uploadResult.error;
      }

      setLoadingMessage('Creating studio model job...');

      // Create image record
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: user.id,
          storage_bucket: 'media',
          storage_key: uploadResult.data!.path,
          mime_type: 'image/jpeg',
          source: 'upload',
        })
        .select()
        .single();

      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create image record');
      }

      // Create body shot generation job with selected headshot
      const { data: bodyShotJob, error: jobError } = await triggerBodyShotGenerate(
        user.id,
        imageRecord.id,
        headshotToUse
      );

      if (bodyShotJob && !jobError) {
        // Auto-trigger the job
        await triggerAIJobExecution(bodyShotJob.id);
        
        setLoadingMessage('Generating studio model...\nThis may take 30-40 seconds.');
        
        const { data: finalJob, error: pollError } = await waitForAIJobCompletion(
          bodyShotJob.id,
          60,
          2000,
          '[NewBodyshot]'
        );
        
        if (pollError || !finalJob) {
          throw new Error('Studio model generation timed out. You can check your profile later to see if it completed.');
        }
        
        if (finalJob.status === 'failed') {
          const failureMessage = finalJob.error || 'Unknown error';
          if (isGeminiPolicyBlockError(failureMessage)) {
            setGenerating(false);
            setLoadingMessage('');
            setPolicyMessage('Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.');
            setPolicyModalVisible(true);
            return;
          }
          throw new Error(`Generation failed: ${failureMessage}`);
        }
        
        // Get the generated body shot image ID from the job result
        const generatedImageId = finalJob.result?.image_id || finalJob.result?.generated_image_id;
        
        setGenerating(false);
        setLoadingMessage('');
        
        if (generatedImageId) {
          // Navigate to the body shot detail page
          router.replace(`/bodyshot/${generatedImageId}` as any);
        } else {
          Alert.alert('Success', 'Studio model generated successfully!');
          router.back();
        }
      } else {
        throw jobError || new Error('Failed to create body shot job');
      }
    } catch (error: any) {
      setGenerating(false);
      setLoadingMessage('');
      const message = error.message || 'Failed to generate studio model';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage('Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.');
        setPolicyModalVisible(true);
        return;
      }
      Alert.alert('Error', message);
    }
  };

  const renderLoadingOverlay = () => {
    return (
      <Modal
        visible={generating}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Generating Studio Model</Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Body Shot</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Body Shot</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          {!bodyPhotoUri ? (
            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Take or Upload a Body Photo</Text>
              <Text style={styles.hint}>
                Take or upload a full-body photo to create your studio model for outfit rendering
              </Text>

              <TouchableOpacity style={styles.optionButton} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={32} color="#007AFF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtext}>Use your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionButton} onPress={handleUploadPhoto}>
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
              <Text style={styles.sectionTitle}>Your Body Photo</Text>
              
              <View style={styles.imagePreviewContainer}>
                <ExpoImage
                  source={{ uri: bodyPhotoUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
              </View>

              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Ionicons name="camera-reverse-outline" size={20} color="#007AFF" />
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>

              {/* Headshot Selection Section */}
              <View style={styles.headshotSection}>
                <Text style={styles.sectionTitle}>Select Headshot</Text>
                <Text style={styles.hint}>
                  Choose which headshot to combine with your body photo
                </Text>

                {headshots.length === 0 ? (
                  <View style={styles.noHeadshotsContainer}>
                    <Ionicons name="person-outline" size={48} color="#ccc" />
                    <Text style={styles.noHeadshotsText}>
                      Please generate a headshot first
                    </Text>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => router.push('/headshot/new' as any)}
                    >
                      <Text style={styles.linkButtonText}>Create Headshot</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.headshotSlider}
                    contentContainerStyle={styles.headshotSliderContent}
                  >
                    {headshots.map((headshot) => {
                      const isSelected = selectedHeadshotId === headshot.id;
                      const isActive = activeHeadshotId === headshot.id;
                      
                      return (
                        <TouchableOpacity
                          key={headshot.id}
                          style={[
                            styles.headshotItem,
                            isSelected && styles.headshotItemSelected
                          ]}
                          onPress={() => setSelectedHeadshotId(headshot.id)}
                        >
                          <ExpoImage
                            source={{ uri: headshot.url }}
                            style={styles.headshotImage}
                            contentFit="cover"
                          />
                          {isSelected && (
                            <View style={styles.selectedBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                            </View>
                          )}
                          {isActive && !isSelected && (
                            <View style={styles.activeBadge}>
                              <Text style={styles.activeBadgeText}>Active</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (generating || headshots.length === 0) && styles.generateButtonDisabled
                ]}
                onPress={handleGenerate}
                disabled={generating || headshots.length === 0}
              >
                <Ionicons name="sparkles-outline" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Studio Model</Text>
              </TouchableOpacity>
            </View>
          )}
      </ScrollView>
      </SafeAreaView>
      {renderLoadingOverlay()}
      <PolicyBlockModal
        visible={policyModalVisible}
        message={policyMessage}
        onClose={() => setPolicyModalVisible(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headshotSection: {
    marginTop: 8,
  },
  headshotSlider: {
    marginTop: 12,
  },
  headshotSliderContent: {
    paddingRight: 20,
    gap: 12,
  },
  headshotItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  headshotItemSelected: {
    borderColor: '#007AFF',
  },
  headshotImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  activeBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  noHeadshotsContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 12,
  },
  noHeadshotsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  linkButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
