import React from 'react';
import { Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

type DropdownMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;

  /**
   * Distance from top of screen (roughly below header)
   */
  topOffset?: number;

  /**
   * Align the menu to the right edge instead of centered.
   */
  align?: 'center' | 'right';

  /**
   * Optional extra style for the menu container
   */
  menuStyle?: ViewStyle;
};

export function DropdownMenuModal({
  visible,
  onClose,
  children,
  topOffset = 100,
  align = 'center',
  menuStyle,
}: DropdownMenuModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { paddingTop: topOffset }]} onPress={onClose}>
        <View style={[styles.menuContainer, align === 'right' && styles.rightAlign, menuStyle]}>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  // matches your current dropdownMenu styling
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  rightAlign: {
    alignSelf: 'flex-end',
    marginRight: 16,
  },
});