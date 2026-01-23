import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { triggerHeadshotGenerate, triggerAIJobExecution, waitForAIJobCompletion, isGeminiPolicyBlockError } from '@/lib/ai-jobs';
import PolicyBlockModal from '../components/PolicyBlockModal';

export default function NewHeadshotScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');

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

    // Show preview and allow user to accept or retake
    // Use uriToBlob for proper file:// handling on iOS
    const { uriToBlob } = await import('@/lib/wardrobe');
    const blob = await uriToBlob(result.assets[0].uri, 'image/jpeg');
    
    setSelfieUri(result.assets[0].uri);
    setSelfieBlob(blob);
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
    
    setSelfieUri(result.assets[0].uri);
    setSelfieBlob(blob);
  };

  const handleRetake = () => {
    setSelfieUri(null);
    setSelfieBlob(null);
  };

  const handleGenerate = async () => {
    if (!user || !selfieBlob) {
      Alert.alert('Error', 'Please take or upload a photo first');
      return;
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');
    
    try {
      // Upload selfie to storage
      const uploadResult = await uploadImageToStorage(user.id, selfieBlob, `selfie-${Date.now()}.jpg`);
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

      // Create headshot generation job
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
        
        const { data: completedJob, error: pollError } = await waitForAIJobCompletion(headshotJob.id, 30, 2000, '[Headshot]');
        
        if (pollError || !completedJob) {
          throw new Error('Headshot generation timed out or failed');
        }
        
        if (completedJob.status === 'failed') {
          const failureMessage = completedJob.error || 'Unknown error';
          if (isGeminiPolicyBlockError(failureMessage)) {
            setGenerating(false);
            setLoadingMessage('');
            setPolicyMessage('Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.');
            setPolicyModalVisible(true);
            return;
          }
          throw new Error(`Generation failed: ${failureMessage}`);
        }
        
        // Get the generated headshot image ID from the job result
        const generatedImageId = completedJob.result?.image_id || completedJob.result?.generated_image_id;
        
        setGenerating(false);
        setLoadingMessage('');
        
        if (generatedImageId) {
          // Navigate to the headshot detail page
          router.replace(`/headshot/${generatedImageId}` as any);
        } else {
          Alert.alert('Success', 'Headshot generated successfully!');
          router.back();
        }
      } else {
        throw jobError || new Error('Failed to create headshot job');
      }
    } catch (error: any) {
      setGenerating(false);
      setLoadingMessage('');
      const message = error.message || 'Failed to generate headshot';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage('Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.');
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
        onShow={() => {
        }}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Generating Headshot</Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
    );
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
        {!selfieUri ? (
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Take or Upload a Photo</Text>
            <Text style={styles.hint}>
              Take a selfie or upload a photo to generate a professional headshot
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
            <Text style={styles.sectionTitle}>Your Photo</Text>
            
            <View style={styles.imagePreviewContainer}>
              <ExpoImage
                source={{ uri: selfieUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
            </View>

            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
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
              <Text style={styles.generateButtonText}>Generate Headshot</Text>
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
