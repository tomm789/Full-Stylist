import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { triggerHeadshotGenerate, triggerBodyShotGenerate, triggerAIJobExecution, waitForAIJobCompletion, isGeminiPolicyBlockError } from '@/lib/ai-jobs';
import { getPublicImageUrl, getUserGeneratedImages } from '@/lib/images';
import PolicyBlockModal from '@/components/PolicyBlockModal';

export default function ProfileImagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  
  // Input fields
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');
  
  // Active selections
  const [headshotImageUrl, setHeadshotImageUrl] = useState<string | null>(null);
  const [bodyShotImageUrl, setBodyShotImageUrl] = useState<string | null>(null);
  
  // Galleries
  const [allHeadshots, setAllHeadshots] = useState<Array<{ id: string; url: string; created_at: string }>>([]);
  const [allBodyShots, setAllBodyShots] = useState<Array<{ id: string; url: string; created_at: string }>>([]);
  const [activeHeadshotId, setActiveHeadshotId] = useState<string | null>(null);
  const [activeBodyShotId, setActiveBodyShotId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Loading overlay state
  const [loadingMessage, setLoadingMessage] = useState('');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');

  useEffect(() => {
    if (!isLoadingData && user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user || isLoadingData) {
      return;
    }

    setIsLoadingData(true);
    setLoading(true);
    
    try {
      // Load settings to get active headshot and body shot
      const { data: settings, error: settingsError } = await getUserSettings(user.id);
      
      if (settingsError) {
        console.error('Settings load error:', settingsError);
        Alert.alert('Database Error', 'Unable to load profile settings. Please check your database connection.');
        setLoading(false);
        return;
      }
      
      if (settings) {
        const imageIds: string[] = [];
        if (settings.headshot_image_id) {
          setActiveHeadshotId(settings.headshot_image_id);
          imageIds.push(settings.headshot_image_id);
        }
        if (settings.body_shot_image_id) {
          setActiveBodyShotId(settings.body_shot_image_id);
          imageIds.push(settings.body_shot_image_id);
        }

        if (imageIds.length > 0) {
          try {
            const imageUrls = await Promise.race([
              loadImageUrls(imageIds),
              new Promise<Map<string, string | null>>((resolve) => setTimeout(() => resolve(new Map()), 5000))
            ]);
            if (settings.headshot_image_id) {
              setHeadshotImageUrl(imageUrls.get(settings.headshot_image_id) || null);
            }
            if (settings.body_shot_image_id) {
              setBodyShotImageUrl(imageUrls.get(settings.body_shot_image_id) || null);
            }
          } catch (e) {
            console.warn('Active image load timeout');
          }
        }
      }
      
      // Load all generated images with timeout
      try {
        await Promise.race([
          loadAllGeneratedImages(),
          new Promise((resolve) => setTimeout(resolve, 10000))
        ]);
      } catch (e) {
        console.warn('Gallery load timeout');
      }
    } catch (error: any) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Database queries are timing out. Please contact support.');
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const loadImageUrls = async (imageIds: string[]): Promise<Map<string, string | null>> => {
    const urls = new Map<string, string | null>();
    if (imageIds.length === 0) {
      return urls;
    }

    const { data: images } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .in('id', imageIds);

    images?.forEach((image) => {
      urls.set(image.id, getPublicImageUrl(image));
    });

    return urls;
  };

  const loadAllGeneratedImages = async () => {
    if (!user) return;
    
    try {
      const { headshots, bodyShots } = await getUserGeneratedImages(user.id);
      setAllHeadshots(headshots);
      setAllBodyShots(bodyShots);
    } catch (error: any) {
      console.error('Error loading generated images:', error);
    }
  };

  const handleUploadSelfie = async () => {
    
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    
    setUploadingSelfie(true);
    setLoadingMessage('Uploading photo...');

    try {
      // Convert URI to blob
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      // Upload to storage
      const uploadResult = await uploadImageToStorage(user.id, blob, `selfie-${Date.now()}.jpg`);
      if (uploadResult.error) {
        throw uploadResult.error;
      }


      setLoadingMessage('Creating headshot job...');

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

      // Create headshot generation job with hair and makeup styles
      const { data: headshotJob, error: jobError } = await triggerHeadshotGenerate(
        user.id,
        imageRecord.id,
        hairStyle || undefined,
        makeupStyle || undefined
      );

      if (headshotJob && !jobError) {
        // Auto-trigger the job
        await triggerAIJobExecution(headshotJob.id);

        setLoadingMessage('Generating professional headshot...\nThis may take 20-30 seconds.');

        const { data: completedJob, error: pollError } = await waitForAIJobCompletion(headshotJob.id, 30, 2000, '[ProfileImages]');

        if (pollError || !completedJob) {
          throw new Error('Headshot generation timed out or failed');
        }

        if (completedJob.status === 'failed') {
          const failureMessage = completedJob.error || 'Unknown error';
          if (isGeminiPolicyBlockError(failureMessage)) {
            setUploadingSelfie(false);
            setLoadingMessage('');
            setPolicyMessage('Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.');
            setPolicyModalVisible(true);
            return;
          }
          throw new Error(`Generation failed: ${failureMessage}`);
        }


        setUploadingSelfie(false);
        setLoadingMessage('');


        Alert.alert('Success', 'Headshot generated successfully!');
        // Clear input fields after successful generation
        setHairStyle('');
        setMakeupStyle('');
      } else {
        throw jobError || new Error('Failed to create headshot job');
      }

      // Reload data
      await loadData();
    } catch (error: any) {
      setUploadingSelfie(false);
      setLoadingMessage('');
      const message = error.message || 'Failed to upload selfie';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage('Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.');
        setPolicyModalVisible(true);
        return;
      }
      Alert.alert('Error', message);
    }
  };

  const handleUploadBodyPhoto = async () => {
    if (!user) return;

    // Check if user has generated headshot first
    if (!activeHeadshotId) {
      Alert.alert('Headshot Required', 'Please generate your professional headshot first before uploading a body photo.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingBody(true);
    setLoadingMessage('Uploading photo...');

    try {
      // Convert URI to blob
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      // Upload to storage
      const uploadResult = await uploadImageToStorage(user.id, blob, `body-${Date.now()}.jpg`);
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

      // Create body shot generation job - pass activeHeadshotId explicitly
      const { data: bodyShotJob, error: jobError } = await triggerBodyShotGenerate(
        user.id,
        imageRecord.id,
        activeHeadshotId || undefined
      );

      if (bodyShotJob && !jobError) {
        // Auto-trigger the job
        await triggerAIJobExecution(bodyShotJob.id);

        setLoadingMessage('Generating studio model...\nThis may take 30-40 seconds.');

        const { data: finalJob, error: pollError } = await waitForAIJobCompletion(
          bodyShotJob.id,
          60,
          2000,
          '[Profile]'
        );

        if (pollError || !finalJob) {
          throw new Error('Studio model generation timed out. You can check your profile later to see if it completed.');
        }

        if (finalJob.status === 'failed') {
          const failureMessage = finalJob.error || 'Unknown error';
          if (isGeminiPolicyBlockError(failureMessage)) {
            setUploadingBody(false);
            setLoadingMessage('');
            setPolicyMessage('Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.');
            setPolicyModalVisible(true);
            return;
          }
          throw new Error(`Generation failed: ${failureMessage}`);
        }


        setUploadingBody(false);
        setLoadingMessage('');

        Alert.alert('Success', 'Studio model generated successfully!');
      } else {
        throw jobError || new Error('Failed to create body shot job');
      }

      // Reload data
      await loadData();
    } catch (error: any) {
      setUploadingBody(false);
      setLoadingMessage('');
      const message = error.message || 'Failed to upload body photo';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage('Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.');
        setPolicyModalVisible(true);
        return;
      }
      Alert.alert('Error', message);
    }
  };

  const handleSelectHeadshot = async (imageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await updateUserSettings(user.id, {
        headshot_image_id: imageId
      } as any);
      
      if (error) {
        throw error;
      }
      
      Alert.alert('Success', 'Headshot selected as active');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select headshot');
    }
  };

  const handleSelectBodyShot = async (imageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await updateUserSettings(user.id, {
        body_shot_image_id: imageId
      } as any);
      
      if (error) {
        throw error;
      }
      
      Alert.alert('Success', 'Studio model selected as active');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select studio model');
    }
  };

  const renderLoadingOverlay = () => {
    const isLoading = uploadingSelfie || uploadingBody;
    
    
    return (
      <Modal
        visible={isLoading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onShow={() => {
        }}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.generatingTitle}>
              {uploadingSelfie ? 'Generating Headshot' : 'Generating Studio Model'}
            </Text>
            <Text style={styles.generatingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile Images</Text>
        </View>

      {/* Headshot Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Headshot</Text>
        <Text style={styles.hint}>
          Upload a selfie and customize your hairstyle and makeup
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Hairstyle</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Shoulder-length wavy hair, Short pixie cut"
            value={hairStyle}
            onChangeText={setHairStyle}
            editable={!uploadingSelfie}
          />
          <Text style={styles.inputHint}>Describe your desired hairstyle or leave blank to keep original</Text>

          <Text style={styles.label}>Makeup Style</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Natural look, Bold red lips, Smokey eye"
            value={makeupStyle}
            onChangeText={setMakeupStyle}
            editable={!uploadingSelfie}
          />
          <Text style={styles.inputHint}>Describe your desired makeup or leave blank for natural look</Text>
        </View>

        {headshotImageUrl && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Active Headshot</Text>
            <ExpoImage source={{ uri: headshotImageUrl }} style={styles.imagePreview} contentFit="cover" />
          </View>
        )}

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadSelfie}
          disabled={uploadingSelfie}
        >
          <Text style={styles.uploadButtonText}>
            {headshotImageUrl ? 'Generate New Headshot' : 'Upload Selfie & Generate'}
          </Text>
        </TouchableOpacity>

        {allHeadshots.length > 0 && (
          <View style={styles.galleryContainer}>
            <Text style={styles.galleryLabel}>All Generated Headshots ({allHeadshots.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {allHeadshots.map((headshot) => (
                <TouchableOpacity
                  key={headshot.id}
                  style={[
                    styles.galleryItem,
                    activeHeadshotId === headshot.id && styles.galleryItemActive
                  ]}
                  onPress={() => handleSelectHeadshot(headshot.id)}
                >
                  <ExpoImage 
                    source={{ uri: headshot.url }} 
                    style={styles.galleryImage} 
                    contentFit="cover" 
                  />
                  {activeHeadshotId === headshot.id && (
                    <View style={styles.galleryActiveBadge}>
                      <Text style={styles.galleryActiveBadgeText}>Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Body Shot Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Studio Model</Text>
        <Text style={styles.hint}>
          Upload a full-body photo to create your studio model for outfit rendering
        </Text>

        {bodyShotImageUrl && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Active Studio Model</Text>
            <ExpoImage source={{ uri: bodyShotImageUrl }} style={styles.imagePreview} contentFit="cover" />
          </View>
        )}

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadBodyPhoto}
          disabled={uploadingBody || !activeHeadshotId}
        >
          <Text style={styles.uploadButtonText}>
            {bodyShotImageUrl ? 'Generate New Studio Model' : 'Upload Body Photo & Generate'}
          </Text>
        </TouchableOpacity>

        {!activeHeadshotId && (
          <Text style={styles.warningText}>Generate a headshot first to create your studio model</Text>
        )}

        {allBodyShots.length > 0 && (
          <View style={styles.galleryContainer}>
            <Text style={styles.galleryLabel}>All Generated Studio Models ({allBodyShots.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {allBodyShots.map((bodyShot) => (
                <TouchableOpacity
                  key={bodyShot.id}
                  style={[
                    styles.galleryItem,
                    activeBodyShotId === bodyShot.id && styles.galleryItemActive
                  ]}
                  onPress={() => handleSelectBodyShot(bodyShot.id)}
                >
                  <ExpoImage 
                    source={{ uri: bodyShot.url }} 
                    style={styles.galleryImage} 
                    contentFit="cover" 
                  />
                  {activeBodyShotId === bodyShot.id && (
                    <View style={styles.galleryActiveBadge}>
                      <Text style={styles.galleryActiveBadgeText}>Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 8,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    color: '#ff9500',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    marginTop: 8,
  },
  galleryContainer: {
    marginTop: 16,
    gap: 8,
  },
  galleryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryItem: {
    width: 100,
    height: 150,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  galleryItemActive: {
    borderColor: '#007AFF',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryActiveBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#007AFF',
    paddingVertical: 4,
    alignItems: 'center',
  },
  galleryActiveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  generatingMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
