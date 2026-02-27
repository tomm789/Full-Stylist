/**
 * useAddWardrobeImages Hook
 * Image selection, cropping, and management for the add-wardrobe-item flow
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface SelectedImage {
  uri: string;
  type: string;
  name: string;
}

export function useAddWardrobeImages() {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  // Cropper state
  const [cropperVisible, setCropperVisible] = useState(false);
  const [cropperImageUri, setCropperImageUri] = useState<string | null>(null);

  const centerCropToSquare = useCallback(async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') return uri;
    try {
      const source = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      if (source.width === source.height) return uri;
      const side = Math.min(source.width, source.height);
      const originX = Math.floor((source.width - side) / 2);
      const originY = Math.floor((source.height - side) / 2);
      const cropped = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: side, height: side } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      return cropped.uri;
    } catch {
      return uri;
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes,
      allowsEditing: Platform.OS !== 'web',
      ...(Platform.OS !== 'web' ? { aspect: [1, 1] as [number, number] } : {}),
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Show cropper modal on web, or directly add on native
      if (Platform.OS === 'web') {
        setCropperImageUri(result.assets[0].uri);
        setCropperVisible(true);
      } else {
        // On native, ImagePicker editor enforces 1:1.
        const newImage = {
          uri: result.assets[0].uri,
          type: result.assets[0].type || 'image/jpeg',
          name: result.assets[0].fileName || `photo-${Date.now()}.jpg`,
        };
        setSelectedImages((prev) => [...prev, newImage]);
      }
    }
  }, []);

  const handleUploadPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: Platform.OS === 'web',
      allowsEditing: Platform.OS !== 'web',
      ...(Platform.OS !== 'web' ? { aspect: [1, 1] as [number, number] } : {}),
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      if (Platform.OS === 'web' && result.assets.length > 0) {
        // On web, show cropper for first image
        // For multiple images, we'd need to queue them, but for now handle one at a time
        setCropperImageUri(result.assets[0].uri);
        setCropperVisible(true);
      } else {
        // On native, ImagePicker editor enforces 1:1.
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `image-${Date.now()}.jpg`,
        }));
        setSelectedImages((prev) => [...prev, ...newImages]);
      }
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addImageFromUri = useCallback(async (uri: string) => {
    if (Platform.OS === 'web') {
      setCropperImageUri(uri);
      setCropperVisible(true);
      return;
    }

    // Inline camera captures are auto-centered to 1:1 based on the guide.
    const croppedUri = await centerCropToSquare(uri);
    const newImage: SelectedImage = {
      uri: croppedUri,
      type: 'image/jpeg',
      name: `photo-${Date.now()}.jpg`,
    };
    setSelectedImages((prev) => [...prev, newImage]);
  }, [centerCropToSquare]);

  const handleCropperCancel = useCallback(() => {
    setCropperVisible(false);
    setCropperImageUri(null);
  }, []);

  const handleCropperDone = useCallback((blob: Blob, fileName: string) => {
    // Convert blob to data URI for React Native compatibility
    if (Platform.OS === 'web') {
      // On web, create object URL from blob
      const objectUrl = URL.createObjectURL(blob);
      const newImage: SelectedImage = {
        uri: objectUrl,
        type: 'image/jpeg',
        name: fileName,
      };
      setSelectedImages((prev) => [...prev, newImage]);
    } else {
      // On native, convert blob to data URI
      blob.arrayBuffer().then((buffer) => {
        const bytes = new Uint8Array(buffer);
        const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
        const base64 = btoa(binary);
        const dataUri = `data:image/jpeg;base64,${base64}`;
        const newImage: SelectedImage = {
          uri: dataUri,
          type: 'image/jpeg',
          name: fileName,
        };
        setSelectedImages((prev) => [...prev, newImage]);
      });
    }

    setCropperVisible(false);
    setCropperImageUri(null);
  }, []);

  return {
    selectedImages,
    setSelectedImages,
    handleTakePhoto,
    handleUploadPhoto,
    removeImage,
    addImageFromUri,
    // Cropper state/handlers
    cropperVisible,
    cropperImageUri,
    handleCropperCancel,
    handleCropperDone,
    centerCropToSquare,
  };
}
