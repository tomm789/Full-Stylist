/**
 * useSocialModals Hook
 * Modal state and handlers for social feed screen
 */

import { useState, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { FeedItem, deletePost } from '@/lib/posts';
import { getComments, Comment } from '@/lib/engagement';
import { unfollowUser } from '@/lib/user';

interface UseSocialModalsProps {
  refreshFeed: () => Promise<void>;
}

interface UseSocialModalsReturn {
  // Comments modal
  showComments: boolean;
  selectedItem: FeedItem | null;
  comments: Comment[];
  setShowComments: (show: boolean) => void;
  openComments: (item: FeedItem) => Promise<void>;
  setComments: (comments: Comment[]) => void;

  // Find similar modal
  showFindSimilar: boolean;
  findSimilarEntityType: 'wardrobe_item' | 'outfit';
  findSimilarEntityId: string;
  findSimilarCategoryId: string | undefined;
  setShowFindSimilar: (show: boolean) => void;
  setFindSimilarEntityType: (type: 'wardrobe_item' | 'outfit') => void;
  setFindSimilarEntityId: (id: string) => void;
  setFindSimilarCategoryId: (categoryId: string | undefined) => void;
  handleFindSimilar: (
    entityType: 'wardrobe_item' | 'outfit',
    entityId: string,
    categoryId?: string
  ) => void;

  // Post menu modal
  openMenuPostId: string | null;
  menuButtonPosition: { x: number; y: number; width: number; height: number } | null;
  setOpenMenuPostId: (postId: string | null) => void;
  setMenuButtonPosition: (
    position: { x: number; y: number; width: number; height: number } | null
  ) => void;
  handleDeletePost: (postId: string) => Promise<void>;
  handleEditOutfit: (outfitId: string) => void;

  // Follow state
  followStatuses: Map<string, boolean>;
  unfollowingUserId: string | null;
  setFollowStatuses: (statuses: Map<string, boolean>) => void;
  handleUnfollow: (userId: string) => Promise<void>;

  // Refs
  menuButtonRefs: React.MutableRefObject<Map<string, any>>;
  menuButtonPositions: React.MutableRefObject<
    Map<string, { x: number; y: number; width: number; height: number }>
  >;
}

export function useSocialModals({
  refreshFeed,
}: UseSocialModalsProps): UseSocialModalsReturn {
  const router = useRouter();
  const { user } = useAuth();

  // Comments modal
  const [showComments, setShowComments] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  // Find similar modal
  const [showFindSimilar, setShowFindSimilar] = useState(false);
  const [findSimilarEntityType, setFindSimilarEntityType] = useState<
    'wardrobe_item' | 'outfit'
  >('outfit');
  const [findSimilarEntityId, setFindSimilarEntityId] = useState<string>('');
  const [findSimilarCategoryId, setFindSimilarCategoryId] = useState<string | undefined>();

  // Post menu modal
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Follow state
  const [followStatuses, setFollowStatuses] = useState<Map<string, boolean>>(new Map());
  const [unfollowingUserId, setUnfollowingUserId] = useState<string | null>(null);

  // Refs
  const menuButtonRefs = useRef<Map<string, any>>(new Map());
  const menuButtonPositions = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());

  const openComments = useCallback(async (item: FeedItem) => {
    setSelectedItem(item);
    const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
    if (post) {
      const { data: commentsData } = await getComments('post', post.id);
      if (commentsData) {
        setComments(commentsData);
      }
    }
    setShowComments(true);
  }, []);

  const handleFindSimilar = useCallback(
    (
      entityType: 'wardrobe_item' | 'outfit',
      entityId: string,
      categoryId?: string
    ) => {
      setFindSimilarEntityType(entityType);
      setFindSimilarEntityId(entityId);
      setFindSimilarCategoryId(categoryId);
      setShowFindSimilar(true);
    },
    []
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      setOpenMenuPostId(null);
      setMenuButtonPosition(null);

      if (Platform.OS === 'web') {
        const confirmed = window.confirm(
          'Are you sure you want to delete this post? This action cannot be undone.'
        );

        if (!confirmed) return;

        const { error } = await deletePost(postId, user.id);

        if (error) {
          alert(`Failed to delete post: ${error.message || error}`);
        } else {
          alert('Post deleted successfully');
          await refreshFeed();
        }
        return;
      }

      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const { error } = await deletePost(postId, user.id);

              if (error) {
                Alert.alert('Error', `Failed to delete post: ${error.message || error}`);
              } else {
                Alert.alert('Success', 'Post deleted successfully');
                await refreshFeed();
              }
            },
          },
        ]
      );
    },
    [user, refreshFeed]
  );

  const handleEditOutfit = useCallback(
    (outfitId: string) => {
      setOpenMenuPostId(null);
      setMenuButtonPosition(null);
      router.push(`/outfits/${outfitId}`);
    },
    [router]
  );

  const handleUnfollow = useCallback(
    async (userId: string) => {
      if (!user) return;

      setUnfollowingUserId(userId);
      setOpenMenuPostId(null);
      setMenuButtonPosition(null);

      try {
        const { error } = await unfollowUser(user.id, userId);
        if (error) {
          Alert.alert('Error', error.message || 'Failed to unfollow user');
        } else {
          setFollowStatuses((prev) => {
            const updated = new Map(prev);
            updated.set(userId, false);
            return updated;
          });
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to unfollow user');
      } finally {
        setUnfollowingUserId(null);
      }
    },
    [user]
  );

  return {
    // Comments modal
    showComments,
    selectedItem,
    comments,
    setShowComments,
    openComments,
    setComments,

    // Find similar modal
    showFindSimilar,
    findSimilarEntityType,
    findSimilarEntityId,
    findSimilarCategoryId,
    setShowFindSimilar,
    setFindSimilarEntityType,
    setFindSimilarEntityId,
    setFindSimilarCategoryId,
    handleFindSimilar,

    // Post menu modal
    openMenuPostId,
    menuButtonPosition,
    setOpenMenuPostId,
    setMenuButtonPosition,
    handleDeletePost,
    handleEditOutfit,

    // Follow state
    followStatuses,
    unfollowingUserId,
    setFollowStatuses,
    handleUnfollow,

    // Refs
    menuButtonRefs,
    menuButtonPositions,
  };
}
