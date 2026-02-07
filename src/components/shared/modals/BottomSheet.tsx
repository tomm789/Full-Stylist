/**
 * BottomSheet Component
 * Reusable bottom sheet modal
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ModalProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import type { DimensionValue } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface BottomSheetProps extends Partial<ModalProps> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  footerContent?: React.ReactNode;
  maxHeight?: DimensionValue;
  style?: ViewStyle;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  headerRight,
  footerContent,
  maxHeight = '80%',
  style,
  ...modalProps
}: BottomSheetProps) {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      {...modalProps}
    >
      <Pressable style={commonStyles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { maxHeight }, style]}
          onPress={() => {}} // Prevent closing when tapping inside
        >
          {(title || headerRight) && (
            <View style={commonStyles.modalHeader}>
              {title && <Text style={commonStyles.modalTitle}>{title}</Text>}
              <View style={styles.headerRight}>
                {headerRight}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color={colors.gray600} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.content}>{children}</View>

          {footerContent && <View style={styles.footer}>{footerContent}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
