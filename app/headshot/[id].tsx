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
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { triggerHeadshotGenerate, triggerAIJobExecution, pollAIJob, getAIJob } from '@/lib/ai-jobs';
import { updateUserSettings } from '@/lib/settings';

export default function HeadshotDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: headshotId } = useLocalSearchParams();
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [headshotImage, setHeadshotImage] = useState<any>(null);
  const [originalSelfieId, setOriginalSelfieId] = useState<string | null>(null);
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');
  const [originalHairStyle, setOriginalHairStyle] = useState('');
  const [originalMakeupStyle, setOriginalMakeupStyle] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (headshotId && user) {
      loadHeadshot();
    }
  }, [headshotId, user]);

  const loadHeadshot = async () => {
    if (!headshotId || typeof headshotId !== 'string' || !user) return;

    setLoading(true);
    try {
      // Load the headshot image
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('*')
        .eq('id', headshotId)
        .single();

      if (imageError || !image) {
        throw new Error('Headshot not found');
      }

      setHeadshotImage(image);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(image.storage_bucket || 'media')
        .getPublicUrl(image.storage_key);
      
      setHeadshotUrl(urlData.publicUrl);

      // Try to find the AI job that created this headshot to get original prompts
      const { data: jobs } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('job_type', 'headshot_generate')
        .order('created_at', { ascending: false })
        .limit(50);

      if (jobs) {
        // Find the job that created this image
        const job = jobs.find((j) => {
          if (j.status === 'succeeded') {
            const imageId = j.result?.image_id || j.result?.generated_image_id;
            if (imageId === headshotId) {
              return true;
            }
          }
          return false;
        });

        if (job && job.input) {
          const originalHair = job.input.hair_style || '';
          const originalMakeup = job.input.makeup_style || '';
          setHairStyle(originalHair);
          setMakeupStyle(originalMakeup);
          setOriginalHairStyle(originalHair);
          setOriginalMakeupStyle(originalMakeup);
          setOriginalSelfieId(job.input.selfie_image_id);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load headshot');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user || !originalSelfieId) {
      Alert.alert('Error', 'Cannot regenerate without original selfie');
      return;
    }

    setGenerating(true);
    setLoadingMessage('Creating headshot job...');
    
    try {
      // Create new headshot generation job using the same selfie
      const { data: headshotJob, error: jobError } = await triggerHeadshotGenerate(
        user.id,
        originalSelfieId,
        hairStyle || undefined,
        makeupStyle || undefined
      );

      if (headshotJob && !jobError) {
        // Auto-trigger the job
        await triggerAIJobExecution(headshotJob.id);
        
        setLoadingMessage('Regenerating headshot with your refinements...\nThis may take 20-30 seconds.');
        
        const { data: completedJob, error: pollError } = await pollAIJob(headshotJob.id, 30, 2000);
        
        if (pollError || !completedJob) {
          throw new Error('Headshot generation timed out or failed');
        }
        
        if (completedJob.status === 'failed') {
          throw new Error(`Generation failed: ${completedJob.error || 'Unknown error'}`);
        }
        
        const generatedImageId = completedJob.result?.image_id || completedJob.result?.generated_image_id;
        
        setGenerating(false);
        setLoadingMessage('');
        
        if (generatedImageId) {
          // Reload the current page with the new image
          router.replace(`/headshot/${generatedImageId}` as any);
        } else {
          // If no new image, reload the current page
          await loadHeadshot();
        }
      } else {
        throw jobError || new Error('Failed to create headshot job');
      }
    } catch (error: any) {
      setGenerating(false);
      setLoadingMessage('');
      Alert.alert('Error', error.message || 'Failed to generate headshot');
    }
  };

  const handleDuplicate = async () => {
    if (!user || !headshotUrl) {
      Alert.alert('Error', 'Cannot duplicate headshot');
      return;
    }

    setGenerating(true);
    setLoadingMessage('Duplicating headshot...');
    
    try {
      // Fetch the current headshot image as a blob
      const response = await fetch(headshotUrl);
      const blob = await response.blob();
      
      // Upload the duplicate to storage in the headshots folder using direct Supabase API
      const timestamp = Date.now();
      const storagePath = `${user.id}/ai/headshots/${timestamp}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create a new image record for the duplicate
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: user.id,
          storage_bucket: 'media',
          storage_key: uploadData.path,
          mime_type: 'image/jpeg',
          source: 'ai_generated',
        })
        .select()
        .single();

      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create duplicate image record');
      }

      setGenerating(false);
      setLoadingMessage('');
      
      // Navigate to the duplicate's detail page (replace so back goes to profile)
      router.replace(`/headshot/${imageRecord.id}` as any);
    } catch (error: any) {
      setGenerating(false);
      setLoadingMessage('');
      Alert.alert('Error', error.message || 'Failed to duplicate headshot');
    }
  };

  const handleSave = async () => {
    if (!user || !headshotId) return;

    try {
      const { error } = await updateUserSettings(user.id, {
        headshot_image_id: headshotId as string,
      } as any);

      if (error) {
        throw error;
      }

      // Update original values to current values after saving
      setOriginalHairStyle(hairStyle);
      setOriginalMakeupStyle(makeupStyle);

      Alert.alert('Success', 'Headshot set as active');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set headshot as active');
    }
  };

  const hasChanges = () => {
    return hairStyle !== originalHairStyle || makeupStyle !== originalMakeupStyle;
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!user || !headshotId || !headshotImage) return;

    setDeleting(true);
    try {
      // Delete from storage
      if (headshotImage.storage_key) {
        const { error: storageError } = await supabase.storage
          .from(headshotImage.storage_bucket || 'media')
          .remove([headshotImage.storage_key]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from images table
      const { error: imageError } = await supabase
        .from('images')
        .delete()
        .eq('id', headshotId)
        .eq('owner_user_id', user.id);

      if (imageError) {
        throw imageError;
      }

      // If this was the active headshot, clear it from user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('headshot_image_id')
        .eq('user_id', user.id)
        .single();

      if (settings?.headshot_image_id === headshotId) {
        await updateUserSettings(user.id, {
          headshot_image_id: null,
        } as any);
      }

      setDeleting(false);
      setShowDeleteConfirm(false);
      
      // Navigate back
      router.back();
    } catch (error: any) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      Alert.alert('Error', error.message || 'Failed to delete headshot');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Headshot</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const renderLoadingOverlay = () => {
    // Determine the title based on the loading message
    const title = loadingMessage.includes('Duplicating') 
      ? 'Duplicating Headshot' 
      : loadingMessage.includes('Regenerating')
        ? 'Regenerating Headshot'
        : 'Generating Headshot';
    
    return (
      <Modal
        visible={generating}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.generatingTitle}>{title}</Text>
            <Text style={styles.generatingMessage}>{loadingMessage}</Text>
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
          <Text style={styles.headerTitle}>Edit Headshot</Text>
          <View style={styles.headerActions}>
            {hasChanges() && (
              <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                <Ionicons name="save-outline" size={24} color="#007AFF" />
                <Text style={styles.headerButtonText}>Save</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDuplicate} style={styles.headerButton} disabled={generating}>
              <Ionicons name="copy-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.headerButton, styles.deleteButton]}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        {headshotUrl && (
          <View style={styles.imageContainer}>
            <ExpoImage
              source={{ uri: headshotUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        )}

        <View style={styles.refineSection}>
          <Text style={styles.sectionTitle}>Refine Your Headshot</Text>
          <Text style={styles.hint}>
            Adjust the prompts and regenerate with the same photo
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.generateButton, (generating || !originalSelfieId) && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating || !originalSelfieId}
          >
            <Ionicons name="sparkles-outline" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>Regenerate</Text>
          </TouchableOpacity>
        </View>

        {!originalSelfieId && (
          <Text style={styles.warningText}>
            Original photo not found. Regeneration unavailable, but you can still duplicate this headshot.
          </Text>
        )}
      </ScrollView>
      </SafeAreaView>
      {renderLoadingOverlay()}
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Headshot</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this headshot? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteButton: {
    // No special background, icon color will indicate delete action
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  refineSection: {
    marginBottom: 24,
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
  buttonContainer: {
    gap: 12,
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
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff3b30',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  warningText: {
    fontSize: 14,
    color: '#ff9500',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    marginTop: 16,
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
