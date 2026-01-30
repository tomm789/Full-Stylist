/**
 * Lookbook View Screen (Refactored)
 * Read-only view of a lookbook with social engagement
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  likeEntity,
  unlikeEntity,
  hasLiked,
  getLikeCount,
  saveEntity,
  unsaveEntity,
  hasSaved,
  getSaveCount,
  createComment,
  getComments,
  getCommentCount,
  Comment,
} from '@/lib/engagement';
import { useLookbookDetail, useSlideshow } from '@/hooks/lookbooks';
import {
  LookbookHeader,
  LookbookOutfitGrid,
  SlideshowModal,
} from '@/components/lookbooks';
import { LoadingSpinner } from '@/components/shared';
import {
  DropdownMenuModal,
  DropdownMenuItem,
} from '@/components/shared/modals';
import { CommentsModal } from '@/components/social';
import { Header, HeaderActionButton, HeaderIconButton } from '@/components/shared/layout';

export default function LookbookViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Data loading
  const { lookbook, outfits, loading, refresh } = useLookbookDetail({
    lookbookId: id as string,
    userId: user?.id,
  });

  // Slideshow
  const slideshow = useSlideshow({ autoPlayInterval: 4000 });

  // Social engagement state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadSocialEngagement();
    }
  }, [id, user]);

  const loadSocialEngagement = async () => {
    if (!id || !user) return;

    try {
      const [
        likedRes,
        likeCountRes,
        savedRes,
        saveCountRes,
        commentCountRes,
      ] = await Promise.all([
        hasLiked(user.id, 'lookbook', id as string),
        getLikeCount('lookbook', id as string),
        hasSaved(user.id, 'lookbook', id as string),
        getSaveCount('lookbook', id as string),
        getCommentCount('lookbook', id as string),
      ]);

      setLiked(likedRes);
      setLikeCount(likeCountRes);
      setSaved(savedRes);
      setSaveCount(saveCountRes);
      setCommentCount(commentCountRes);
    } catch (error) {
      console.error('Failed to load social engagement', error);
    }
  };

  const handleLike = async () => {
    if (!user || !id) return;

    if (liked) {
      await unlikeEntity(user.id, 'lookbook', id as string);
      setLiked(false);
      setLikeCount(Math.max(0, likeCount - 1));
    } else {
      await likeEntity(user.id, 'lookbook', id as string);
      setLiked(true);
      setLikeCount(likeCount + 1);
    }
  };

  const handleSave = async () => {
    if (!user || !id) return;

    if (saved) {
      await unsaveEntity(user.id, 'lookbook', id as string);
      setSaved(false);
      setSaveCount(Math.max(0, saveCount - 1));
    } else {
      await saveEntity(user.id, 'lookbook', id as string);
      setSaved(true);
      setSaveCount(saveCount + 1);
    }
  };

  const handleCommentPress = async () => {
    if (!showComments && comments.length === 0) {
      const { data } = await getComments('lookbook', id as string);
      if (data) {
        setComments(data);
      }
    }
    setShowComments(true);
  };

  const handleSubmitComment = async () => {
    if (!user || !id || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await createComment(user.id, 'lookbook', id as string, commentText.trim());
      setCommentText('');
      setCommentCount(commentCount + 1);
      const { data } = await getComments('lookbook', id as string);
      if (data) {
        setComments(data);
      }
    } catch (error: any) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenSlideshow = async () => {
    if (outfits.length === 0) return;
    await slideshow.open(outfits);
  };

  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = () => setShowMenu(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (!lookbook) {
    return (
      <View style={styles.container}>
        <Header
          leftContent={
            <HeaderActionButton
              label="Back"
              onPress={() => router.back()}
            />
          }
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Lookbook not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        leftContent={
          <HeaderActionButton
            label="Back"
            onPress={() => router.back()}
          />
        }
        rightContent={
          <HeaderIconButton
            icon="ellipsis-vertical"
            onPress={() => setShowMenu(true)}
            accessibilityLabel="Open menu"
          />
        }
      />

      <DropdownMenuModal
        visible={showMenu}
        onClose={closeMenu}
        topOffset={100}
        align="right"
      >
        <DropdownMenuItem
          label={slideshow.loading ? 'Loading...' : 'Play slideshow'}
          icon="play-outline"
          onPress={() => {
            closeMenu();
            handleOpenSlideshow();
          }}
          disabled={outfits.length === 0 || slideshow.loading}
        />
      </DropdownMenuModal>

      <ScrollView style={styles.content}>
        {/* Lookbook Header */}
        <LookbookHeader lookbook={lookbook} outfitCount={outfits.length} />

        {/* Outfits Grid */}
        {outfits.length === 0 ? (
          <View style={styles.emptyOutfitsContainer}>
            <Text style={styles.emptyOutfitsText}>
              No outfits in this lookbook
            </Text>
          </View>
        ) : (
          <LookbookOutfitGrid
            outfits={outfits}
            lookbook={lookbook}
            lookbookId={id}
            onFavoritePress={() => {}}
            onMenuPress={() => {}}
          />
        )}

        {/* Social Actions */}
        <View style={styles.socialActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? '#ff0000' : '#000'}
            />
            {likeCount > 0 && (
              <Text style={styles.actionCount}>{likeCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCommentPress}
          >
            <Ionicons name="chatbubble-outline" size={26} color="#000" />
            {commentCount > 0 && (
              <Text style={styles.actionCount}>{commentCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={saved ? '#007AFF' : '#000'}
            />
            {saveCount > 0 && (
              <Text style={styles.actionCount}>{saveCount}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={id as string}
        userId={user?.id}
        comments={comments}
        onCommentsUpdate={setComments}
        onCountUpdate={setCommentCount}
      />

      {/* Slideshow Modal */}
      <SlideshowModal
        visible={slideshow.visible}
        outfits={slideshow.outfits}
        images={slideshow.images}
        currentIndex={slideshow.currentIndex}
        isAutoPlaying={slideshow.isAutoPlaying}
        onClose={slideshow.close}
        onNext={() => slideshow.next()}
        onPrevious={() => slideshow.previous()}
        onToggleAutoPlay={slideshow.toggleAutoPlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyOutfitsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyOutfitsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  socialActions: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
