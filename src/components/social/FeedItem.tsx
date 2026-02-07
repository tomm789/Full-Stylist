/**
 * FeedItem Component
 * Single feed item renderer for social feed
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FeedOutfitCard from '@/components/social/FeedOutfitCard';
import FeedLookbookCarousel from '@/components/social/FeedLookbookCarousel';
import { FeedItem } from '@/lib/posts';
import { formatTimestamp } from '@/utils/formatUtils';

interface FeedItemProps {
  item: FeedItem;
  engagementCounts: Record<
    string,
    {
      likes: number;
      saves: number;
      comments: number;
      reposts: number;
      hasLiked: boolean;
      hasSaved: boolean;
      hasReposted: boolean;
    }
  >;
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, string | null>;
  currentUserId: string | undefined;
  onLike: (postId: string) => void;
  onComment: (item: FeedItem) => void;
  onRepost: (postId: string) => void;
  onSave: (postId: string) => void;
  onFindSimilar: (entityType: 'wardrobe_item' | 'outfit', entityId: string, categoryId?: string) => void;
  onMenuPress: (postId: string, position: { x: number; y: number; width: number; height: number }) => void;
  onOpenSlideshow: (lookbookId: string) => void;
  menuButtonRefs: React.MutableRefObject<Map<string, any>>;
  menuButtonPositions: React.MutableRefObject<Map<string, { x: number; y: number; width: number; height: number }>>;
  openMenuPostId: string | null;
  setMenuButtonPosition: (position: { x: number; y: number; width: number; height: number } | null) => void;
  setOpenMenuPostId: (postId: string | null) => void;
}

export function FeedItemComponent({
  item,
  engagementCounts,
  outfitImages,
  lookbookImages,
  currentUserId,
  onLike,
  onComment,
  onRepost,
  onSave,
  onFindSimilar,
  onMenuPress,
  onOpenSlideshow,
  menuButtonRefs,
  menuButtonPositions,
  openMenuPostId,
  setMenuButtonPosition,
  setOpenMenuPostId,
}: FeedItemProps) {
  const router = useRouter();
  const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
  if (!post) return null;

  const counts = engagementCounts[post.id] || {
    likes: 0,
    saves: 0,
    comments: 0,
    reposts: 0,
    hasLiked: false,
    hasSaved: false,
    hasReposted: false,
  };

  const isOutfit = post.entity_type === 'outfit';
  const entity = item.entity?.outfit || item.entity?.lookbook;
  const timestamp = item.type === 'post' ? item.post!.created_at : item.repost!.created_at;
  const isOwnPost = item.type === 'post' && post.owner_user_id === currentUserId;

  const handleMenuPress = (e: any) => {
    e.stopPropagation();
    const cachedPosition = menuButtonPositions.current.get(post.id);
    if (cachedPosition) {
      setMenuButtonPosition(cachedPosition);
      setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
    } else {
      const buttonRef = menuButtonRefs.current.get(post.id);
      if (buttonRef) {
        try {
          buttonRef.measureInWindow((x: number, y: number, width: number, height: number) => {
            const position = { x, y, width, height };
            menuButtonPositions.current.set(post.id, position);
            setMenuButtonPosition(position);
            setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
          });
        } catch (error) {
          buttonRef.measure((fx: number, fy: number, fwidth: number, fheight: number, pageX: number, pageY: number) => {
            const position = { x: pageX, y: pageY, width: fwidth, height: fheight };
            menuButtonPositions.current.set(post.id, position);
            setMenuButtonPosition(position);
            setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
          });
        }
      } else {
        setMenuButtonPosition(null);
        setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
      }
    }
  };

  return (
    <View style={styles.feedCard}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {item.owner?.avatar_url ? (
            <ExpoImage
              source={{ uri: item.owner.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.avatarFallback} />
          )}
          {item.type === 'repost' && (
            <Text style={styles.repostLabel}>
              <TouchableOpacity
                onPress={() => item.owner?.id && router.push(`/users/${item.owner.id}`)}
              >
                <Text style={styles.repostLabelName}>
                  {item.owner?.display_name || item.owner?.handle || 'User'}
                </Text>
              </TouchableOpacity>
              {' reposted'}
            </Text>
          )}
          {item.type === 'post' && item.owner && (
            <TouchableOpacity onPress={() => router.push(`/users/${item.owner.id}`)}>
              <Text style={styles.ownerName}>
                {item.owner?.display_name || item.owner?.handle || 'User'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              ref={(ref) => {
                if (ref) {
                  menuButtonRefs.current.set(post.id, ref);
                } else {
                  menuButtonRefs.current.delete(post.id);
                  menuButtonPositions.current.delete(post.id);
                }
              }}
              style={styles.menuButton}
              onLayout={(event) => {
                const { x, y, width, height } = event.nativeEvent.layout;
                const buttonRef = menuButtonRefs.current.get(post.id);
                if (buttonRef) {
                  buttonRef.measureInWindow((winX: number, winY: number, winWidth: number, winHeight: number) => {
                    menuButtonPositions.current.set(post.id, { x: winX, y: winY, width: winWidth, height: winHeight });
                  });
                }
              }}
              onPress={handleMenuPress}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      {isOutfit && entity && (
        <FeedOutfitCard
          outfit={entity}
          imageUrl={outfitImages.get(entity.id) || null}
          onPress={() => router.push(`/outfits/${entity.id}/view`)}
          loading={!outfitImages.has(entity.id)}
        />
      )}
      {!isOutfit && entity && (
        <FeedLookbookCarousel
          lookbook={entity}
          lookbookImages={lookbookImages}
          onPress={() => router.push(`/lookbooks/${entity.id}/view`)}
          onPlayPress={() => onOpenSlideshow(entity.id)}
          loading={!lookbookImages.has(`${entity.id}_outfits`)}
        />
      )}

      {/* Caption */}
      {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

      {/* Social Actions */}
      <View style={styles.socialActions}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
            <Ionicons
              name={counts.hasLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={counts.hasLiked ? '#ff0000' : '#000'}
            />
            {counts.likes > 0 && <Text style={styles.actionCount}>{counts.likes}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onComment(item)}>
            <Ionicons name="chatbubble-outline" size={26} color="#000" />
            {counts.comments > 0 && <Text style={styles.actionCount}>{counts.comments}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onRepost(post.id)}>
            <Ionicons
              name={counts.hasReposted ? 'repeat' : 'repeat-outline'}
              size={28}
              color={counts.hasReposted ? '#00ba7c' : '#000'}
            />
            {counts.reposts > 0 && <Text style={styles.actionCount}>{counts.reposts}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onSave(post.id)}>
            <Ionicons
              name={counts.hasSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={counts.hasSaved ? '#007AFF' : '#000'}
            />
            {counts.saves > 0 && <Text style={styles.actionCount}>{counts.saves}</Text>}
          </TouchableOpacity>

          {isOutfit && entity && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onFindSimilar('outfit', entity.id, undefined);
              }}
            >
              <Ionicons name="search-outline" size={26} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 0,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 0,
    position: 'relative',
    zIndex: 1000,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 1001,
  },
  repostLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  repostLabelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  caption: {
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  socialActions: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
