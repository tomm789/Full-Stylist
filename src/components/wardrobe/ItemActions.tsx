/**
 * ItemActions Component
 * Action buttons for wardrobe items
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ItemActionsProps {
  isReadOnly: boolean;
  isOwnItem: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  onAddToOutfit: () => void;
}

export function ItemActions({
  isReadOnly,
  isOwnItem,
  isSaved,
  isSaving,
  onSave,
  onAddToOutfit,
}: ItemActionsProps) {
  return (
    <View style={styles.container}>
      {isReadOnly && !isOwnItem && (
        <TouchableOpacity
          style={[styles.saveButton, isSaved && styles.saveButtonActive]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isSaved ? '#007AFF' : '#fff'}
                style={styles.saveButtonIcon}
              />
              <Text
                style={[
                  styles.saveButtonText,
                  { color: isSaved ? '#007AFF' : '#fff' },
                ]}
              >
                {isSaved ? 'Saved to Wardrobe' : 'Save to My Wardrobe'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.addToOutfitButton} onPress={onAddToOutfit}>
        <Text style={styles.addToOutfitButtonText}>Add to Outfit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonActive: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  saveButtonIcon: {
    marginRight: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addToOutfitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addToOutfitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
