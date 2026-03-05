/**
 * SlideshowModal Component
 * Full-screen slideshow modal with controls
 */

import React, { useMemo } from 'react';
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
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

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
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <BlurView intensity={25} tint="light" style={styles.closeButton}>
          <TouchableOpacity style={styles.controlButtonInner} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </BlurView>

        {/* Play/Pause Button */}
        <BlurView intensity={25} tint="light" style={styles.playPauseButton}>
          <TouchableOpacity style={styles.controlButtonInner} onPress={onToggleAutoPlay}>
            <Text style={styles.playPauseButtonText}>{isAutoPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </BlurView>

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
              <BlurView intensity={30} tint="dark" style={styles.slideInfo}>
                <Text style={styles.slideTitle}>
                  {currentOutfit.title || 'Untitled Outfit'}
                </Text>
                {currentOutfit.description && (
                  <Text style={styles.slideDescription}>{currentOutfit.description}</Text>
                )}
              </BlurView>
            </View>

            {/* Navigation Arrows */}
            <BlurView intensity={25} tint="light" style={styles.leftArrow}>
              <TouchableOpacity style={styles.controlButtonInner} onPress={onPrevious}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
            </BlurView>
            <BlurView intensity={25} tint="light" style={styles.rightArrow}>
              <TouchableOpacity style={styles.controlButtonInner} onPress={onNext}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </BlurView>

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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  controlButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    position: 'absolute',
    top: 50,
    right: 70,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    overflow: 'hidden',
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
