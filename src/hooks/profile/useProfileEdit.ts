/**
 * useProfileEdit Hook
 * Handle profile editing and avatar upload
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateUserProfile } from '@/lib/user';
import { updateUserSettings } from '@/lib/settings';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

interface UseProfileEditProps {
  userId: string | undefined;
  onSuccess?: () => Promise<void>;
}

interface UseProfileEditReturn {
  savingProfile: boolean;
  uploadingAvatar: boolean;
  saveProfile: (handle: string, displayName: string) => Promise<boolean>;
  uploadAvatar: () => Promise<void>;
}

export function useProfileEdit({
  userId,
  onSuccess,
}: UseProfileEditProps): UseProfileEditReturn {
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const validateHandle = (h: string): boolean => {
    const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return handleRegex.test(h);
  };

  const saveProfile = async (handle: string, displayName: string): Promise<boolean> => {
    if (!userId) return false;

    if (!handle.trim()) {
      Alert.alert('Error', 'Please enter a handle');
      return false;
    }

    if (!validateHandle(handle.trim())) {
      Alert.alert(
        'Invalid Handle',
        'Handle must be 3-20 characters and contain only letters, numbers, and underscores'
      );
      return false;
    }

    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return false;
    }

    setSavingProfile(true);

    try {
      const { error } = await updateUserProfile(userId, {
        handle: handle.trim(),
        display_name: displayName.trim(),
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'This handle is already taken. Please choose another.');
        } else {
          Alert.alert('Error', error.message || 'Failed to save profile');
        }
        return false;
      }

      Alert.alert('Success', 'Profile updated successfully');
      if (onSuccess) {
        await onSuccess();
      }
      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadAvatar = async () => {
    if (!userId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      const uploadResult = await uploadImageToStorage(
        userId,
        blob,
        `avatar-${Date.now()}.jpg`
      );
      if (uploadResult.error) throw uploadResult.error;

      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: userId,
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

      const { error: updateError } = await updateUserSettings(userId, {
        headshot_image_id: imageRecord.id,
      } as any);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Avatar updated successfully');
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return {
    savingProfile,
    uploadingAvatar,
    saveProfile,
    uploadAvatar,
  };
}
