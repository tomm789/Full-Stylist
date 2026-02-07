/**
 * Post Menu Modal Component
 * Dropdown menu for post actions (edit, delete, try on, unfollow)
 */

import React from 'react';
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
import { Ionicons } from '@expo/vector-icons';
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
  onUnfollow,
  getImageUrl,
}: PostMenuModalProps) => {
  if (!visible || !feedItem) return null;

  const post = feedItem.type === 'post' ? feedItem.post! : feedItem.repost!.original_post!;
  const isOutfit = post.entity_type === 'outfit';
  const entity = feedItem.entity?.outfit || feedItem.entity?.lookbook;
  const isOwnPost = feedItem.type === 'post' && post.owner_user_id === currentUserId;
  const ownerId = post.owner_user_id;

  // Calculate menu position
  const calculateMenuPosition = () => {
    if (!buttonPosition) return {};

    const menuItemHeight = 50;
    let itemCount = isOwnPost 
      ? (isOutfit && entity ? 3 : 1)
      : (isOutfit && entity ? 1 : 0);
    
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
            styles.dropdown,
            buttonPosition ? calculateMenuPosition() : {},
          ]}
        >
          {isOwnPost ? (
            <>
              {isOutfit && entity && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onEditOutfit(entity.id)}
                >
                  <Ionicons name="pencil-outline" size={18} color="#000" />
                  <Text style={styles.menuItemText}>Edit Outfit</Text>
                </TouchableOpacity>
              )}
              {isOutfit && entity && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onArchiveOutfit?.(entity.id)}
                >
                  <Ionicons name="archive-outline" size={18} color="#000" />
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
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons name="shirt-outline" size={18} color="#007AFF" />
                  )}
                  <Text style={[styles.menuItemText, styles.menuItemTextPrimary]}>
                    {tryingOnOutfit ? 'Generating...' : 'Try on Outfit'}
                  </Text>
                </TouchableOpacity>
              )}
              {isFollowingOwner && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => onUnfollow(ownerId)}
                  disabled={unfollowingUserId === ownerId}
                >
                  {unfollowingUserId === ownerId ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="person-remove-outline" size={18} color="#000" />
                  )}
                  <Text style={styles.menuItemText}>
                    {unfollowingUserId === ownerId ? 'Unfollowing...' : 'Unfollow'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 10,
        }),
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // Default positioning (used when buttonPosition is null)
    marginRight: 16,
    marginTop: 70,
    alignSelf: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 14,
    color: '#000',
  },
  menuItemTextPrimary: {
    color: '#007AFF',
  },
  menuItemTextDanger: {
    color: '#FF3B30',
  },
});
