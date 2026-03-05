/**
 * FullscreenImageModal (Web)
 * Simple fullscreen image viewer for web platform.
 * The native version (FullscreenImageModal.native.tsx) uses react-native-image-viewing.
 */

import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  if (images.length === 0) return null;

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < images.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.imageContainer}>
          {canGoBack && (
            <TouchableOpacity
              style={[styles.navButton, styles.navLeft]}
              onPress={() => setCurrentIndex((i) => i - 1)}
            >
              <Ionicons name="chevron-back" size={32} color="#fff" />
            </TouchableOpacity>
          )}

          <Image
            source={{ uri: images[currentIndex] }}
            style={styles.image}
            resizeMode="contain"
          />

          {canGoForward && (
            <TouchableOpacity
              style={[styles.navButton, styles.navRight]}
              onPress={() => setCurrentIndex((i) => i + 1)}
            >
              <Ionicons name="chevron-forward" size={32} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '80%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLeft: {
    left: 16,
  },
  navRight: {
    right: 16,
  },
});
