/**
 * FindSimilarResultItem Component
 * Result item for find similar modal (wardrobe/sellable items)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SimilarityResult } from '@/lib/similarity';

interface FindSimilarResultItemProps {
  item: SimilarityResult;
  getItemImageUrl: (itemId: string) => Promise<string | null>;
}

export function FindSimilarResultItem({
  item,
  getItemImageUrl,
}: FindSimilarResultItemProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if ('id' in item.item) {
      // WardrobeItem
      loadImage();
    }
  }, [item.item]);

  const loadImage = async () => {
    if ('id' in item.item) {
      const url = await getItemImageUrl(item.item.id);
      setImageUrl(url);
      setImageLoading(false);
    }
  };

  return (
    <View style={styles.resultCard}>
      {imageLoading ? (
        <View style={styles.resultImagePlaceholder}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : imageUrl ? (
        <ExpoImage source={{ uri: imageUrl }} style={styles.resultImage} contentFit="cover" />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text style={styles.resultImagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {'title' in item.item ? item.item.title : 'Item'}
        </Text>
        <Text style={styles.resultScore}>{Math.round(item.score)}% similar</Text>
        {item.matchingAttributes.length > 0 && (
          <Text style={styles.resultAttributes} numberOfLines={2}>
            {item.matchingAttributes.map((attr) => attr.value).join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  resultImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  resultImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  resultInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  resultAttributes: {
    fontSize: 12,
    color: '#666',
  },
});
