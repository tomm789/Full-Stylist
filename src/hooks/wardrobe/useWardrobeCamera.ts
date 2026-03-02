/**
 * useWardrobeCamera Hook
 * Manages the wardrobe camera overlay state, permissions, capture,
 * slide-from-bottom animation, and gallery thumbnail.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Animated, Dimensions, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
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
  cameraRef: React.RefObject<CameraView | null>;

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
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const isAnimating = useRef(false);

  // Slide-from-bottom animation (starts off-screen below)
  const cameraTranslateY = useRef(new Animated.Value(screenHeight)).current;

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const hasPermission = cameraPermission?.granted ?? null;

  // Fetch the most recent photo for the gallery thumbnail
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status === 'granted') {
        const { assets } = await MediaLibrary.getAssetsAsync({
          first: 1,
          sortBy: [MediaLibrary.SortBy.creationTime],
          mediaType: MediaLibrary.MediaType.photo,
        });
        if (assets.length > 0) {
          setLastPhotoUri(assets[0].uri);
        }
      }
    })();
  }, [isOpen]);

  const open = useCallback(() => {
    if (isAnimating.current || isOpen) return;

    (async () => {
      // Request camera permission if not granted
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert('Permission Required', 'Please grant camera permissions to use this feature.');
          return;
        }
      }

      isAnimating.current = true;
      setIsOpen(true);

      Animated.timing(cameraTranslateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    })();
  }, [isOpen, cameraPermission, requestCameraPermission, cameraTranslateY]);

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

  const capture = useCallback(async (): Promise<CapturedImage | null> => {
    if (!cameraRef.current || !cameraReady) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (!photo) return null;

      return {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `wardrobe-photo-${Date.now()}.jpg`,
      };
    } catch (error) {
      console.error('[useWardrobeCamera] Capture failed:', error);
      return null;
    }
  }, [cameraReady]);

  const pickFromLibrary = useCallback(async (): Promise<CapturedImage | null> => {
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
    lastPhotoUri,
    hasPermission,
  };
}
