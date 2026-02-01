import React from 'react';
import { Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { layout, colors, spacing, borderRadius, shadows } from '@/styles';

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

  /**
   * Stretch menu to the full width of the screen.
   */
  fullWidth?: boolean;
};

export function DropdownMenuModal({
  visible,
  onClose,
  children,
  topOffset = layout.headerHeightWithPadding,
  align = 'center',
  menuStyle,
  fullWidth = false,
}: DropdownMenuModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, fullWidth && styles.overlayFullWidth, { paddingTop: topOffset }]}
        onPress={onClose}
      >
        <View
          style={[
            styles.menuContainer,
            fullWidth && styles.menuFullWidth,
            align === 'right' && !fullWidth && styles.rightAlign,
            menuStyle,
          ]}
        >
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
  overlayFullWidth: {
    alignItems: 'stretch',
  },

  menuContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    minWidth: 200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuFullWidth: {
    width: '100%',
    borderRadius: 0,
  },

  rightAlign: {
    alignSelf: 'flex-end',
    marginRight: spacing.lg,
  },
});
