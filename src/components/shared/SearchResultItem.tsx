/**
 * SearchResultItem Component
 * Individual search result item
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '@/hooks/useSearch';

interface SearchResultItemProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}

export function SearchResultItem({ result, onPress }: SearchResultItemProps) {
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return 'person-circle-outline';
      case 'outfit':
        return 'shirt-outline';
      case 'lookbook':
        return 'albums-outline';
      case 'wardrobe_item':
        return 'pricetag-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return 'User';
      case 'outfit':
        return 'Outfit';
      case 'lookbook':
        return 'Lookbook';
      case 'wardrobe_item':
        return 'Item';
      default:
        return 'Unknown';
    }
  };

  return (
    <TouchableOpacity style={styles.resultItem} onPress={() => onPress(result)}>
      <View style={styles.resultIcon}>
        <Ionicons name={getResultIcon(result.type)} size={48} color="#999" />
      </View>
      <View style={styles.resultInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.resultTitle}>{result.title}</Text>
          <View style={styles.typeLabel}>
            <Text style={styles.typeLabelText}>{getResultTypeLabel(result.type)}</Text>
          </View>
        </View>
        {result.subtitle && (
          <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  typeLabel: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
