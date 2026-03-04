/**
 * FullscreenImageModal
 * Shared fullscreen image viewer with pinch-to-zoom, swipe-to-dismiss, save, and share.
 * Powered by react-native-image-viewing.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Share,
  Platform,
  StyleSheet,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { showSuccessToast, showErrorToast } from '@/utils/toast';

interface FullscreenImageModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function FullscreenImageModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: FullscreenImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Map string URLs to the { uri: string } format expected by ImageViewing
  const imagesSources = useMemo(
    () => images.map((uri) => ({ uri })),
    [images],
  );

  const getLocalUri = useCallback(
    async (remoteUrl: string): Promise<string | null> => {
      if (Platform.OS === 'web') return remoteUrl;
      if (remoteUrl.startsWith('file://')) return remoteUrl;
      const extension = remoteUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const targetDir = FileSystem.cacheDirectory;
      if (!targetDir) return null;
      const targetUri = `${targetDir}fullscreen-${Date.now()}.${extension}`;
      const download = await FileSystem.downloadAsync(remoteUrl, targetUri);
      return download?.uri || null;
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const imageUrl = images[currentIndex];
    if (!imageUrl) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showErrorToast('Please allow access to save images.');
        return;
      }
      const localUri = await getLocalUri(imageUrl);
      if (!localUri) {
        showErrorToast('Could not download image.');
        return;
      }
      await MediaLibrary.createAssetAsync(localUri);
      if (localUri.startsWith('file://')) {
        await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
          () => {},
        );
      }
      showSuccessToast('Image saved to your photo library.');
    } catch (error) {
      console.error('Save error:', error);
      showErrorToast('Failed to save image.');
    }
  }, [currentIndex, images, getLocalUri]);

  const handleShare = useCallback(async () => {
    const imageUrl = images[currentIndex];
    if (!imageUrl) return;
    let localUri: string | null = null;
    try {
      localUri = await getLocalUri(imageUrl);
      if (!localUri) {
        showErrorToast('Could not download image.');
        return;
      }
      await Share.share({ url: localUri });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Share error:', error);
      }
    } finally {
      if (localUri && localUri.startsWith('file://') && localUri !== imageUrl) {
        await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
          () => {},
        );
      }
    }
  }, [currentIndex, images, getLocalUri]);

  const FooterComponent = useCallback(
    () => (
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    ),
    [handleSave, handleShare],
  );

  if (images.length === 0) return null;

  return (
    <ImageViewing
      images={imagesSources}
      imageIndex={initialIndex}
      visible={visible}
      onRequestClose={onClose}
      onImageIndexChange={setCurrentIndex}
      swipeToCloseEnabled
      doubleTapToZoomEnabled
      FooterComponent={FooterComponent}
      backgroundColor="rgba(0, 0, 0, 0.95)"
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 40,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
