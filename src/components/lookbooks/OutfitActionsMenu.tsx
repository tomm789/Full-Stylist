/**
 * OutfitActionsMenu Component
 * Context menu for outfit actions in a lookbook
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OutfitActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onEditOutfit: () => void;
  onRemoveOutfit: () => void;
}

export function OutfitActionsMenu({
  visible,
  onClose,
  onEditOutfit,
  onRemoveOutfit,
}: OutfitActionsMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.item} onPress={onEditOutfit}>
            <Ionicons name="create-outline" size={20} color="#000" />
            <Text style={styles.itemText}>Edit Outfit</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.item} onPress={onRemoveOutfit}>
            <Ionicons name="remove-circle-outline" size={20} color="#FF3B30" />
            <Text style={[styles.itemText, styles.itemTextDanger]}>
              Remove from Lookbook
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  itemTextDanger: {
    color: '#FF3B30',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});
