/**
 * ItemDetailModal Component
 * Quick view modal for wardrobe items
 */

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder, PrimaryButton } from '@/components/shared';
import { theme, commonStyles } from '@/styles';
import { WardrobeItem } from '@/lib/wardrobe';

const { colors, spacing, borderRadius, typography } = theme;

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
          {/* Header */}
          <View style={styles.header}>
            {onAddToOutfit && (
              <TouchableOpacity style={styles.addButton} onPress={onAddToOutfit}>
                <Ionicons name="add-circle" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Add to outfit</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.actions}>
              {onOpenDetail && (
                <TouchableOpacity style={styles.actionButton} onPress={onOpenDetail}>
                  <Ionicons name="open-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
              {onEdit && isOwner && (
                <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                  <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
              {onDelete && isOwner && (
                <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
