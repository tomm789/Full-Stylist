/**
 * OutfitCreatorOptionsModal Component
 * Modal for additional outfit creator options (save as draft, clear selection, etc.)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface OutfitCreatorOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onExpand?: () => void;
  onSaveAsDraft?: () => void;
  onClearSelection?: () => void;
}

interface MenuOption {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function OutfitCreatorOptionsModal({
  visible,
  onClose,
  onExpand,
  onSaveAsDraft,
  onClearSelection,
}: OutfitCreatorOptionsModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options: MenuOption[] = [];

  if (onExpand) {
    options.push({
      id: 'expand',
      label: 'Expand',
      icon: 'expand-outline',
      onPress: () => {
        onExpand();
        onClose();
      },
    });
  }

  if (onSaveAsDraft) {
    options.push({
      id: 'save_draft',
      label: 'Save as Draft',
      icon: 'bookmark-outline',
      onPress: () => {
        onSaveAsDraft();
        onClose();
      },
    });
  }

  if (onClearSelection) {
    options.push({
      id: 'clear',
      label: 'Clear All',
      icon: 'trash-outline',
      onPress: () => {
        onClearSelection();
        onClose();
      },
      destructive: true,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeArea}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.menu}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Options</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItems}>
            {options.length > 0 ? (
              options.map((option, index) => (
                <View key={option.id}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={option.onPress}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={option.destructive ? colors.error : colors.primary}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        option.destructive && styles.menuItemTextDestructive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                  {index < options.length - 1 && (
                    <View style={styles.menuItemDivider} />
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noOptionsText}>No additional options available</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  closeArea: {
    flex: 1,
  },
  menu: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.lg,
    maxHeight: '80%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  menuItems: {
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  menuItemTextDestructive: {
    color: colors.error,
  },
  menuItemDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.lg,
  },
  noOptionsText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
