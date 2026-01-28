/**
 * Slideshow Modal Component
 * Full-screen slideshow for viewing lookbook outfits
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, StatusBar } from 'react-native';
import { SlideshowSlide } from './SlideshowSlide';

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

export const SlideshowModal = ({
  visible,
  outfits,
  images,
  currentIndex,
  isAutoPlaying,
  onClose,
  onNext,
  onPrevious,
  onToggleAutoPlay,
}: SlideshowModalProps) => {
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
          <Text style={styles.playPauseButtonText}>
            {isAutoPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        {/* Current Slide */}
        {outfits.length > 0 && (
          <>
            <SlideshowSlide 
              outfit={outfits[currentIndex]} 
              imageUrl={images.get(outfits[currentIndex].id) || null}
            />
            
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#fff',
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
    color: '#fff',
    fontSize: 20,
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
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  slideCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  slideCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
