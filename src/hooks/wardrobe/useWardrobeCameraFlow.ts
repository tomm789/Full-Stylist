import { Platform } from 'react-native';
import { showErrorToast } from '@/utils/toast';
import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { submitWardrobeImage } from '@/lib/wardrobe/submitWardrobeImage';

interface WardrobeCameraLike {
  open: () => void;
  close: () => void;
}

interface UseWardrobeCameraFlowProps {
  wardrobeCamera: WardrobeCameraLike;
  router: { push: (path: any) => void; replace: (path: any) => void };
  setTabBarOpacity: (value: number) => void;
  userId: string | undefined;
  wardrobeId: string | null;
}

export function useWardrobeCameraFlow({
  wardrobeCamera,
  router,
  setTabBarOpacity,
  userId,
  wardrobeId,
}: UseWardrobeCameraFlowProps) {
  const [submittingItem, setSubmittingItem] = useState(false);

  const handleOpenCamera = useCallback(() => {
    if (Platform.OS === 'web') {
      (async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showErrorToast('Please grant photo library permissions.');
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

      if (!userId || !wardrobeId) {
        showErrorToast('Please sign in to add items');
        return;
      }

      setSubmittingItem(true);

      submitWardrobeImage(userId, wardrobeId, croppedUri)
        .then(({ itemId }) => {
          router.replace(`/wardrobe/item/${itemId}?refresh=${Date.now()}` as any);
        })
        .catch((err: any) => {
          showErrorToast(err.message || 'Failed to add item');
        })
        .finally(() => {
          setSubmittingItem(false);
        });
    },
    [wardrobeCamera, setTabBarOpacity, userId, wardrobeId, router]
  );

  const handleCameraClose = useCallback(() => {
    wardrobeCamera.close();
    setTabBarOpacity(1);
  }, [wardrobeCamera, setTabBarOpacity]);

  return { handleOpenCamera, handleCameraImageReady, handleCameraClose, submittingItem };
}
