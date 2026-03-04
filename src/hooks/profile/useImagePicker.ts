/**
 * useImagePicker Hook
 * Image picking, cropping, and selection state for headshot/body shot flows
 */

import { useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showErrorToast } from '@/utils/toast';
import * as ImageManipulator from 'expo-image-manipulator';
import { uriToBlob } from '@/lib/utils/image-helpers';

export function useImagePicker() {
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);

  const applyPickedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadedUri(asset.uri);
    if (Platform.OS === 'web') {
      const blob = await uriToBlob(asset.uri, 'image/jpeg');
      setUploadedBlob(blob);
      return;
    }
    setUploadedBlob(null);
  };

  const isPortraitFourByThree = (width?: number, height?: number, tolerance = 0.02) => {
    if (!width || !height || height === 0) return false;
    const ratio = width / height;
    return Math.abs(ratio - 0.75) <= tolerance;
  };

  const centerCropToAspect = async (
    uri: string,
    width: number,
    height: number,
    targetAspect: number
  ): Promise<string> => {
    const currentAspect = width / height;
    let cropWidth = width;
    let cropHeight = height;

    if (currentAspect > targetAspect) {
      cropWidth = Math.floor(height * targetAspect);
    } else if (currentAspect < targetAspect) {
      cropHeight = Math.floor(width / targetAspect);
    }

    const originX = Math.floor((width - cropWidth) / 2);
    const originY = Math.floor((height - cropHeight) / 2);

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  };

  const pickImage = async (
    useCamera = false,
    options?: {
      cameraType?: 'front' | 'back';
      allowsEditing?: boolean;
      aspect?: [number, number];
    }
  ) => {
    const permissionFn = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permissionFn();
    if (status !== 'granted') {
      showErrorToast('Please grant ' + (useCamera ? 'camera' : 'camera roll') + ' permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';
    const commonOptions = {
      mediaTypes,
      allowsEditing: options?.allowsEditing ?? true,
      ...(options?.aspect ? { aspect: options.aspect } : {}),
      quality: 0.8,
    };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          ...commonOptions,
          ...(options?.cameraType ? { cameraType: options.cameraType } : {}),
        } as any)
      : await ImagePicker.launchImageLibraryAsync(commonOptions as any);

    if (result.canceled || !result.assets[0]) {
      return;
    }

    await applyPickedAsset(result.assets[0]);
  };

  const pickHeadshotCameraImage = async () => {
    await pickImage(true, { cameraType: 'front', allowsEditing: false });
  };

  const pickBodyShotCameraImage = async () => {
    await pickImage(true, { allowsEditing: false });
  };

  const pickHeadshotLibraryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showErrorToast('Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (isPortraitFourByThree(asset.width, asset.height)) {
      await applyPickedAsset(asset);
      return;
    }

    if (
      Platform.OS !== 'web' &&
      typeof asset.width === 'number' &&
      typeof asset.height === 'number'
    ) {
      const croppedUri = await centerCropToAspect(asset.uri, asset.width, asset.height, 3 / 4);
      await applyPickedAsset({ ...asset, uri: croppedUri });
      return;
    }

    await pickImage(false, { allowsEditing: true, aspect: [3, 4] });
  };

  const clearImage = () => {
    setUploadedUri(null);
    setUploadedBlob(null);
  };

  return {
    uploadedUri,
    setUploadedUri,
    uploadedBlob,
    setUploadedBlob,
    pickImage,
    pickHeadshotCameraImage,
    pickHeadshotLibraryImage,
    pickBodyShotCameraImage,
    clearImage,
    centerCropToAspect,
  };
}
