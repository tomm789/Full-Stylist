/**
 * Slideshow Slide Component
 * Individual slide in the lookbook slideshow
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface SlideshowSlideProps {
  outfit: any;
  imageUrl: string | null;
}

export const SlideshowSlide = ({ outfit, imageUrl }: SlideshowSlideProps) => {
  return (
    <View style={styles.slide}>
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.slideImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
        />
      ) : (
        <View style={styles.slideImagePlaceholder}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <View style={styles.slideInfo}>
        <Text style={styles.slideTitle}>{outfit.title || 'Untitled Outfit'}</Text>
        {outfit.notes && (
          <Text style={styles.slideDescription}>{outfit.notes}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '70%',
  },
  slideImagePlaceholder: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  slideTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  slideDescription: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
});
