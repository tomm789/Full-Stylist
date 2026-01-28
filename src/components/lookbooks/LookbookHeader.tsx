/**
 * LookbookHeader Component
 * Header section with title, description, and metadata
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lookbook } from '@/lib/lookbooks';

interface LookbookHeaderProps {
  lookbook: Lookbook;
  outfitCount: number;
}

export function LookbookHeader({ lookbook, outfitCount }: LookbookHeaderProps) {
  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Public';
      case 'followers':
        return 'Followers';
      case 'private_link':
        return 'Private Link';
      default:
        return 'Private';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{lookbook.title}</Text>
      {lookbook.description && (
        <Text style={styles.description}>{lookbook.description}</Text>
      )}
      <View style={styles.metadataContainer}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>Visibility:</Text>
          <Text style={styles.metadataValue}>
            {getVisibilityLabel(lookbook.visibility)}
          </Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>Outfits:</Text>
          <Text style={styles.metadataValue}>{outfitCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
});
