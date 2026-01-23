import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import FindSimilarModal from '@/app/components/FindSimilarModal';
import { getFeed, FeedItem, Post, deletePost } from '@/lib/posts';
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
import { createRepost, removeRepost, hasReposted, getRepostCount } from '@/lib/reposts';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits, getOutfit, saveOutfit } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { createAIJob, triggerAIJobExecution, pollAIJobWithFinalCheck } from '@/lib/ai-jobs';
import { supabase } from '@/lib/supabase';
import { getWardrobeCategories, getWardrobeItemsByIds } from '@/lib/wardrobe';
import { unfollowUser, isFollowing } from '@/lib/user';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to format timestamps
const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const posted = new Date(timestamp);
  const diffMs = now.getTime() - posted.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For posts older than 7 days, show the date
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (posted.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return posted.toLocaleDateString('en-US', options);
};

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [outfitImagesCache, setOutfitImagesCache] = useState<Map<string, string | null>>(new Map());
  const [lookbookImagesCache, setLookbookImagesCache] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showFindSimilar, setShowFindSimilar] = useState(false);
  const [findSimilarEntityType, setFindSimilarEntityType] = useState<'wardrobe_item' | 'outfit'>('outfit');
  const [findSimilarEntityId, setFindSimilarEntityId] = useState<string>('');
  const [findSimilarCategoryId, setFindSimilarCategoryId] = useState<string | undefined>();
  const [engagementCounts, setEngagementCounts] = useState<
    Record<
      string,
      { likes: number; saves: number; comments: number; reposts: number; hasLiked: boolean; hasSaved: boolean; hasReposted: boolean }
    >
  >({});
  const [slideshowVisible, setSlideshowVisible] = useState(false);
  const [slideshowLoading, setSlideshowLoading] = useState(false);
  const [slideshowOutfits, setSlideshowOutfits] = useState<any[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<Map<string, string | null>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [lookbookCarouselIndices, setLookbookCarouselIndices] = useState<Map<string, number>>(new Map());
  const [lookbookOutfitsCache, setLookbookOutfitsCache] = useState<Map<string, any[]>>(new Map());
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [tryingOnOutfit, setTryingOnOutfit] = useState(false);
  const [generatingOutfitId, setGeneratingOutfitId] = useState<string | null>(null);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [followStatuses, setFollowStatuses] = useState<Map<string, boolean>>(new Map()); // Map of owner_user_id -> isFollowing
  const [unfollowingUserId, setUnfollowingUserId] = useState<string | null>(null);
  const menuButtonRefs = useRef<Map<string, any>>(new Map());
  const menuButtonPositions = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const flatListRef = useRef<FlatList>(null);
  const outfitDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && !isLoadingFeed) {
      loadFeed();
    }
  }, [user]);

  const loadFeed = async () => {
    if (!user || isLoadingFeed) return;

    setIsLoadingFeed(true);
    setLoading(true);
    const { data: feedItems, error: feedError } = await getFeed(user.id, 50, 0);
    
    if (feedItems) {
      setFeed(feedItems);

      // Load engagement counts for all items IN PARALLEL
      const counts: typeof engagementCounts = {};
      const newImageCache = new Map<string, string | null>();
      const newFollowStatuses = new Map<string, boolean>();
      
      // Process all items in parallel using Promise.all
      await Promise.all(feedItems.map(async (item) => {
        const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
        if (!post) return;

        const postId = post.id;
        const ownerId = post.owner_user_id;
        const entityId = item.entity?.outfit ? item.entity.outfit.id : item.entity?.lookbook?.id || '';
        const entityType = post.entity_type === 'outfit' ? 'outfit' : 'lookbook';

        // Check follow status for non-own posts
        if (ownerId !== user.id && !newFollowStatuses.has(ownerId)) {
          const { isFollowing: following } = await isFollowing(user.id, ownerId);
          newFollowStatuses.set(ownerId, following);
        }

        const [likes, saves, comments, reposts, liked, saved, reposted] = await Promise.all([
          getLikeCount('post', postId),
          getSaveCount('post', postId),
          getCommentCount('post', postId),
          postId ? getRepostCount(postId) : Promise.resolve(0),
          hasLiked(user.id, 'post', postId),
          hasSaved(user.id, 'post', postId),
          postId ? hasReposted(user.id, postId) : Promise.resolve(false),
        ]);

        counts[postId] = {
          likes,
          saves,
          comments,
          reposts,
          hasLiked: liked,
          hasSaved: saved,
          hasReposted: reposted,
        };
        
        // Cache outfit images (with deduplication check)
        if (entityType === 'outfit' && item.entity?.outfit) {
          const outfitId = item.entity.outfit.id;
          // Check both old cache and new cache to avoid duplicates
          if (!outfitImagesCache.has(outfitId) && !newImageCache.has(outfitId)) {
            const url = await getOutfitCoverImageUrl(item.entity.outfit);
            newImageCache.set(outfitId, url);
          } else if (outfitImagesCache.has(outfitId) && !newImageCache.has(outfitId)) {
            newImageCache.set(outfitId, outfitImagesCache.get(outfitId)!);
          }
        }
        
        // Cache lookbook outfits and their images for carousel
        if (entityType === 'lookbook' && item.entity?.lookbook) {
          const lookbookId = item.entity.lookbook.id;
          if (!lookbookImagesCache.has(lookbookId) && !newImageCache.has(lookbookId)) {
            const { data } = await getLookbook(lookbookId);
            console.log('[LOOKBOOK CAROUSEL]', {lookbookId, outfitsCount: data?.outfits?.length, ownerId: data?.lookbook?.owner_user_id, currentUser: user?.id});
            if (data && data.outfits.length > 0) {
              // Get all outfits from the lookbook owner (not current user!)
              const lookbookOwnerId = data.lookbook.owner_user_id;
              const { data: allOutfits } = await getUserOutfits(lookbookOwnerId);
              console.log('[CAROUSEL OUTFITS]', {lookbookId, ownerId: lookbookOwnerId, allOutfitsCount: allOutfits?.length, outfitIds: allOutfits?.slice(0,3).map((o:any)=>o.id)});
              if (allOutfits) {
                const lookbookOutfits = data.outfits
                  .map((lo: any) => allOutfits.find((o: any) => o.id === lo.outfit_id))
                  .filter(Boolean);
                console.log('[CAROUSEL MAPPED]', {lookbookId, lookbookOutfitsCount: lookbookOutfits.length, matchedIds: lookbookOutfits.map((o:any)=>o.id)});
                
                // Store the outfits for carousel
                newImageCache.set(`${lookbookId}_outfits`, lookbookOutfits);
                
                // Get first outfit image as thumbnail + Pre-load all outfit images IN PARALLEL
                if (lookbookOutfits.length > 0) {
                  // Load all outfit images in parallel using Promise.all
                  const imageUrls = await Promise.all(
                    lookbookOutfits.map(async (outfit) => {
                      // Check cache before fetching
                      const cacheKey = `${lookbookId}_outfit_${outfit.id}`;
                      if (newImageCache.has(cacheKey) || lookbookImagesCache.has(cacheKey)) {
                        return { outfitId: outfit.id, url: newImageCache.get(cacheKey) || lookbookImagesCache.get(cacheKey) };
                      }
                      const url = await getOutfitCoverImageUrl(outfit);
                      return { outfitId: outfit.id, url };
                    })
                  );
                  
                  // Set first image as thumbnail
                  if (imageUrls.length > 0) {
                    newImageCache.set(lookbookId, imageUrls[0].url);
                  }
                  
                  // Cache all outfit images
                  imageUrls.forEach(({ outfitId, url }) => {
                    newImageCache.set(`${lookbookId}_outfit_${outfitId}`, url);
                  });
                } else {
                  newImageCache.set(lookbookId, null);
                }
              } else {
                newImageCache.set(lookbookId, null);
              }
            } else {
              newImageCache.set(lookbookId, null);
            }
          } else if (lookbookImagesCache.has(lookbookId) && !newImageCache.has(lookbookId)) {
            newImageCache.set(lookbookId, lookbookImagesCache.get(lookbookId)!);
          }
        }
      }));
      setEngagementCounts(counts);
      setFollowStatuses(newFollowStatuses);
      if (newImageCache.size > 0) {
        const outfitCache = new Map<string, string | null>();
        const lookbookCache = new Map<string, any>();
        
        for (const [id, value] of newImageCache) {
          // Check if it's a lookbook-related cache entry
          if (id.includes('_outfits') || id.includes('_outfit_')) {
            // Store all lookbook-related data
            lookbookCache.set(id, value);
          } else {
            // Determine if this is an outfit or lookbook based on feed items
            const item = feedItems.find(fi => {
              const entity = fi.entity?.outfit || fi.entity?.lookbook;
              return entity?.id === id;
            });
            
            if (item?.entity?.outfit) {
              outfitCache.set(id, value);
            } else if (item?.entity?.lookbook) {
              lookbookCache.set(id, value);
            }
          }
        }
        
        if (outfitCache.size > 0) {
          setOutfitImagesCache(prevCache => new Map([...prevCache, ...outfitCache]));
        }
        if (lookbookCache.size > 0) {
          setLookbookImagesCache(prevCache => new Map([...prevCache, ...lookbookCache]));
        }
      }
    }
    setLoading(false);
    setIsLoadingFeed(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    const currentlyLiked = engagementCounts[postId]?.hasLiked || false;

    if (currentlyLiked) {
      await unlikeEntity(user.id, 'post', postId);
    } else {
      await likeEntity(user.id, 'post', postId);
    }

    // Refresh counts
    const [likes, liked] = await Promise.all([
      getLikeCount('post', postId),
      hasLiked(user.id, 'post', postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        likes,
        hasLiked: liked,
      },
    }));
  };

  const handleSave = async (postId: string) => {
    if (!user) return;

    const currentlySaved = engagementCounts[postId]?.hasSaved || false;

    if (currentlySaved) {
      await unsaveEntity(user.id, 'post', postId);
    } else {
      await saveEntity(user.id, 'post', postId);
    }

    // Refresh counts
    const [saves, saved] = await Promise.all([
      getSaveCount('post', postId),
      hasSaved(user.id, 'post', postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        saves,
        hasSaved: saved,
      },
    }));
  };

  const handleRepost = async (postId: string) => {
    if (!user) return;

    const currentlyReposted = engagementCounts[postId]?.hasReposted || false;

    if (currentlyReposted) {
      await removeRepost(user.id, postId);
    } else {
      await createRepost(user.id, postId);
    }

    // Refresh counts
    const [reposts, reposted] = await Promise.all([
      getRepostCount(postId),
      hasReposted(user.id, postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        reposts,
        hasReposted: reposted,
      },
    }));

    // Refresh feed to show new repost
    await loadFeed();
  };

  const handleComment = async () => {
    if (!user || !selectedItem || !commentText.trim()) return;

    const post = selectedItem.type === 'post' ? selectedItem.post! : selectedItem.repost!.original_post!;
    if (!post) return;

    const { error, data: comment } = await createComment(user.id, 'post', post.id, commentText.trim());
    if (!error) {
      setCommentText('');
      // Refresh comments
      const { data: updatedComments } = await getComments('post', post.id);
      if (updatedComments) {
        setComments(updatedComments);
      }
      // Refresh counts
      const count = await getCommentCount('post', post.id);
      setEngagementCounts((prev) => ({
        ...prev,
        [post.id]: {
          ...prev[post.id],
          comments: count,
        },
      }));
    }
  };

  const openComments = async (item: FeedItem) => {
    setSelectedItem(item);
    const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
    if (post) {
      const { data: commentsData } = await getComments('post', post.id);
      if (commentsData) {
        setComments(commentsData);
      }
    }
    setShowComments(true);
  };

  const openSlideshow = async (lookbookId: string) => {
    if (!user) return;

    setSlideshowLoading(true);
    
    try {
      const { data } = await getLookbook(lookbookId);
      let outfitsToShow: any[] = [];
      
      if (data && data.outfits.length > 0) {
        // Get outfits from the lookbook owner (not current user!)
        const lookbookOwnerId = data.lookbook.owner_user_id;
        const { data: allOutfits } = await getUserOutfits(lookbookOwnerId);
        
        // DEBUG: Show what we got
        Alert.alert('Debug Info', 
          `Lookbook has ${data.outfits.length} outfit refs\n` +
          `Owner: ${lookbookOwnerId}\n` +
          `Got ${allOutfits?.length || 0} outfits from owner\n` +
          `Current user: ${user?.id}`
        );
        
        if (allOutfits) {
          const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
          outfitsToShow = data.outfits
            .map((lo: any) => outfitMap.get(lo.outfit_id))
            .filter(Boolean);
        }
      }

      if (outfitsToShow.length > 0) {
        // Pre-load all images BEFORE opening slideshow
        const imageMap = new Map<string, string | null>();
        const loadPromises = outfitsToShow.map(async (outfit) => {
          const url = await getOutfitCoverImageUrl(outfit);
          imageMap.set(outfit.id, url);
        });
        await Promise.all(loadPromises);
        
        // Now open the slideshow with images ready
        setSlideshowImages(imageMap);
        setSlideshowOutfits(outfitsToShow);
        setCurrentSlideIndex(0);
        setIsAutoPlaying(true);
        setSlideshowVisible(true);
      }
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

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    setOpenMenuPostId(null);
    setMenuButtonPosition(null);

    // Web fallback using window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
      
      if (!confirmed) return;
      
      const { error } = await deletePost(postId, user.id);
      
      if (error) {
        alert(`Failed to delete post: ${error.message || error}`);
      } else {
        // Remove post from local state
        setFeed(prevFeed => prevFeed.filter(item => {
          if (item.type === 'post') {
            return item.post?.id !== postId;
          }
          return true;
        }));
        alert('Post deleted successfully');
      }
      return;
    }

    // Native Alert for iOS/Android
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePost(postId, user.id);
            
            if (error) {
              Alert.alert('Error', `Failed to delete post: ${error.message || error}`);
            } else {
              // Remove post from local state
              setFeed(prevFeed => prevFeed.filter(item => {
                if (item.type === 'post') {
                  return item.post?.id !== postId;
                }
                return true;
              }));
              Alert.alert('Success', 'Post deleted successfully');
            }
          },
        },
      ]
    );
  };

  const handleEditOutfit = (outfitId: string) => {
    setOpenMenuPostId(null);
    setMenuButtonPosition(null);
    router.push(`/outfits/${outfitId}`);
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;
    
    setUnfollowingUserId(userId);
    setOpenMenuPostId(null);
    setMenuButtonPosition(null);
    
    try {
      const { error } = await unfollowUser(user.id, userId);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to unfollow user');
      } else {
        // Update follow status
        setFollowStatuses(prev => {
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
  };

  const handleTryOnOutfit = async (outfitId: string, referenceImageUrl: string | null) => {
    if (!user) {
      Alert.alert('Error', 'Unable to try on outfit');
      return;
    }

    setOpenMenuPostId(null);
    setMenuButtonPosition(null);
    setTryingOnOutfit(true);

    try {
      // Check if user has body shot
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('body_shot_image_id, headshot_image_id')
        .eq('user_id', user.id)
        .single();

      if (!userSettings?.body_shot_image_id || !userSettings?.headshot_image_id) {
        Alert.alert('Setup Required', 'Please upload a body photo and generate a headshot before trying on outfits.');
        setTryingOnOutfit(false);
        return;
      }

      // Get the original outfit and its items
      const { data: outfitData } = await getOutfit(outfitId);
      if (!outfitData?.outfit || !outfitData.items || outfitData.items.length === 0) {
        throw new Error('Outfit not found or has no items');
      }

      // Get categories to map category_id to category name (needed for AI job)
      const { data: categories } = await getWardrobeCategories();
      const categoriesMap = new Map(categories?.map(cat => [cat.id, cat.name]) || []);

      // Create outfit items array with the same wardrobe_item_id values
      // These items remain in the original user's wardrobe
      // Use category_id from original outfit items (they may be null, which is fine)
      const outfitItems = outfitData.items.map((item, index) => ({
        category_id: item.category_id,
        wardrobe_item_id: item.wardrobe_item_id,
        position: item.position ?? index,
      }));

      // CRITICAL FIX: Create the outfit FIRST so RLS policy applies
      // This allows us to access wardrobe items from other users via the
      // wardrobe_items_read_in_owned_outfits policy (migration 0034)
      const originalOutfitTitle = outfitData.outfit.title || 'Outfit';
      const { data: savedOutfit, error: saveError } = await saveOutfit(
        user.id,
        {
          title: `Try on: ${originalOutfitTitle}`,
          visibility: 'private',
        },
        outfitItems
      );

      if (saveError || !savedOutfit?.outfit?.id) {
        throw new Error(saveError?.message || 'Failed to save outfit');
      }

      const newOutfitId = savedOutfit.outfit.id;

      // NOW fetch wardrobe items - RLS policy now applies since outfit exists
      const wardrobeItemIds = outfitData.items.map(item => item.wardrobe_item_id);
      const { data: wardrobeItems, error: wardrobeError } = await getWardrobeItemsByIds(wardrobeItemIds);
      
      if (wardrobeError) {
        // Clean up the outfit we just created
        await supabase
          .from('outfits')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', newOutfitId);
        console.error('[Social] Error fetching wardrobe items:', wardrobeError);
        throw new Error('Failed to access outfit items. Please try again.');
      }
      
      if (!wardrobeItems || wardrobeItems.length === 0) {
        // Clean up the outfit we just created
        await supabase
          .from('outfits')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', newOutfitId);
        throw new Error('Could not access outfit items. The outfit may contain items from users you don\'t follow.');
      }
      
      // Check if we got all items (some might be missing due to RLS)
      if (wardrobeItems.length < wardrobeItemIds.length) {
        const missingCount = wardrobeItemIds.length - wardrobeItems.length;
        console.warn(`[Social] Only ${wardrobeItems.length} of ${wardrobeItemIds.length} wardrobe items accessible`);
        // Continue anyway - we'll use what we have, but log the issue
      }

      // Prepare selected items for the AI job (with category names)
      // IMPORTANT: Preserve the order from outfitData.items, not wardrobeItems
      // Create a map for quick lookup
      const wardrobeItemsMap = new Map(wardrobeItems.map(item => [item.id, item]));
      const selected = outfitData.items.map((outfitItem) => {
        const wardrobeItem = wardrobeItemsMap.get(outfitItem.wardrobe_item_id);
        // Handle items that may not have category_id yet (AI will recognize them)
        // Prefer category_id from wardrobe item, fallback to outfit item
        const categoryId = wardrobeItem?.category_id || outfitItem.category_id;
        return {
          category: categoryId ? (categoriesMap.get(categoryId) || '') : '',
          wardrobe_item_id: outfitItem.wardrobe_item_id,
        };
      });

      // Create outfit_render job
      const { data: renderJob, error: jobError } = await createAIJob(user.id, 'outfit_render', {
        user_id: user.id,
        outfit_id: newOutfitId,
        selected,
      });

      if (jobError || !renderJob) {
        throw new Error('Failed to start render job');
      }

      // Trigger the job execution
      const triggerResult = await triggerAIJobExecution(renderJob.id);
      if (triggerResult.error) {
        console.error('[Social] Job trigger returned error:', triggerResult.error);
        // Check if it's a configuration error (not just a timeout)
        if (triggerResult.error.message?.includes('URL') || triggerResult.error.message?.includes('configuration')) {
          // Clean up the outfit and job
          await supabase
            .from('outfits')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', newOutfitId);
          throw new Error('Failed to start outfit generation. Please check your network connection and try again.');
        }
        // For timeout errors, continue - job might still be triggered on server
        console.warn('[Social] Job trigger may have timed out, but job might still be processing');
      }

      // Set the generating outfit ID to show the overlay
      setGeneratingOutfitId(newOutfitId);
      
      // Poll for completion (120 attempts = ~10+ minutes)
      // Use await pattern like body shot generation for consistency
      try {
        const { data: finalJob, error: pollError } = await pollAIJobWithFinalCheck(
          renderJob.id,
          120,
          2000,
          '[Social]'
        );
        
        if (pollError || !finalJob) {
          // Job still running - let user know they can check later
          setGeneratingOutfitId(null);
          Alert.alert(
            'Generation In Progress',
            'The outfit is still generating. You can check your outfits page to see when it\'s ready.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Handle job completion
        if (finalJob.status === 'succeeded') {
          // Refresh outfit data before navigation to ensure cover image is loaded
          const { data: outfitData } = await getOutfit(newOutfitId);
          setGeneratingOutfitId(null);
          router.push(`/outfits/${newOutfitId}/view`);
        } else if (finalJob.status === 'failed') {
          setGeneratingOutfitId(null);
          Alert.alert('Generation Failed', finalJob.error || 'Outfit generation failed');
        }
      } catch (error: any) {
        console.error('[Social] Error polling outfit render:', error);
        setGeneratingOutfitId(null);
        Alert.alert(
          'Generation Error',
          'An error occurred while generating the outfit. You can check your outfits page to see if it completed.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error: any) {
      console.error('[Social] Error in handleTryOnOutfit:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to try on outfit';
      if (error.message) {
        if (error.message.includes('access outfit items') || error.message.includes("don't follow")) {
          errorMessage = 'Unable to access some items in this outfit. You may need to follow the outfit creator to try it on.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('URL') || error.message.includes('configuration')) {
          errorMessage = 'Configuration error. Please contact support if this persists.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
      setTryingOnOutfit(false);
      setGeneratingOutfitId(null);
    } finally {
      setTryingOnOutfit(false);
    }
  };


  const renderFeedItem = ({ item }: { item: FeedItem }) => {
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
    const isOwnPost = item.type === 'post' && post.owner_user_id === user?.id;

    return (
      <View style={styles.feedCard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {item.type === 'repost' && (
              <Text style={styles.repostLabel}>
                <TouchableOpacity onPress={() => item.owner?.id && router.push(`/users/${item.owner.id}`)}>
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
                  // Capture button position on layout
                  const { x, y, width, height } = event.nativeEvent.layout;
                  // Get absolute position
                  const buttonRef = menuButtonRefs.current.get(post.id);
                  if (buttonRef) {
                    buttonRef.measureInWindow((winX: number, winY: number, winWidth: number, winHeight: number) => {
                      menuButtonPositions.current.set(post.id, { x: winX, y: winY, width: winWidth, height: winHeight });
                    });
                  }
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  // Use cached position if available, otherwise measure
                  const cachedPosition = menuButtonPositions.current.get(post.id);
                  if (cachedPosition) {
                    setMenuButtonPosition(cachedPosition);
                    setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                  } else {
                    // Fallback: measure on press
                    const buttonRef = menuButtonRefs.current.get(post.id);
                    if (buttonRef) {
                      // Try measureInWindow first, fallback to measure if needed
                    try {
                      buttonRef.measureInWindow((x: number, y: number, width: number, height: number) => {
                        const position = { x, y, width, height };
                        menuButtonPositions.current.set(post.id, position);
                        setMenuButtonPosition(position);
                        setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                      });
                    } catch (error) {
                      // Fallback: use measure
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
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        {isOutfit && entity && (
          <TouchableOpacity
            onPress={() => router.push(`/outfits/${entity.id}/view`)}
          >
            <FeedOutfitCard
              outfit={entity}
              imageUrl={outfitImagesCache.get(entity.id) || null}
              isLoading={!outfitImagesCache.has(entity.id)}
            />
          </TouchableOpacity>
        )}
        {!isOutfit && entity && (
          <LookbookCarousel
            lookbook={entity}
            lookbookImagesCache={lookbookImagesCache}
            onPlayPress={() => openSlideshow(entity.id)}
            onLookbookPress={() => router.push(`/lookbooks/${entity.id}/view`)}
            isLoading={!lookbookImagesCache.has(`${entity.id}_outfits`)}
          />
        )}

        {/* Caption */}
        {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

        {/* Social Actions */}
        <View style={styles.socialActions}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(post.id)}
            >
              <Ionicons
                name={counts.hasLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={counts.hasLiked ? '#ff0000' : '#000'}
              />
              {counts.likes > 0 && <Text style={styles.actionCount}>{counts.likes}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openComments(item)}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#000" />
              {counts.comments > 0 && <Text style={styles.actionCount}>{counts.comments}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRepost(post.id)}
            >
              <Ionicons
                name={counts.hasReposted ? 'repeat' : 'repeat-outline'}
                size={28}
                color={counts.hasReposted ? '#00ba7c' : '#000'}
              />
              {counts.reposts > 0 && <Text style={styles.actionCount}>{counts.reposts}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSave(post.id)}
            >
              <Ionicons
                name={counts.hasSaved ? 'bookmark' : 'bookmark-outline'}
                size={26}
                color={counts.hasSaved ? '#007AFF' : '#000'}
              />
              {counts.saves > 0 && <Text style={styles.actionCount}>{counts.saves}</Text>}
            </TouchableOpacity>

            {/* Find Similar button for outfit posts */}
            {isOutfit && entity && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setFindSimilarEntityType('outfit');
                  setFindSimilarEntityId(entity.id);
                  // Get category from outfit items if available (for MVP, we'll leave it undefined)
                  setFindSimilarCategoryId(undefined);
                  setShowFindSimilar(true);
                }}
              >
                <Ionicons name="search-outline" size={26} color="#000" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && feed.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={feed}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        style={styles.feedListWrapper}
        contentContainerStyle={styles.feedList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share an outfit or lookbook!</Text>
          </View>
        }
      />

      {/* Post Menu Modal */}
      {openMenuPostId && (() => {
        const currentPost = feed.find(item => 
          (item.type === 'post' && item.post?.id === openMenuPostId) ||
          (item.type === 'repost' && item.repost?.original_post?.id === openMenuPostId)
        );
        if (!currentPost) return null;
        const post = currentPost.type === 'post' ? currentPost.post! : currentPost.repost!.original_post!;
        const isOutfit = post.entity_type === 'outfit';
        const entity = currentPost.entity?.outfit || currentPost.entity?.lookbook;
        const isOwnPost = currentPost.type === 'post' && post.owner_user_id === user?.id;
        
        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              setOpenMenuPostId(null);
              setMenuButtonPosition(null);
            }}
          >
            <TouchableOpacity
              style={styles.menuModalOverlay}
              activeOpacity={1}
              onPress={() => {
                setOpenMenuPostId(null);
                setMenuButtonPosition(null);
              }}
            >
              <View 
                style={[
                  styles.menuDropdownModal,
                  menuButtonPosition ? {
                    // Override default positioning when we have button position
                    position: 'absolute',
                    marginTop: 0,
                    marginRight: 0,
                    alignSelf: 'auto',
                    // Calculate position below button, aligned to right edge
                    top: (() => {
                      // More accurate height: padding (12*2) + icon/text content (~24) + border (1) = ~49px per item
                      const menuItemHeight = 50;
                      const ownerId = post.owner_user_id;
                      const isFollowingOwner = followStatuses.get(ownerId) || false;
                      let itemCount = isOwnPost 
                        ? (isOutfit && entity ? 2 : 1)
                        : (isOutfit && entity ? 1 : 0);
                      // Add unfollow option if following the owner
                      if (!isOwnPost && isFollowingOwner) {
                        itemCount += 1;
                      }
                      const dropdownHeight = itemCount * menuItemHeight;
                      const spacing = 8;
                      
                      // Position below button
                      let top = menuButtonPosition.y + menuButtonPosition.height + spacing;
                      
                      
                      // If dropdown would go off bottom, position above button
                      if (top + dropdownHeight > SCREEN_HEIGHT - 20) {
                        top = menuButtonPosition.y - dropdownHeight - spacing;
                      }
                      
                      // Ensure minimum top margin
                      if (top < 20) {
                        top = 20;
                      }
                      
                      return top;
                    })(),
                    // Align right edge of dropdown with right edge of button
                    right: (() => {
                      const dropdownWidth = 180;
                      // Button's right edge position
                      const buttonRight = menuButtonPosition.x + menuButtonPosition.width;
                      // Distance from screen right edge
                      let right = SCREEN_WIDTH - buttonRight;
                      
                      
                      // Ensure dropdown stays on screen
                      if (right < 16) {
                        right = 16;
                      } else if (right + dropdownWidth > SCREEN_WIDTH - 16) {
                        right = SCREEN_WIDTH - dropdownWidth - 16;
                      }
                      
                      return right;
                    })(),
                  } : {},
                ]}
              >
                {isOwnPost ? (
                  <>
                    {isOutfit && entity && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleEditOutfit(entity.id)}
                      >
                        <Ionicons name="pencil-outline" size={18} color="#000" />
                        <Text style={styles.menuItemText}>Edit Outfit</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.menuItem, styles.menuItemDanger]}
                      onPress={() => handleDeletePost(post.id)}
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
                        onPress={() => handleTryOnOutfit(
                          entity.id,
                          outfitImagesCache.get(entity.id) || null
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
                    {(() => {
                      const ownerId = post.owner_user_id;
                      const isFollowingOwner = followStatuses.get(ownerId) || false;
                      if (isFollowingOwner) {
                        return (
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => handleUnfollow(ownerId)}
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
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.commentsContainer}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.commentsList}>
            {comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>
                    {comment.user?.display_name || comment.user?.handle || 'User'}
                  </Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={styles.commentSendButton}
              onPress={handleComment}
              disabled={!commentText.trim()}
            >
              <Text style={styles.commentSendText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Find Similar Modal */}
      <FindSimilarModal
        visible={showFindSimilar}
        onClose={() => setShowFindSimilar(false)}
        entityType={findSimilarEntityType}
        entityId={findSimilarEntityId}
        categoryId={findSimilarCategoryId}
      />

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

      {/* Generating Outfit Overlay */}
      <Modal
        visible={generatingOutfitId !== null}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.generatingOverlay}>
          <View style={styles.generatingOverlayContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.generatingOverlayText}>Generating Outfit...</Text>
            <Text style={styles.generatingOverlaySubtext}>This may take 60-90 seconds</Text>
            <View style={styles.generatingOverlayButtons}>
              <TouchableOpacity
                style={styles.generatingOverlayButton}
                onPress={() => {
                  if (generatingOutfitId) {
                    const outfitId = generatingOutfitId;
                    // Clear any pending polling/timeouts and close dialog before navigating
                    setGeneratingOutfitId(null);
                    // Navigate - view page will detect active job and poll properly
                    router.push(`/outfits/${outfitId}/view`);
                  }
                }}
              >
                <Text style={styles.generatingOverlayButtonText}>See Outfit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generatingOverlayButton, styles.generatingOverlayButtonSecondary]}
                onPress={() => {
                  setGeneratingOutfitId(null);
                }}
              >
                <Text style={[styles.generatingOverlayButtonText, styles.generatingOverlayButtonTextSecondary]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
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

// Feed Outfit Card Component - Memoized with cached images
interface FeedOutfitCardProps {
  outfit: any;
  imageUrl: string | null;
  isLoading: boolean;
}

const FeedOutfitCard = React.memo(({ outfit, imageUrl, isLoading }: FeedOutfitCardProps) => {
  return (
    <View style={styles.outfitCard}>
      {isLoading ? (
        <View style={styles.outfitImagePlaceholder}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : imageUrl ? (
        <ExpoImage 
          source={{ uri: imageUrl }} 
          style={styles.outfitImage} 
          contentFit="cover"
        />
      ) : (
        <View style={styles.outfitImagePlaceholder}>
          <Text style={styles.outfitImagePlaceholderText}>No image</Text>
        </View>
      )}
      {outfit.title && <Text style={styles.outfitTitle}>{outfit.title}</Text>}
    </View>
  );
});

// Lookbook Carousel Component
interface LookbookCarouselProps {
  lookbook: any;
  lookbookImagesCache: Map<string, any>;
  onPlayPress: () => void;
  onLookbookPress: () => void;
  isLoading: boolean;
}

const LookbookCarousel = React.memo(({ lookbook, lookbookImagesCache, onPlayPress, onLookbookPress, isLoading }: LookbookCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const maxWidth = Math.min(screenWidth, 630);

  const outfits = lookbookImagesCache.get(`${lookbook.id}_outfits`) || [];
  
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / maxWidth);
    setCurrentIndex(index);
  };

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <TouchableOpacity onPress={onLookbookPress} activeOpacity={0.8}>
        <View style={styles.lookbookCard}>
          <View style={styles.lookbookImagePlaceholder}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
          <Text style={styles.lookbookTitle}>{lookbook.title}</Text>
          {lookbook.description && (
            <Text style={styles.lookbookDescription}>{lookbook.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Render fallback if no outfits
  if (outfits.length === 0) {
    // Fallback to single image
    return (
      <TouchableOpacity onPress={onLookbookPress} activeOpacity={0.8}>
        <View style={styles.lookbookCard}>
          {lookbookImagesCache.has(lookbook.id) && lookbookImagesCache.get(lookbook.id) ? (
            <ExpoImage
              source={{ uri: lookbookImagesCache.get(lookbook.id)! }}
              style={styles.lookbookImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.lookbookImagePlaceholder}>
              <Text style={styles.lookbookImagePlaceholderText}>📚</Text>
              <Text style={styles.lookbookImagePlaceholderSubtext}>Lookbook</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.lookbookPlayButton}
            onPress={(e) => {
              e.stopPropagation();
              onPlayPress();
            }}
          >
            <Text style={styles.lookbookPlayButtonText}>▶</Text>
          </TouchableOpacity>
          <Text style={styles.lookbookTitle}>{lookbook.title}</Text>
          {lookbook.description && (
            <Text style={styles.lookbookDescription}>{lookbook.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.lookbookCard}>
      <View style={styles.lookbookImageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.lookbookCarousel}
        >
        {outfits.map((outfit: any, index: number) => {
          const imageUrl = lookbookImagesCache.get(`${lookbook.id}_outfit_${outfit.id}`);
          return (
              <TouchableOpacity 
                key={outfit.id} 
                style={[styles.lookbookCarouselItem, { width: maxWidth }]}
                onPress={onLookbookPress}
                activeOpacity={0.9}
              >
                {imageUrl ? (
                  <ExpoImage
                    source={{ uri: imageUrl }}
                    style={styles.lookbookImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.lookbookImagePlaceholder}>
                    <ActivityIndicator size="small" color="#007AFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Pagination Dots */}
        {outfits.length > 1 && (
          <View style={styles.paginationDots}>
            {outfits.map((_: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.lookbookPlayButton}
          onPress={(e) => {
            e.stopPropagation();
            onPlayPress();
          }}
        >
          <Text style={styles.lookbookPlayButtonText}>▶</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tappable title/description area to navigate to lookbook */}
      <TouchableOpacity onPress={onLookbookPress} activeOpacity={0.7}>
        <Text style={styles.lookbookTitle}>{lookbook.title}</Text>
        {lookbook.description && (
          <Text style={styles.lookbookDescription}>{lookbook.description}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedListWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 630,
  },
  feedList: {
    paddingHorizontal: 0,
  },
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
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuDropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // Default positioning (used when menuButtonPosition is null)
    marginRight: 16,
    marginTop: Platform.OS === 'ios' ? 100 : 70,
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
  outfitCard: {
    marginBottom: 0,
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 0,
    backgroundColor: '#f0f0f0',
  },
  outfitImagePlaceholder: {
    width: '100%',
    height: 400,
    borderRadius: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitImagePlaceholderText: {
    color: '#999',
    fontSize: 14,
  },
  outfitTitle: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    color: '#000',
  },
  lookbookCard: {
    padding: 0,
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 0,
  },
  lookbookImageContainer: {
    position: 'relative',
    width: '100%',
  },
  lookbookImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 0,
    marginBottom: 0,
  },
  lookbookImagePlaceholder: {
    width: '100%',
    height: 400,
    borderRadius: 0,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  lookbookImagePlaceholderText: {
    fontSize: 64,
    marginBottom: 8,
  },
  lookbookImagePlaceholderSubtext: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  lookbookPlayButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lookbookPlayButtonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 2,
  },
  lookbookCarousel: {
    width: '100%',
  },
  lookbookCarouselItem: {
    width: '100%',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lookbookTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  lookbookDescription: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 12,
    paddingBottom: 8,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
  },
  noComments: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  commentSendButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  commentSendText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
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
  generatingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingOverlayContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  generatingOverlayText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#000',
  },
  generatingOverlaySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  generatingOverlayButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  generatingOverlayButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  generatingOverlayButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  generatingOverlayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  generatingOverlayButtonTextSecondary: {
    color: '#007AFF',
  },
});
