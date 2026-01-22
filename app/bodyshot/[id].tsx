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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function BodyshotDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: bodyshotId } = useLocalSearchParams();
  const [bodyshotUrl, setBodyshotUrl] = useState<string | null>(null);
  const [bodyshotImage, setBodyshotImage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (bodyshotId && user) {
      loadBodyshot();
    }
  }, [bodyshotId, user]);

  const loadBodyshot = async () => {
    if (!bodyshotId || typeof bodyshotId !== 'string' || !user) return;

    setLoading(true);
    try {
      // Load the bodyshot image
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('*')
        .eq('id', bodyshotId)
        .single();

      if (imageError || !image) {
        throw new Error('Body shot not found');
      }

      setBodyshotImage(image);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(image.storage_bucket || 'media')
        .getPublicUrl(image.storage_key);
      
      setBodyshotUrl(urlData.publicUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load body shot');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!user || !bodyshotUrl) {
      Alert.alert('Error', 'Cannot duplicate body shot');
      return;
    }

    setGenerating(true);
    
    try {
      // Fetch the current bodyshot image as a blob
      const response = await fetch(bodyshotUrl);
      const blob = await response.blob();
      
      // Upload the duplicate to storage in the body_shots folder
      const timestamp = Date.now();
      const storagePath = `${user.id}/ai/body_shots/${timestamp}.jpg`;
      
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
      
      // Navigate to the duplicate's detail page
      router.replace(`/bodyshot/${imageRecord.id}` as any);
    } catch (error: any) {
      setGenerating(false);
      Alert.alert('Error', error.message || 'Failed to duplicate body shot');
    }
  };


  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!user || !bodyshotId || !bodyshotImage) return;

    setDeleting(true);
    try {
      // Delete from storage
      if (bodyshotImage.storage_key) {
        const { error: storageError } = await supabase.storage
          .from(bodyshotImage.storage_bucket || 'media')
          .remove([bodyshotImage.storage_key]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from images table
      const { error: imageError } = await supabase
        .from('images')
        .delete()
        .eq('id', bodyshotId)
        .eq('owner_user_id', user.id);

      if (imageError) {
        throw imageError;
      }

      // If this was the active body shot, clear it from user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('body_shot_image_id')
        .eq('user_id', user.id)
        .single();

      if (settings?.body_shot_image_id === bodyshotId) {
        await updateUserSettings(user.id, {
          body_shot_image_id: null,
        } as any);
      }

      setDeleting(false);
      setShowDeleteConfirm(false);
      
      // Navigate back
      router.back();
    } catch (error: any) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      Alert.alert('Error', error.message || 'Failed to delete body shot');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Body Shot</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
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
          <Text style={styles.headerTitle}>Studio Model</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleDuplicate} style={styles.headerButton} disabled={generating}>
              <Ionicons name="copy-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.headerButton, styles.deleteButton]}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          {bodyshotUrl && (
            <View style={styles.imageContainer}>
              <ExpoImage
                source={{ uri: bodyshotUrl }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Studio Model</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this studio model? This action cannot be undone.
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
    padding: 8,
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
});
