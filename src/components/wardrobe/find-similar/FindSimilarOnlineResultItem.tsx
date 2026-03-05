/**
 * FindSimilarOnlineResultItem Component
 * Result item for online search results in find similar modal
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface FindSimilarOnlineResultItemProps {
  item: {
    title: string;
    price?: string;
    imageUrl?: string;
    url?: string;
  };
}

export function FindSimilarOnlineResultItem({ item }: FindSimilarOnlineResultItemProps) {
  return (
    <View style={styles.resultCard}>
      {item.imageUrl ? (
        <ExpoImage source={{ uri: item.imageUrl }} style={styles.resultImage} contentFit="cover" />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text style={styles.resultImagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.price && <Text style={styles.resultPrice}>{item.price}</Text>}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            // TODO: Open URL in browser
          }}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
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
  resultPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  viewButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
