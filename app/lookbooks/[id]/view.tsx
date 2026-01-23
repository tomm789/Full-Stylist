import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getLookbook, Lookbook, LookbookOutfit } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LookbookViewScreen() {
  const { id, lookbookIds } = useLocalSearchParams<{ id: string; lookbookIds?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [lookbook, setLookbook] = useState<Lookbook | null>(null);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideshowVisible, setSlideshowVisible] = useState(false);
  const [slideshowLoading, setSlideshowLoading] = useState(false);
  const [slideshowOutfits, setSlideshowOutfits] = useState<any[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<Map<string, string | null>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);

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
  const [navigationLookbooks, setNavigationLookbooks] = useState<Array<{ id: string; title: string }>>([]);
  const [currentLookbookIndex, setCurrentLookbookIndex] = useState(0);
  const navigationScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id && user) {
      loadLookbook();
      loadSocialEngagement();
    }
  }, [id, user]);

  useEffect(() => {
    if (id && lookbookIds) {
      loadNavigationLookbooks();
    }
  }, [id, lookbookIds]);

  useEffect(() => {
    if (!lookbookIds || !id) return;
    const idsArray = lookbookIds.split(',').filter(Boolean);
    const index = idsArray.indexOf(id as string);
    if (index >= 0) {
      setCurrentLookbookIndex(index);
    }
  }, [id, lookbookIds]);

  useEffect(() => {
    if (navigationLookbooks.length > 0 && currentLookbookIndex >= 0 && navigationScrollRef.current) {
      const itemWidth = 100 + 12;
      const scrollPosition = Math.max(0, currentLookbookIndex * itemWidth - SCREEN_WIDTH / 2 + itemWidth / 2);
      setTimeout(() => {
        navigationScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
      }, 100);
    }
  }, [navigationLookbooks, currentLookbookIndex]);

  const loadSocialEngagement = async () => {
    if (!id || !user) return;

    try {
      const [likedRes, likeCountRes, savedRes, saveCountRes, commentCountRes] = await Promise.all([
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

  const getSystemLookbookMeta = (systemType: string) => {
    const titleMap: Record<string, string> = {
      all: 'All Outfits',
      favorites: 'Favorites',
      recent: 'Recent',
      top: 'Top Rated',
    };
    return {
      title: titleMap[systemType] || 'Lookbook',
    };
  };

  const loadNavigationLookbooks = async () => {
    if (!lookbookIds) return;
    try {
      const idsArray = lookbookIds.split(',').filter(Boolean);
      if (idsArray.length === 0) return;

      const systemIds = idsArray.filter((lookbookId) => lookbookId.startsWith('system-'));
      const customIds = idsArray.filter((lookbookId) => !lookbookId.startsWith('system-'));
      const navItems: Array<{ id: string; title: string }> = [];

      if (customIds.length > 0) {
        const { data: lookbookData, error } = await supabase
          .from('lookbooks')
          .select('id, title')
          .in('id', customIds);

        if (error) {
          console.error('Failed to load navigation lookbooks:', error);
        } else {
          const lookbookMap = new Map((lookbookData || []).map((lb) => [lb.id, lb.title]));
          customIds.forEach((lookbookId) => {
            const title = lookbookMap.get(lookbookId);
            if (title) {
              navItems.push({ id: lookbookId, title });
            }
          });
        }
      }

      systemIds.forEach((lookbookId) => {
        const systemType = lookbookId.replace('system-', '');
        const meta = getSystemLookbookMeta(systemType);
        navItems.push({ id: lookbookId, title: meta.title });
      });

      const orderedNavItems = idsArray
        .map((lookbookId) => navItems.find((item) => item.id === lookbookId))
        .filter((item): item is { id: string; title: string } => Boolean(item));

      setNavigationLookbooks(orderedNavItems);
    } catch (error) {
      console.error('Failed to load navigation lookbooks:', error);
    }
  };

  const navigateToLookbook = (targetLookbookId: string) => {
    if (!lookbookIds) return;
    const query = `lookbookIds=${encodeURIComponent(lookbookIds)}`;
    router.replace(`/lookbooks/${targetLookbookId}/view?${query}`);
  };

  const handleBackPress = () => {
    if (lookbookIds) {
      router.replace('/(tabs)/lookbooks');
      return;
    }
    router.back();
  };

  const loadLookbook = async () => {
    if (!id || !user) return;

    setLoading(true);

    try {
      const { data, error } = await getLookbook(id as string);

      if (error || !data) {
        router.back();
        return;
      }

      setLookbook(data.lookbook);

      // Load outfits based on lookbook type
      if (data.lookbook.type === 'custom_manual') {
        // Get outfits from the lookbook owner, not the current user
        const { data: allOutfits } = await getUserOutfits(data.lookbook.owner_user_id);
        if (allOutfits) {
          const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
          const lookbookOutfits = data.outfits
            .map((lo: LookbookOutfit) => outfitMap.get(lo.outfit_id))
            .filter(Boolean);
          setOutfits(lookbookOutfits);
        }
      } else {
        setOutfits([]);
      }
    } catch (error: any) {
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const openSlideshow = async () => {
    if (!user || outfits.length === 0) return;

    setSlideshowLoading(true);
    
    try {
      // Pre-load all images BEFORE opening slideshow
      const imageMap = new Map<string, string | null>();
      const loadPromises = outfits.map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        imageMap.set(outfit.id, url);
      });
      await Promise.all(loadPromises);
      
      // Now open the slideshow with images ready
      setSlideshowImages(imageMap);
      setSlideshowOutfits(outfits);
      setCurrentSlideIndex(0);
      setIsAutoPlaying(true);
      setSlideshowVisible(true);
    } finally {
      setSlideshowLoading(false);
    }
  };

  const closeSlideshow = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
    setSlideshowVisible(false);
    setSlideshowOutfits([]);
    setSlideshowImages(new Map());
    setCurrentSlideIndex(0);
    setIsAutoPlaying(true);
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
      // Load comments when opening for the first time
      const { data } = await getComments('lookbook', id as string);
      if (data) {
        setComments(data);
      }
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!user || !id || !commentText.trim()) return;

    setSubmittingComment(true);
    const { data, error } = await createComment(user.id, 'lookbook', id as string, commentText.trim());
    
    if (!error && data) {
      setComments([data, ...comments]);
      setCommentCount(commentCount + 1);
      setCommentText('');
    }
    
    setSubmittingComment(false);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slideshowOutfits.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setCurrentSlideIndex(0);
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else {
      setCurrentSlideIndex(slideshowOutfits.length - 1);
    }
  };

  const handleManualNavigation = (direction: 'next' | 'prev') => {
    setIsAutoPlaying(false);
    if (direction === 'next') {
      nextSlide();
    } else {
      previousSlide();
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  // Auto-play effect
  useEffect(() => {
    if (slideshowVisible && isAutoPlaying && slideshowOutfits.length > 0) {
      const interval = setInterval(() => {
        nextSlide();
      }, 4000);
      setAutoPlayInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
  }, [slideshowVisible, isAutoPlaying, currentSlideIndex, slideshowOutfits.length]);

  const OutfitCard = ({ item }: { item: any }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      getOutfitCoverImageUrl(item).then(setImageUrl);
    }, [item]);

    return (
      <TouchableOpacity
        style={styles.outfitCard}
        onPress={() => router.push(`/outfits/${item.id}/view`)}
      >
        {imageUrl ? (
          <ExpoImage source={{ uri: imageUrl }} style={styles.outfitImage} contentFit="cover" />
        ) : (
          <View style={styles.outfitImagePlaceholder}>
            <Text style={styles.outfitImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <Text style={styles.outfitTitle} numberOfLines={2}>
          {item.title || 'Untitled Outfit'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (!lookbook) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Lookbook not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {lookbook.owner_user_id === user?.id && (
            <TouchableOpacity onPress={() => router.push(`/lookbooks/${lookbook.id}`)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Lookbook Header */}
        <View style={styles.lookbookHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.lookbookTitle}>{lookbook.title}</Text>
            {outfits.length > 0 && (
              <TouchableOpacity
                style={styles.playButton}
                onPress={openSlideshow}
                disabled={slideshowLoading}
              >
                <Text style={styles.playButtonText}>▶</Text>
              </TouchableOpacity>
            )}
          </View>
          {lookbook.description && (
            <Text style={styles.lookbookDescription}>{lookbook.description}</Text>
          )}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Type:</Text>
              <Text style={styles.metadataValue}>
                {lookbook.type.startsWith('custom_') ? 'Custom' : 'System'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Visibility:</Text>
              <Text style={styles.metadataValue}>
                {lookbook.visibility === 'public'
                  ? 'Public'
                  : lookbook.visibility === 'followers'
                  ? 'Followers'
                  : lookbook.visibility === 'private_link'
                  ? 'Private Link'
                  : 'Private'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Outfits:</Text>
              <Text style={styles.metadataValue}>{outfits.length}</Text>
            </View>
          </View>
        </View>

        {/* Social Actions */}
        <View style={styles.socialActions}>
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={28}
                color={liked ? '#ff0000' : '#000'}
              />
              {likeCount > 0 && <Text style={styles.actionCount}>{likeCount}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCommentPress} style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={26} color="#000" />
              {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={26}
                color={saved ? '#007AFF' : '#000'}
              />
              {saveCount > 0 && <Text style={styles.actionCount}>{saveCount}</Text>}
            </TouchableOpacity>
          </View>

          {/* Comments Section */}
          {showComments && (
            <View style={styles.commentsSection}>
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  editable={!submittingComment}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || submittingComment}
                  style={[styles.commentSubmitButton, (!commentText.trim() || submittingComment) && styles.commentSubmitButtonDisabled]}
                >
                  <Text style={styles.commentSubmitText}>Post</Text>
                </TouchableOpacity>
              </View>

              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>
                    {comment.user?.display_name || comment.user?.handle || 'User'}
                  </Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Outfits Grid */}
        {outfits.length === 0 ? (
          <View style={styles.emptyOutfitsContainer}>
            <Text style={styles.emptyOutfitsText}>No outfits in this lookbook yet</Text>
          </View>
        ) : (
          <View style={styles.outfitsSection}>
            <Text style={styles.sectionTitle}>Outfits</Text>
            <FlatList
              data={outfits}
              renderItem={({ item }) => <OutfitCard item={item} />}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.outfitsList}
            />
          </View>
        )}
      </ScrollView>

      {navigationLookbooks.length > 1 && (
        <View style={styles.navigationContainer}>
          <ScrollView
            horizontal
            ref={navigationScrollRef}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigationScrollContent}
          >
            {navigationLookbooks.map((navLookbook) => {
              const isActive = navLookbook.id === id;
              return (
                <TouchableOpacity
                  key={navLookbook.id}
                  style={[styles.navigationItem, isActive && styles.navigationItemActive]}
                  onPress={() => !isActive && navigateToLookbook(navLookbook.id)}
                  disabled={isActive}
                >
                  <View style={styles.navigationPlaceholder}>
                    <Text style={styles.navigationPlaceholderText}>
                      {navLookbook.title?.charAt(0) || 'L'}
                    </Text>
                  </View>
                  <Text style={styles.navigationTitle} numberOfLines={1}>
                    {navLookbook.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Loading Modal */}
      <Modal
        visible={slideshowLoading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingModalContainer}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingModalText}>Loading slideshow...</Text>
          </View>
        </View>
      </Modal>

      {/* Slideshow Modal */}
      <Modal
        visible={slideshowVisible}
        animationType="fade"
        onRequestClose={closeSlideshow}
        statusBarTranslucent
      >
        <View style={styles.slideshowContainer}>
          <StatusBar hidden />
          
          {/* Close Button */}
          <TouchableOpacity style={styles.slideshowCloseButton} onPress={closeSlideshow}>
            <Text style={styles.slideshowCloseButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <TouchableOpacity style={styles.playPauseButton} onPress={toggleAutoPlay}>
            <Text style={styles.playPauseButtonText}>
              {isAutoPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Current Slide */}
          {slideshowOutfits.length > 0 && (
            <>
              <SlideshowSlide 
                outfit={slideshowOutfits[currentSlideIndex]} 
                imageUrl={slideshowImages.get(slideshowOutfits[currentSlideIndex].id) || null}
              />
              
              {/* Navigation Arrows */}
              <TouchableOpacity style={styles.leftArrow} onPress={() => handleManualNavigation('prev')}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rightArrow} onPress={() => handleManualNavigation('next')}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              {/* Slide Counter */}
              <View style={styles.slideCounter}>
                <Text style={styles.slideCounterText}>
                  {currentSlideIndex + 1} / {slideshowOutfits.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Slideshow Slide Component
const SlideshowSlide = ({ outfit, imageUrl }: { outfit: any; imageUrl: string | null }) => {
  return (
    <View style={styles.slide}>
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.slideImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
        />
      ) : (
        <View style={styles.slideImagePlaceholder}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <View style={styles.slideInfo}>
        <Text style={styles.slideTitle}>{outfit.title || 'Untitled Outfit'}</Text>
        {outfit.notes && (
          <Text style={styles.slideDescription}>{outfit.notes}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  lookbookHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  lookbookTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    lineHeight: 34,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 2,
  },
  lookbookDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  socialActions: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  commentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  commentSubmitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentItem: {
    marginBottom: 12,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
  },
  outfitsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  outfitsList: {
    gap: 8,
  },
  outfitCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 1,
  },
  outfitImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  outfitTitle: {
    padding: 8,
    fontSize: 14,
    fontWeight: '500',
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
    marginBottom: 16,
    textAlign: 'center',
  },
  navigationContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  navigationScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  navigationItem: {
    width: 100,
    alignItems: 'center',
  },
  navigationItemActive: {
    opacity: 0.6,
  },
  navigationPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  navigationPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  navigationTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  // Loading Modal Styles
  loadingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    padding: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  loadingModalText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  // Slideshow Modal Styles
  slideshowContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowCloseButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  playPauseButton: {
    position: 'absolute',
    top: 50,
    right: 70,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  slideImagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  slideTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  slideDescription: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  leftArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  slideCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  slideCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
