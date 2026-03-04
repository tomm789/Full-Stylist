/**
 * FullscreenImageModal
 * Shared fullscreen image viewer with multi-image carousel, save, and share.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

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
  const { width: screenWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  // Sync currentIndex when initialIndex or visibility changes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  // Scroll to correct position when modal opens with non-zero initialIndex
  useEffect(() => {
    if (visible && initialIndex > 0 && scrollRef.current) {
      // Small delay to ensure ScrollView is mounted
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: initialIndex * screenWidth,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex, screenWidth]);

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
        Alert.alert(
          'Permission Required',
          'Please allow access to save images.',
        );
        return;
      }
      const localUri = await getLocalUri(imageUrl);
      if (!localUri) {
        Alert.alert('Error', 'Could not download image.');
        return;
      }
      await MediaLibrary.createAssetAsync(localUri);
      if (localUri.startsWith('file://')) {
        await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
          () => {},
        );
      }
      Alert.alert('Saved', 'Image saved to your photo library.');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save image.');
    }
  }, [currentIndex, images, getLocalUri]);

  const handleShare = useCallback(async () => {
    const imageUrl = images[currentIndex];
    if (!imageUrl) return;
    let localUri: string | null = null;
    try {
      localUri = await getLocalUri(imageUrl);
      if (!localUri) {
        Alert.alert('Error', 'Could not download image.');
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

  if (images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>&times;</Text>
        </TouchableOpacity>

        {/* Centered content */}
        <View style={styles.centerContent}>
          <View style={styles.contentWrapper}>
            {/* Image carousel */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / screenWidth,
                );
                if (idx >= 0 && idx < images.length) {
                  setCurrentIndex(idx);
                }
              }}
              style={styles.scrollView}
            >
              {images.map((url, index) => (
                <View
                  key={`${url}-${index}`}
                  style={[styles.imageContainer, { width: screenWidth }]}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.image}
                    contentFit="contain"
                  />
                </View>
              ))}
            </ScrollView>

            {/* Pagination indicator */}
            {images.length > 1 && (
              <View style={styles.indicator}>
                <Text style={styles.indicatorText}>
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 20,
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
