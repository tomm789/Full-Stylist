import { Alert, Platform } from 'react-native';
import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

interface WardrobeCameraLike {
  open: () => void;
  close: () => void;
}

interface UseWardrobeCameraFlowProps {
  wardrobeCamera: WardrobeCameraLike;
  router: { push: (path: any) => void };
  setTabBarOpacity: (value: number) => void;
}

export function useWardrobeCameraFlow({
  wardrobeCamera,
  router,
  setTabBarOpacity,
}: UseWardrobeCameraFlowProps) {
  const handleOpenCamera = useCallback(() => {
    if (Platform.OS === 'web') {
      (async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant photo library permissions.');
          return;
        }
        const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes,
          allowsMultipleSelection: false,
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
          router.push(`/wardrobe/add?imageUri=${encodeURIComponent(result.assets[0].uri)}` as any);
        }
      })();
    } else {
      setTabBarOpacity(0);
      wardrobeCamera.open();
    }
  }, [router, setTabBarOpacity, wardrobeCamera]);

  const handleCameraImageReady = useCallback(
    (croppedUri: string) => {
      wardrobeCamera.close();
      setTabBarOpacity(1);
      router.push(`/wardrobe/add?imageUri=${encodeURIComponent(croppedUri)}` as any);
    },
    [wardrobeCamera, setTabBarOpacity, router]
  );

  const handleCameraClose = useCallback(() => {
    wardrobeCamera.close();
    setTabBarOpacity(1);
  }, [wardrobeCamera, setTabBarOpacity]);

  return { handleOpenCamera, handleCameraImageReady, handleCameraClose };
}
