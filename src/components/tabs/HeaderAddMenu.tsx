/**
 * HeaderAddMenu Component
 * Add menu button and modal for tabs header
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface HeaderAddMenuProps {
  title: string;
}

export function HeaderAddMenu({ title }: HeaderAddMenuProps) {
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddOption = (type: string) => {
    setShowAddMenu(false);

    switch (type) {
      case 'outfit':
        router.push('/outfits/new' as any);
        break;
      case 'calendar':
        router.push('/(tabs)/calendar?openAddPicker=true' as any);
        break;
      case 'wardrobe':
        router.push('/wardrobe/add' as any);
        break;
      case 'lookbook':
        router.push('/lookbooks/new' as any);
        break;
    }
  };

  return (
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitleText}>{title}</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddMenu(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#000" />
      </TouchableOpacity>

      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMenu(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.menuTitle}>Add New</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('outfit')}
            >
              <Ionicons name="shirt-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('calendar')}
            >
              <Ionicons name="calendar-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Calendar Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('wardrobe')}
            >
              <Ionicons name="pricetag-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Wardrobe Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('lookbook')}
            >
              <Ionicons name="book-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Lookbook</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});
