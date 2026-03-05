/**
 * ItemImageCarousel Component
 * Image carousel with fullscreen modal for wardrobe items
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { getImageUrl as getTransformedImageUrl } from '@/lib/images';
import { FullscreenImageModal } from '@/components/shared/modals';

interface ItemImageCarouselProps {
  images: Array<{ id: string; image_id: string; type: string; image: any }>;
  currentScreenWidth: number;
  onImageIndexChange: (index: number) => void;
  currentImageIndex: number;
}

export function ItemImageCarousel({
  images,
  currentScreenWidth,
  onImageIndexChange,
  currentImageIndex,
}: ItemImageCarouselProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const getImageUrl = (imageData: any): string | null => {
    if (!imageData?.storage_key) return null;
    return getTransformedImageUrl(
      imageData.storage_bucket || 'media',
      imageData.storage_key,
      'full'
    );
  };

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setShowImageModal(true);
  };

  // Full-resolution URLs for the fullscreen modal
  const fullResUrls = useMemo(
    () =>
      images
        .map((img) => {
          if (!img.image?.storage_key) return null;
          return getTransformedImageUrl(
            img.image.storage_bucket || 'media',
            img.image.storage_key,
            'full'
          );
        })
        .filter(Boolean) as string[],
    [images],
  );

  if (images.length === 0) {
    return (
      <View style={[styles.noImageContainer, { width: currentScreenWidth }]}>
        <Text style={styles.noImageText}>No images available</Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.carouselContainer,
          { width: currentScreenWidth, alignSelf: 'center' },
        ]}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const { contentOffset, layoutMeasurement } = event.nativeEvent;
            const calculatedIndex = Math.round(
              contentOffset.x / layoutMeasurement.width
            );
            if (
              calculatedIndex !== currentImageIndex &&
              calculatedIndex >= 0 &&
              calculatedIndex < images.length
            ) {
              onImageIndexChange(calculatedIndex);
            }
          }}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {images.map((itemImage, index) => {
            const imageUrl = getImageUrl(itemImage.image);
            return (
              <TouchableOpacity
                key={itemImage.id}
                style={[
                  styles.imageContainer,
                  { width: currentScreenWidth },
                ]}
                onPress={() => openImageModal(index)}
                activeOpacity={0.9}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>No Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.indicatorContainer}>
            <Text style={styles.indicatorText}>
              {currentImageIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>

      <FullscreenImageModal
        visible={showImageModal}
        images={fullResUrls}
        initialIndex={modalImageIndex}
        onClose={() => setShowImageModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  carousel: {
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 16,
  },
  noImageContainer: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noImageText: {
    color: '#666',
    fontSize: 16,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
