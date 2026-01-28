/**
 * ProfileImageGallery Component
 * Gallery display for profile images
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface ProfileImage {
  id: string;
  url: string;
  created_at: string;
}

interface ProfileImageGalleryProps {
  title: string;
  images: ProfileImage[];
  activeImageId: string | null;
  onSelectImage: (imageId: string) => void;
}

export function ProfileImageGallery({
  title,
  images,
  activeImageId,
  onSelectImage,
}: ProfileImageGalleryProps) {
  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.emptyText}>No images yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gallery}
      >
        {images.map((image) => {
          const isActive = image.id === activeImageId;
          return (
            <TouchableOpacity
              key={image.id}
              style={[styles.imageCard, isActive && styles.imageCardActive]}
              onPress={() => onSelectImage(image.id)}
            >
              <ExpoImage
                source={{ uri: image.url }}
                style={styles.image}
                contentFit="cover"
              />
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  gallery: {
    paddingHorizontal: 16,
    gap: 12,
  },
  imageCard: {
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageCardActive: {
    borderColor: '#007AFF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
