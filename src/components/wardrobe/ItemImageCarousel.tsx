/**
 * ItemImageCarousel Component
 * Image carousel with modal for wardrobe items
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    if (!imageData) return null;
    const { data: urlData } = supabase.storage
      .from(imageData.storage_bucket || 'media')
      .getPublicUrl(imageData.storage_key);
    return urlData.publicUrl;
  };

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setShowImageModal(true);
  };

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

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.modalCloseText}>×</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const containerWidth = event.nativeEvent.layoutMeasurement.width;
              const index = Math.round(
                event.nativeEvent.contentOffset.x / containerWidth
              );
              setModalImageIndex(index);
            }}
            style={styles.modalCarousel}
          >
            {images.map((itemImage) => {
              const imageUrl = getImageUrl(itemImage.image);
              return (
                <View
                  key={itemImage.id}
                  style={[
                    styles.modalImageContainer,
                    { width: currentScreenWidth },
                  ]}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.modalImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>
                        No Image
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.modalIndicator}>
              <Text style={styles.modalIndicatorText}>
                {modalImageIndex + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalCloseButton: {
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
  modalCloseText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalCarousel: {
    flex: 1,
  },
  modalImageContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
