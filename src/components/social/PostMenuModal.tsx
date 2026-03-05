/**
 * Post Menu Modal Component
 * Dropdown menu for post actions (edit, delete, try on, unfollow)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';
import { FeedItem } from '@/lib/posts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostMenuModalProps {
  visible: boolean;
  feedItem: FeedItem | null;
  currentUserId: string | undefined;
  isFollowingOwner: boolean;
  buttonPosition: { x: number; y: number; width: number; height: number } | null;
  tryingOnOutfit: boolean;
  unfollowingUserId: string | null;
  onClose: () => void;
  onEditOutfit: (outfitId: string) => void;
  onArchiveOutfit?: (outfitId: string) => void;
  onDeletePost: (postId: string) => void;
  onTryOnOutfit: (outfitId: string, imageUrl: string | null) => void;
  onApplyLook?: (variationId: string, inputSnapshotJson: any) => void;
  onUnfollow: (userId: string) => void;
  getImageUrl?: (outfitId: string) => string | null;
}

export const PostMenuModal = ({
  visible,
  feedItem,
  currentUserId,
  isFollowingOwner,
  buttonPosition,
  tryingOnOutfit,
  unfollowingUserId,
  onClose,
  onEditOutfit,
  onArchiveOutfit,
  onDeletePost,
  onTryOnOutfit,
  onApplyLook,
  onUnfollow,
  getImageUrl,
}: PostMenuModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible || !feedItem) return null;

  const post = feedItem.type === 'post' ? feedItem.post! : feedItem.repost!.original_post!;
  const isOutfit = post.entity_type === 'outfit';
  const isHeadshot = post.entity_type === 'headshot';
  const entity = feedItem.entity?.outfit || feedItem.entity?.lookbook;
  const headshotEntity = feedItem.entity?.headshot;
  const isOwnPost = feedItem.type === 'post' && post.owner_user_id === currentUserId;
  const ownerId = post.owner_user_id;

  // Calculate menu position
  const calculateMenuPosition = () => {
    if (!buttonPosition) return {};

    const menuItemHeight = 50;
    let itemCount = isOwnPost
      ? (isOutfit && entity ? 3 : 1)
      : ((isOutfit && entity ? 1 : 0) + (isHeadshot && headshotEntity?.variation_id ? 1 : 0));
    
    // Add unfollow option if following the owner
    if (!isOwnPost && isFollowingOwner) {
      itemCount += 1;
    }
    
    const dropdownHeight = itemCount * menuItemHeight;
    const spacing = 8;
    
    // Position below button
    let top = buttonPosition.y + buttonPosition.height + spacing;
    
    // If dropdown would go off bottom, position above button
    if (top + dropdownHeight > SCREEN_HEIGHT - 20) {
      top = buttonPosition.y - dropdownHeight - spacing;
    }
    
    // Ensure minimum top margin
    if (top < 20) {
      top = 20;
    }
    
    // Calculate right position
    const dropdownWidth = 180;
    const buttonRight = buttonPosition.x + buttonPosition.width;
    let right = SCREEN_WIDTH - buttonRight;
    
    // Ensure dropdown stays on screen
    if (right < 16) {
      right = 16;
    } else if (right + dropdownWidth > SCREEN_WIDTH - 16) {
      right = SCREEN_WIDTH - dropdownWidth - 16;
    }
    
    return {
      position: 'absolute' as const,
      top,
      right,
      marginTop: 0,
      marginRight: 0,
      alignSelf: 'auto' as const,
    };
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.dropdownBorder,
            buttonPosition ? calculateMenuPosition() : {},
          ]}
        >
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={styles.dropdown}
          >
          {isOwnPost ? (
            <>
              {isOutfit && entity && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onEditOutfit(entity.id)}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.menuItemText}>Edit Outfit</Text>
                </TouchableOpacity>
              )}
              {isOutfit && entity && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onArchiveOutfit?.(entity.id)}
                >
                  <Ionicons name="archive-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.menuItemText}>Archive Outfit</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={() => onDeletePost(post.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete Post</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {isOutfit && entity && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onTryOnOutfit(
                    entity.id,
                    getImageUrl ? getImageUrl(entity.id) : null
                  )}
                  disabled={tryingOnOutfit}
                >
                  {tryingOnOutfit ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="shirt-outline" size={18} color={colors.primary} />
                  )}
                  <Text style={[styles.menuItemText, styles.menuItemTextPrimary]}>
                    {tryingOnOutfit ? 'Generating...' : 'Try on Outfit'}
                  </Text>
                </TouchableOpacity>
              )}
              {isHeadshot && headshotEntity?.variation_id && onApplyLook && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onApplyLook(headshotEntity.variation_id!, headshotEntity.input_snapshot_json);
                  }}
                >
                  <Ionicons name="color-wand-outline" size={18} color={colors.primary} />
                  <Text style={[styles.menuItemText, styles.menuItemTextPrimary]}>Apply This Look</Text>
                </TouchableOpacity>
              )}
              {isFollowingOwner && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onUnfollow(ownerId)}
                  disabled={unfollowingUserId === ownerId}
                >
                  {unfollowingUserId === ownerId ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Ionicons name="person-remove-outline" size={18} color={colors.textPrimary} />
                  )}
                  <Text style={styles.menuItemText}>
                    {unfollowingUserId === ownerId ? 'Unfollowing...' : 'Unfollow'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          </BlurView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownBorder: {
    borderRadius: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
      : {
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }),
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    // Default positioning (used when buttonPosition is null)
    marginRight: 16,
    marginTop: 70,
    alignSelf: 'flex-end',
  },
  dropdown: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  menuItemTextPrimary: {
    color: colors.primary,
  },
  menuItemTextDanger: {
    color: '#FF3B30',
  },
});
