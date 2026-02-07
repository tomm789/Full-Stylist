/**
 * SlideshowModal Component
 * Full-screen slideshow modal with controls
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideshowModalProps {
  visible: boolean;
  outfits: any[];
  images: Map<string, string | null>;
  currentIndex: number;
  isAutoPlaying: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleAutoPlay: () => void;
}

export default function SlideshowModal({
  visible,
  outfits,
  images,
  currentIndex,
  isAutoPlaying,
  onClose,
  onNext,
  onPrevious,
  onToggleAutoPlay,
}: SlideshowModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  if (!visible || outfits.length === 0) return null;

  const currentOutfit = outfits[currentIndex];
  const imageUrl = images.get(currentOutfit?.id);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar hidden />

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity style={styles.playPauseButton} onPress={onToggleAutoPlay}>
          <Text style={styles.playPauseButtonText}>{isAutoPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Current Slide */}
        {currentOutfit && (
          <>
            <View style={styles.slide}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.slideImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  priority="high"
                />
              ) : (
                <View style={styles.slideImagePlaceholder}>
                  <ActivityIndicator size="large" color={colors.white} />
                </View>
              )}
              <View style={styles.slideInfo}>
                <Text style={styles.slideTitle}>
                  {currentOutfit.title || 'Untitled Outfit'}
                </Text>
                {currentOutfit.description && (
                  <Text style={styles.slideDescription}>{currentOutfit.description}</Text>
                )}
              </View>
            </View>

            {/* Navigation Arrows */}
            <TouchableOpacity style={styles.leftArrow} onPress={onPrevious}>
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rightArrow} onPress={onNext}>
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>

            {/* Slide Counter */}
            <View style={styles.slideCounter}>
              <Text style={styles.slideCounterText}>
                {currentIndex + 1} / {outfits.length}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  playPauseButton: {
    position: 'absolute',
    top: 50,
    right: 70,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButtonText: {
    color: colors.white,
    fontSize: 20,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  slideImagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: spacing.sm,
  },
  slideTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  slideDescription: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 22,
  },
  leftArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: colors.white,
    fontSize: 48,
    fontWeight: 'bold',
  },
  slideCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
  },
  slideCounterText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
