import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getOutfit, deleteOutfit, getUserOutfits } from '@/lib/outfits';
import { getWardrobeItems, getWardrobeItemImages } from '@/lib/wardrobe';
import { getLookbook, getSystemLookbookOutfits } from '@/lib/lookbooks';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { getActiveOutfitRenderJob, getRecentOutfitRenderJob, getAIJob, pollAIJob } from '@/lib/ai-jobs';
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
const IS_TABLET = SCREEN_WIDTH >= 768;

export default function OutfitDetailScreen() {
  const { id, lookbookId, lookbookTitle, outfitIndex } = useLocalSearchParams<{ 
    id: string; 
    lookbookId?: string; 
    lookbookTitle?: string;
    outfitIndex?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const [outfit, setOutfit] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<any>(null);
  const [outfitItems, setOutfitItems] = useState<any[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<Map<string, any>>(new Map());
  const [itemImageUrls, setItemImageUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Lookbook slideshow state
  const [lookbookOutfits, setLookbookOutfits] = useState<any[]>([]);
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
  const [isGeneratingOutfitRender, setIsGeneratingOutfitRender] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadOutfitData();
      loadSocialEngagement();
    }
    
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Clear loading state on unmount to prevent stale state
      setIsGeneratingOutfitRender(false);
    };
  }, [id]);

  const loadSocialEngagement = async () => {
    if (!id || !user) return;

    try {
      const [likedRes, likeCountRes, savedRes, saveCountRes, commentCountRes] = await Promise.all([
        hasLiked(user.id, 'outfit', id),
        getLikeCount('outfit', id),
        hasSaved(user.id, 'outfit', id),
        getSaveCount('outfit', id),
        getCommentCount('outfit', id),
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

  useEffect(() => {
    if (lookbookId && user) {
      loadLookbookOutfits();
    }
  }, [lookbookId, user]);

  const loadOutfitData = async () => {
    if (!id || !user) return;

    setLoading(true);

    try {
      // Load outfit data
      const { data, error } = await getOutfit(id);
      if (error || !data) {
        Alert.alert('Error', 'Failed to load outfit');
        router.back();
        return;
      }

      setOutfit(data.outfit);
      setCoverImage(data.coverImage);
      setOutfitItems(data.items);
      
      // Always check for active render jobs, even if cover image exists
      // This handles the case where user is generating a new render for an existing outfit
      
      if (user) {
        // Check for active outfit render job first (regardless of cover image)
        const { data: activeJob } = await getActiveOutfitRenderJob(id, user.id);
        
        if (activeJob) {
          // Active job found - check if job is very old (more than 15 minutes) - might be stuck
          const jobAge = Date.now() - new Date(activeJob.created_at).getTime();
          if (jobAge > 900000) { // 15 minutes
            // Job is very old - check one more time to see if it actually completed
            const { data: currentJob } = await getAIJob(activeJob.id);
            if (currentJob && (currentJob.status === 'succeeded' || currentJob.status === 'failed')) {
              // Job actually completed - refresh and don't show loading
              if (currentJob.status === 'succeeded') {
                await refreshOutfit();
              }
              setIsGeneratingOutfitRender(false);
            } else if (currentJob && currentJob.status === 'running') {
              // Job is still running but very old - likely stuck, don't show loading
              // User can manually trigger a new render if needed
              setIsGeneratingOutfitRender(false);
              console.log('[OutfitView] Active job is very old and still running, may be stuck');
            } else {
              // Job status unclear - show loading and poll
              setIsGeneratingOutfitRender(true);
              startPollingForOutfitRender(activeJob.id).catch((error) => {
                console.error('[OutfitView] Error starting polling:', error);
                setIsGeneratingOutfitRender(false);
              });
            }
          } else {
            // Job is recent - show loading and start polling
            setIsGeneratingOutfitRender(true);
            startPollingForOutfitRender(activeJob.id).catch((error) => {
              console.error('[OutfitView] Error starting polling:', error);
              setIsGeneratingOutfitRender(false);
            });
          }
        } else {
          // Check for recently completed job (within last 60 seconds)
          const { data: recentJob } = await getRecentOutfitRenderJob(id, user.id);
          
          if (recentJob && recentJob.status === 'succeeded') {
            // Job just completed - refresh outfit immediately
            await refreshOutfit();
          } else if (recentJob && recentJob.status === 'failed') {
            // Job failed - don't show loading
            setIsGeneratingOutfitRender(false);
          } else if (!data.coverImage) {
            // No active or recent job and no cover image - start periodic refresh check
            setIsGeneratingOutfitRender(true);
            startPeriodicOutfitRefresh();
          } else {
            // Cover image exists and no active job - don't show loading
            setIsGeneratingOutfitRender(false);
          }
        }
      }

      // Load wardrobe items for outfit items
      if (data.items.length > 0) {
        const wardrobeItemIds = data.items.map(item => item.wardrobe_item_id);
        
        try {
          // Try to load wardrobe items with a timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          const queryPromise = supabase
            .from('wardrobe_items')
            .select('*')
            .in('id', wardrobeItemIds);
          
          const { data: items, error: itemsError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]) as any;
          
          if (items && !itemsError) {
            const itemsMap = new Map();
            items.forEach((item) => {
              itemsMap.set(item.id, item);
            });
            setWardrobeItems(itemsMap);
            
            // Load images for wardrobe items
            const imagePromises = items.map(async (item) => {
              const { data: imageData } = await getWardrobeItemImages(item.id);
              if (imageData && imageData.length > 0) {
                const imageRecord = imageData[0].image;
                if (imageRecord) {
                  const { data: urlData } = supabase.storage
                    .from(imageRecord.storage_bucket || 'media')
                    .getPublicUrl(imageRecord.storage_key);
                  return { itemId: item.id, url: urlData.publicUrl };
                }
              }
              return { itemId: item.id, url: null };
            });
            
            const imageResults = await Promise.all(imagePromises);
            const newImageUrls = new Map<string, string>();
            imageResults.forEach(({ itemId, url }) => {
              if (url) {
                newImageUrls.set(itemId, url);
              }
            });
            
            setItemImageUrls(newImageUrls);
          } else {
            // If query fails/times out, create placeholder items
            console.log('Wardrobe items query failed, using placeholders');
            const itemsMap = new Map();
            wardrobeItemIds.forEach((id, index) => {
              itemsMap.set(id, {
                id,
                title: 'Loading...',
                category_id: data.items[index]?.category_id,
                owner_user_id: data.outfit.owner_user_id,
              });
            });
            setWardrobeItems(itemsMap);
          }
        } catch (error) {
          console.log('Wardrobe items query timed out, using placeholders');
          // Create placeholder items so the outfit at least displays
          const itemsMap = new Map();
          wardrobeItemIds.forEach((id, index) => {
            itemsMap.set(id, {
              id,
              title: 'Item unavailable',
              category_id: data.items[index]?.category_id,
              owner_user_id: data.outfit.owner_user_id,
            });
          });
          setWardrobeItems(itemsMap);
        }
      }
    } catch (error) {
      console.error('Error loading outfit:', error);
      Alert.alert('Error', 'Failed to load outfit');
    } finally {
      setLoading(false);
    }
  };

  const refreshOutfit = async () => {
    if (!id) return;

    const { data, error } = await getOutfit(id);
    if (!error && data) {
      setOutfit(data.outfit);
      setCoverImage(data.coverImage);
      setOutfitItems(data.items);
      
      // If cover image now exists, stop loading indicator and clear polling
      if (data.coverImage) {
        setIsGeneratingOutfitRender(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }
  };

  const startPeriodicOutfitRefresh = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Check for outfit render every 10 seconds (less frequent than active polling)
    pollingIntervalRef.current = setInterval(async () => {
      if (!id) return;
      const { data, error } = await getOutfit(id);
      if (!error && data && data.coverImage) {
        // Cover image exists - stop polling and clear loading state
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsGeneratingOutfitRender(false);
        setOutfit(data.outfit);
        setCoverImage(data.coverImage);
        setOutfitItems(data.items);
      }
    }, 3000); // Check every 3 seconds

    // Stop after 180 seconds (60 attempts)
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsGeneratingOutfitRender(false);
      }
    }, 10000); // Check every 10 seconds
  };

  const startPollingForOutfitRender = async (jobId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Use await pollAIJob pattern like body shot generation for consistency
    // This provides better timeout handling and final check
    try {
      const { pollAIJob } = await import('@/lib/ai-jobs');
      const { data: completedJob, error: pollError } = await pollAIJob(jobId, 120, 2000);
      
      // If polling timed out, do one final check - job might have completed
      let finalJob = completedJob;
      if (pollError || !completedJob) {
        console.log('[OutfitView] Outfit render polling timed out, doing final check...');
        const { data: finalCheck } = await getAIJob(jobId);
        if (finalCheck && (finalCheck.status === 'succeeded' || finalCheck.status === 'failed')) {
          finalJob = finalCheck;
        } else {
          // Job still running after timeout - switch to periodic refresh
          setIsGeneratingOutfitRender(false);
          startPeriodicOutfitRefresh();
          return;
        }
      }
      
      // Handle job completion
      if (finalJob.status === 'succeeded') {
        setIsGeneratingOutfitRender(false);
        await refreshOutfit();
        // Double-check that cover image exists
        const { data: refreshedData } = await getOutfit(id);
        if (refreshedData?.coverImage) {
          setIsGeneratingOutfitRender(false);
        }
      } else if (finalJob.status === 'failed') {
        setIsGeneratingOutfitRender(false);
        console.log('[OutfitView] Outfit render job failed:', finalJob.error);
      }
    } catch (error) {
      console.error('[OutfitView] Error polling for outfit render:', error);
      setIsGeneratingOutfitRender(false);
      // Switch to periodic refresh on error
      startPeriodicOutfitRefresh();
    }
  };

  const loadLookbookOutfits = async () => {
    if (!lookbookId || !user) return;

    try {
      // Check if this is a virtual system lookbook
      if (lookbookId.startsWith('system-')) {
        const systemType = lookbookId.replace('system-', '') as 'all' | 'favorites' | 'recent' | 'top';
        const systemTypeMap = {
          all: 'system_all',
          favorites: 'system_favorites',
          recent: 'system_recent',
          top: 'system_top',
        } as const;

        // Load system outfits
        const { data: systemOutfitsResult } = await getSystemLookbookOutfits(
          user.id,
          systemTypeMap[systemType]
        );
        
        if (systemOutfitsResult) {
          const { data: allOutfits } = await getUserOutfits(user.id);
          if (allOutfits) {
            const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
            const outfitsWithData = systemOutfitsResult
              .map((so) => outfitMap.get(so.outfit_id))
              .filter(Boolean);
            setLookbookOutfits(outfitsWithData);
          }
        }
      } else {
        // Regular database lookbook
        const { data } = await getLookbook(lookbookId);
        if (data && data.outfits.length > 0) {
          const { data: allOutfits } = await getUserOutfits(user.id);
          if (allOutfits) {
            const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
            const outfitsWithData = data.outfits
              .map((lo: any) => outfitMap.get(lo.outfit_id))
              .filter(Boolean);
            setLookbookOutfits(outfitsWithData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading lookbook outfits:', error);
    }
  };

  const openSlideshow = async () => {
    if (lookbookOutfits.length === 0) return;

    setSlideshowLoading(true);
    
    try {
      // Pre-load all images BEFORE opening slideshow
      const imageMap = new Map<string, string | null>();
      const loadPromises = lookbookOutfits.map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        imageMap.set(outfit.id, url);
      });
      await Promise.all(loadPromises);
      
      // Now open the slideshow with images ready, starting at the current outfit's index
      setSlideshowImages(imageMap);
      setSlideshowOutfits(lookbookOutfits);
      setCurrentSlideIndex(outfitIndex ? parseInt(outfitIndex, 10) : 0);
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

  const nextSlide = () => {
    if (currentSlideIndex < slideshowOutfits.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setCurrentSlideIndex(0); // Loop back to start
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else {
      setCurrentSlideIndex(slideshowOutfits.length - 1); // Loop to end
    }
  };

  const handleManualNavigation = (direction: 'next' | 'prev') => {
    // Pause auto-play when user manually navigates
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

  const handleLike = async () => {
    if (!user || !id) return;

    if (liked) {
      await unlikeEntity(user.id, 'outfit', id);
      setLiked(false);
      setLikeCount(Math.max(0, likeCount - 1));
    } else {
      await likeEntity(user.id, 'outfit', id);
      setLiked(true);
      setLikeCount(likeCount + 1);
    }
  };

  const handleSave = async () => {
    if (!user || !id) return;

    if (saved) {
      await unsaveEntity(user.id, 'outfit', id);
      setSaved(false);
      setSaveCount(Math.max(0, saveCount - 1));
    } else {
      await saveEntity(user.id, 'outfit', id);
      setSaved(true);
      setSaveCount(saveCount + 1);
    }
  };

  const handleCommentPress = async () => {
    if (!showComments && comments.length === 0) {
      // Load comments when opening for the first time
      const { data } = await getComments('outfit', id!);
      if (data) {
        setComments(data);
      }
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!user || !id || !commentText.trim()) return;

    setSubmittingComment(true);
    const { data, error } = await createComment(user.id, 'outfit', id, commentText.trim());
    
    if (!error && data) {
      setComments([data, ...comments]);
      setCommentCount(commentCount + 1);
      setCommentText('');
    }
    
    setSubmittingComment(false);
  };

  // Auto-play effect
  useEffect(() => {
    if (slideshowVisible && isAutoPlaying && slideshowOutfits.length > 0) {
      const interval = setInterval(() => {
        nextSlide();
      }, 4000); // 4 seconds per slide
      setAutoPlayInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
  }, [slideshowVisible, isAutoPlaying, currentSlideIndex, slideshowOutfits.length]);

  const handleEdit = () => {
    router.push(`/outfits/${id}`);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!user || !outfit) return;

    setDeleting(true);
    const { error } = await deleteOutfit(user.id, outfit.id);

    if (error) {
      Alert.alert('Error', 'Failed to delete outfit');
      setDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      // Reset states and navigate back immediately
      setDeleting(false);
      setShowDeleteConfirm(false);
      
      // Navigate back immediately - the absence of the outfit is confirmation enough
      router.back();
    }
  };

  const toggleFavorite = async () => {
    if (!id || !user || !outfit) return;

    try {
      const newFavoriteStatus = !outfit.is_favorite;
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', id)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      // Update local state
      setOutfit({ ...outfit, is_favorite: newFavoriteStatus });
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const getImageUrl = (image: any) => {
    if (!image || !image.storage_key) return null;
    const storageBucket = image.storage_bucket || 'media';
    return supabase.storage.from(storageBucket).getPublicUrl(image.storage_key).data.publicUrl;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Outfit not found</Text>
      </View>
    );
  }

  const coverImageUrl = coverImage ? getImageUrl(coverImage) : null;

  return (
    <View style={styles.container}>
      {/* Full-screen loading modal when outfit render is being generated */}
      {isGeneratingOutfitRender && (
        <Modal
          transparent={false}
          visible={isGeneratingOutfitRender}
          animationType="fade"
        >
          <View style={styles.fullScreenOverlay}>
            <View style={styles.loadingDialog}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingDialogTitle}>Generating Outfit</Text>
              <Text style={styles.loadingDialogMessage}>
                Creating a professional outfit visualization...
              </Text>
              <Text style={styles.loadingDialogSubtext}>
                This may take 60-90 seconds. You can cancel and check back later - the outfit will update automatically when ready.
              </Text>
              <TouchableOpacity
                style={styles.cancelRenderButton}
                onPress={() => {
                  setIsGeneratingOutfitRender(false);
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  // Switch to periodic refresh so outfit will update when job completes
                  startPeriodicOutfitRefresh();
                }}
              >
                <Text style={styles.cancelRenderButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {outfit.owner_user_id === user?.id && (
            <>
              <TouchableOpacity onPress={toggleFavorite} style={styles.headerButton}>
                <Ionicons
                  name={outfit?.is_favorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={outfit?.is_favorite ? '#ff0000' : '#000'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                <Ionicons name="pencil-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[styles.headerButton, styles.deleteButton]}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        {coverImageUrl && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setShowImageModal(true)}
            activeOpacity={0.9}
          >
            <ExpoImage
              source={{ uri: coverImageUrl }}
              style={styles.coverImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        )}

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

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.title}>{outfit.title || 'Untitled Outfit'}</Text>
          
          {outfit.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{outfit.notes}</Text>
            </View>
          )}

          {/* Items in Outfit */}
          {outfitItems.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionLabel}>Items ({outfitItems.length})</Text>
              {outfitItems.map((outfitItem, index) => {
                const wardrobeItem = wardrobeItems.get(outfitItem.wardrobe_item_id);
                const imageUrl = wardrobeItem ? itemImageUrls.get(wardrobeItem.id) : null;
                
                return (
                  <TouchableOpacity
                    key={outfitItem.id}
                    style={styles.itemCard}
                    onPress={() => {
                      if (wardrobeItem) {
                        router.push(`/wardrobe/item/${wardrobeItem.id}`);
                      }
                    }}
                  >
                    {imageUrl ? (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.itemNumber}>
                        <Text style={styles.itemNumberText}>{index + 1}</Text>
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>
                        {wardrobeItem?.title || 'Unknown Item'}
                      </Text>
                      {wardrobeItem?.description && (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {wardrobeItem.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImageModal(false)}
          >
            {coverImageUrl && (
              <ExpoImage
                source={{ uri: coverImageUrl }}
                style={styles.fullscreenImage}
                contentFit="contain"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Outfit</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this outfit? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        {outfit.description && (
          <Text style={styles.slideDescription}>{outfit.description}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingDialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingDialogMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingDialogSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  cancelRenderButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  cancelRenderButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  deleteButton: {
    // No special background, icon color will indicate delete action
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    maxWidth: IS_TABLET ? 600 : SCREEN_WIDTH,
    alignSelf: IS_TABLET ? 'center' : 'stretch',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    maxWidth: '100%',
    height: undefined,
    aspectRatio: 0.75, // 3:4 portrait ratio - let height calculate naturally
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 20,
    minHeight: SCREEN_HEIGHT * 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  notesSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (4/3), // Maintain 3:4 aspect ratio, fill width
    maxHeight: SCREEN_HEIGHT,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
  },
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff3b30',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
