import React, { useMemo } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { layout, spacing, borderRadius } from '@/styles/themeConfig';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

type DropdownMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;

  /**
   * Distance from top of screen (roughly below header)
   */
  topOffset?: number;

  /**
   * Distance from bottom of screen (roughly above tab bar)
   */
  bottomOffset?: number;

  /**
   * Align the menu to the right edge instead of centered.
   */
  align?: 'center' | 'right';

  /**
   * Position the menu from the top or bottom of the screen.
   */
  placement?: 'top' | 'bottom';

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
  bottomOffset = spacing.huge + spacing.md,
  align = 'center',
  placement = 'top',
  menuStyle,
  fullWidth = false,
}: DropdownMenuModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[
          styles.overlay,
          placement === 'bottom' && styles.overlayBottom,
          fullWidth && styles.overlayFullWidth,
          placement === 'top' ? { paddingTop: topOffset } : { paddingBottom: bottomOffset },
        ]}
        onPress={onClose}
      >
        <View
          style={[
            styles.menuBorder,
            fullWidth && styles.menuFullWidth,
            align === 'right' && !fullWidth && styles.rightAlign,
            menuStyle,
          ]}
        >
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.menuContainer, fullWidth && styles.menuContainerFullWidth]}
          >
            {children}
          </BlurView>
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  overlayFullWidth: {
    alignItems: 'stretch',
  },

  menuBorder: {
    borderRadius: borderRadius.lg,
    minWidth: 200,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
      : {
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  menuContainer: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  menuFullWidth: {
    width: '100%',
    borderRadius: 0,
  },
  menuContainerFullWidth: {
    borderRadius: 0,
  },

  rightAlign: {
    alignSelf: 'flex-end',
    marginRight: spacing.lg,
  },
});
