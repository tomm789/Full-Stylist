/**
 * ImageCarousel Component
 * Reusable horizontal scrolling image carousel with indicators
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import ImagePlaceholder from './ImagePlaceholder';
import IndicatorDots from '../layout/IndicatorDots';
import { theme } from '@/styles';

const { colors, borderRadius } = theme;

export interface CarouselImage {
  id: string;
  uri: string | null;
  alt?: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  onImagePress?: (index: number) => void;
  aspectRatio?: number;
  containerWidth?: number;
  showIndicators?: boolean;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function ImageCarousel({
  images,
  onImagePress,
  aspectRatio = 1,
  containerWidth,
  showIndicators = true,
  borderRadius: customBorderRadius,
  style,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const width = containerWidth || Math.min(Dimensions.get('window').width, 630);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const calculatedIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    if (calculatedIndex !== currentIndex && calculatedIndex >= 0 && calculatedIndex < images.length) {
      setCurrentIndex(calculatedIndex);
    }
  };

  if (images.length === 0) {
    return (
      <View style={[{ width, aspectRatio }, style]}>
        <ImagePlaceholder aspectRatio={aspectRatio} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }, style]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {images.map((image, index) => (
          <TouchableOpacity
            key={image.id}
            style={[
              styles.imageContainer,
              { width, aspectRatio },
              typeof customBorderRadius === 'number' ? { borderRadius: customBorderRadius } : undefined,
            ]}
            onPress={() => onImagePress?.(index)}
            activeOpacity={onImagePress ? 0.9 : 1}
            disabled={!onImagePress}
          >
            {image.uri ? (
              <Image
                source={{ uri: image.uri }}
                style={[
                  styles.image,
                  typeof customBorderRadius === 'number' ? { borderRadius: customBorderRadius } : undefined,
                ]}
                contentFit="cover"
              />
            ) : (
              <ImagePlaceholder aspectRatio={aspectRatio} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showIndicators && images.length > 1 && (
        <IndicatorDots
          total={images.length}
          activeIndex={currentIndex}
          style={styles.indicators}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicators: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
});
