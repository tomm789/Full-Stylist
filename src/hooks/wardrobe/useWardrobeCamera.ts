/**
 * useWardrobeCamera Hook
 * Manages inline camera state for the wardrobe screen's left-swipe camera feature.
 * Handles permissions, capture, slide animations, and gallery thumbnail.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Animated, Dimensions, Platform, Alert } from 'react-native';
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

  // Animation values
  gridTranslateX: Animated.Value;
  cameraTranslateX: Animated.Value;

  // Camera ref
  cameraRef: React.RefObject<CameraView | null>;

  // Actions
  open: () => void;
  close: () => void;
  capture: () => Promise<CapturedImage | null>;
  pickFromLibrary: () => Promise<CapturedImage | null>;

  // Gallery thumbnail
  lastPhotoUri: string | null;

  // Permissions
  hasPermission: boolean | null;
}

export function useWardrobeCamera(): UseWardrobeCameraReturn {
  const screenWidth = Dimensions.get('window').width;

  const [isOpen, setIsOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const isAnimating = useRef(false);

  // Animation values: grid starts at 0, camera starts off-screen left
  const gridTranslateX = useRef(new Animated.Value(0)).current;
  const cameraTranslateX = useRef(new Animated.Value(-screenWidth)).current;

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | null>(null);

  const hasPermission = cameraPermission?.granted ?? null;

  // Fetch the most recent photo for the gallery thumbnail
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission(status === 'granted');

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

      Animated.parallel([
        Animated.timing(gridTranslateX, {
          toValue: screenWidth,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cameraTranslateX, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    })();
  }, [isOpen, cameraPermission, requestCameraPermission, gridTranslateX, cameraTranslateX, screenWidth]);

  const close = useCallback(() => {
    if (isAnimating.current || !isOpen) return;
    isAnimating.current = true;

    Animated.parallel([
      Animated.timing(gridTranslateX, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(cameraTranslateX, {
        toValue: -screenWidth,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      setIsOpen(false);
      setCameraReady(false);
    });
  }, [isOpen, gridTranslateX, cameraTranslateX, screenWidth]);

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
    gridTranslateX,
    cameraTranslateX,
    cameraRef,
    open,
    close,
    capture,
    pickFromLibrary,
    lastPhotoUri,
    hasPermission,
  };
}
