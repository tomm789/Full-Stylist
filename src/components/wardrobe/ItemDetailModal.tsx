/**
 * ItemDetailModal Component
 * Quick view modal for wardrobe items
 */

import React, { useState } from 'react';
import { Dimensions, Modal, View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder } from '@/components/shared';
import { DropdownMenuModal, DropdownMenuItem } from '@/components/shared/modals';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeItem } from '@/lib/wardrobe';

const { spacing, borderRadius, typography } = theme;

interface ItemDetailModalProps {
  visible: boolean;
  onClose: () => void;
  item: WardrobeItem | null;
  imageUrl: string | null;
  isOwner: boolean;
  onAddToOutfit?: () => void;
  onOpenDetail?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ItemDetailModal({
  visible,
  onClose,
  item,
  imageUrl,
  isOwner,
  onAddToOutfit,
  onOpenDetail,
  onEdit,
  onDelete,
}: ItemDetailModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [showMenu, setShowMenu] = useState(false);
  const screenHeight = Dimensions.get('window').height;

  const hasMenuItems = isOwner && (onEdit || onDelete);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Expand bar */}
          {onOpenDetail && (
            <TouchableOpacity
              style={styles.expandBar}
              onPress={onOpenDetail}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 40, right: 40 }}
            >
              <View style={styles.expandBarHandle} />
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.header}>
            {onAddToOutfit && (
              <TouchableOpacity style={styles.addButton} onPress={onAddToOutfit}>
                <Ionicons name="add-circle" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Add to outfit</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              {hasMenuItems ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowMenu(true)}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
            ) : (
              <ImagePlaceholder aspectRatio={1} />
            )}

            <View style={styles.details}>
              <Text style={styles.title}>{item.title}</Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>

      {/* Three-dots dropdown menu */}
      <DropdownMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        align="right"
        topOffset={screenHeight * 0.15 + 80}
      >
        {onEdit && isOwner && (
          <DropdownMenuItem
            label="Edit"
            icon="create-outline"
            onPress={() => {
              setShowMenu(false);
              onEdit();
            }}
          />
        )}
        {onDelete && isOwner && (
          <DropdownMenuItem
            label="Delete"
            icon="trash-outline"
            danger
            onPress={() => {
              setShowMenu(false);
              onDelete();
            }}
          />
        )}
      </DropdownMenuModal>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  expandBar: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBarHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  image: {
    width: '100%',
    height: 320,
    borderRadius: borderRadius.lg,
  },
  details: {
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.normal,
  },
});
