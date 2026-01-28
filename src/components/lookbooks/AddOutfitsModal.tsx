/**
 * AddOutfitsModal Component
 * Modal for selecting and adding outfits to a lookbook
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { getOutfitCoverImageUrl } from '@/lib/images';

interface AddOutfitsModalProps {
  visible: boolean;
  availableOutfits: any[];
  selectedOutfitIds: Set<string>;
  imageUrls: Map<string, string | null>;
  loading: boolean;
  adding: boolean;
  onClose: () => void;
  onToggleSelection: (outfitId: string) => void;
  onAdd: () => void;
}

const AddOutfitCard = React.memo(
  ({
    item,
    imageUrl,
    isSelected,
    onToggle,
  }: {
    item: any;
    imageUrl: string | null;
    isSelected: boolean;
    onToggle: (id: string) => void;
  }) => {
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => onToggle(item.id)}
      >
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.overlay}>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>✓</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {item.title || 'Untitled Outfit'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

export function AddOutfitsModal({
  visible,
  availableOutfits,
  selectedOutfitIds,
  imageUrls,
  loading,
  adding,
  onClose,
  onToggleSelection,
  onAdd,
}: AddOutfitsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Outfits</Text>
          <TouchableOpacity
            onPress={onAdd}
            disabled={adding || selectedOutfitIds.size === 0}
          >
            <Text
              style={[
                styles.saveButton,
                (adding || selectedOutfitIds.size === 0) &&
                  styles.saveButtonDisabled,
              ]}
            >
              {adding ? 'Adding...' : `Add (${selectedOutfitIds.size})`}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : availableOutfits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No more outfits to add</Text>
            <Text style={styles.emptySubtext}>
              All your outfits are already in this lookbook
            </Text>
          </View>
        ) : (
          <FlatList
            data={availableOutfits}
            renderItem={({ item }) => (
              <AddOutfitCard
                item={item}
                imageUrl={imageUrls.get(item.id) || null}
                isSelected={selectedOutfitIds.has(item.id)}
                onToggle={onToggleSelection}
              />
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  list: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  selectedBadge: {
    position: 'absolute',
    top: -60,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
