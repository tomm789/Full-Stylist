/**
 * useWardrobeCamera Hook (web)
 * Web-safe camera API that routes capture to file upload.
 */

import { useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ANIMATION_DURATION = 300;

interface CapturedImage {
  uri: string;
  type: string;
  name: string;
}

interface UseWardrobeCameraReturn {
  // State
  isOpen: boolean;
  cameraReady: boolean;

  // Animation value (slide from bottom)
  cameraTranslateY: Animated.Value;

  // Camera ref
  cameraRef: React.RefObject<unknown>;

  // Actions
  open: () => void;
  close: () => void;
  onCameraReady: () => void;
  capture: () => Promise<CapturedImage | null>;
  pickFromLibrary: () => Promise<CapturedImage | null>;

  // Gallery thumbnail
  lastPhotoUri: string | null;

  // Permissions
  hasPermission: boolean | null;
}

export function useWardrobeCamera(): UseWardrobeCameraReturn {
  const screenHeight = Dimensions.get('window').height;

  const [isOpen, setIsOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const cameraRef = useRef<unknown>(null);
  const isAnimating = useRef(false);

  const cameraTranslateY = useRef(new Animated.Value(screenHeight)).current;

  const open = useCallback(() => {
    if (isAnimating.current || isOpen) return;

    isAnimating.current = true;
    setIsOpen(true);

    Animated.timing(cameraTranslateY, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  }, [isOpen, cameraTranslateY]);

  const close = useCallback(() => {
    if (isAnimating.current || !isOpen) return;
    isAnimating.current = true;

    Animated.timing(cameraTranslateY, {
      toValue: screenHeight,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      setIsOpen(false);
      setCameraReady(false);
    });
  }, [isOpen, cameraTranslateY, screenHeight]);

  const onCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  const pickImage = useCallback(async (): Promise<CapturedImage | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library permissions.');
      return null;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      name: asset.fileName || `library-photo-${Date.now()}.jpg`,
    };
  }, []);

  const capture = useCallback(async (): Promise<CapturedImage | null> => {
    return pickImage();
  }, [pickImage]);

  const pickFromLibrary = useCallback(async (): Promise<CapturedImage | null> => {
    return pickImage();
  }, [pickImage]);

  return {
    isOpen,
    cameraReady,
    cameraTranslateY,
    cameraRef,
    open,
    close,
    onCameraReady,
    capture,
    pickFromLibrary,
    lastPhotoUri: null,
    hasPermission: true,
  };
}
