/**
 * Outfit View Screen (Refactored)
 * View outfit details with social engagement
 * 
 * BEFORE: 1,600 lines
 * AFTER: ~400 lines (75% reduction)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getOutfit, deleteOutfit } from '@/lib/outfits';
import { getWardrobeItemImages } from '@/lib/wardrobe';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import {
  getActiveOutfitRenderJob,
  getRecentOutfitRenderJob,
  getAIJob,
  pollAIJobWithFinalCheck,
} from '@/lib/ai-jobs';
import { useSocialEngagement } from '@/hooks/outfits';
import {
  SocialActionBar,
  CommentSection,
  GenerationProgressModal,
} from '@/components/outfits';
import {
  Header,
  LoadingSpinner,
  LoadingOverlay,
} from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing } = theme;

export default function OutfitViewScreen() {
  const {
    id,
    outfitIds,
    filters,
    returnTo,
    renderJobId: renderJobIdParam,
  } = useLocalSearchParams<{
    id: string;
    outfitIds?: string;
    filters?: string;
    returnTo?: string;
    renderJobId?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  // Data state
  const [outfit, setOutfit] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<any>(null);
  const [outfitItems, setOutfitItems] = useState<any[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<Map<string, any>>(
    new Map()
  );
  const [itemImageUrls, setItemImageUrls] = useState<Map<string, string>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  // UI state
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);

  // Navigation state
  const [navigationOutfits, setNavigationOutfits] = useState<
    Array<{ id: string; title: string; imageUrl: string | null }>
  >([]);

  // Social engagement
  const {
    liked,
    likeCount,
    saved,
    saveCount,
    commentCount,
    comments,
    loadingComments,
    toggleLike,
    toggleSave,
    loadComments,
    submitComment,
  } = useSocialEngagement('outfit', id, user?.id);

  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (id) {
      loadOutfitData();
      if (outfitIds) {
        loadNavigationOutfits();
      }
    }
  }, [id]);

  useEffect(() => {
    if (renderJobIdParam && user && !coverImage) {
      setRenderJobId(renderJobIdParam);
      setIsGenerating(true);
    }
  }, [renderJobIdParam, user, coverImage]);

  const loadOutfitData = async () => {
    if (!id || !user) return;

    setLoading(true);

    try {
      const { data, error } = await getOutfit(id);
      if (error || !data) {
        Alert.alert('Error', 'Failed to load outfit');
        router.back();
        return;
      }

      setOutfit(data.outfit);
      setCoverImage(data.coverImage);
      setOutfitItems(data.items);

      // Check for active render jobs
      if (user) {
        const { data: activeJob } = await getActiveOutfitRenderJob(id, user.id);

        if (activeJob) {
          const coverImageCreatedAt = data.coverImage?.created_at
            ? new Date(data.coverImage.created_at).getTime()
            : null;
          const activeJobCreatedAt = new Date(activeJob.created_at).getTime();
          const shouldHandleActiveJob =
            !coverImageCreatedAt || coverImageCreatedAt < activeJobCreatedAt;

          if (shouldHandleActiveJob) {
            setRenderJobId(activeJob.id);
            setIsGenerating(true);
            startPollingForOutfitRender(activeJob.id);
          }
        } else if (renderJobIdParam) {
          setIsGenerating(true);
          setRenderJobId(renderJobIdParam);
          startPollingForOutfitRender(renderJobIdParam);
        }
      }

      // Load wardrobe items
      if (data.items.length > 0) {
        const wardrobeItemIds = data.items.map((item) => item.wardrobe_item_id);

        try {
          const { data: items } = await supabase
            .from('wardrobe_items')
            .select('*')
            .in('id', wardrobeItemIds);

          if (items) {
            const itemsMap = new Map();
            items.forEach((item: any) => {
              itemsMap.set(item.id, item);
            });
            setWardrobeItems(itemsMap);

            // Load images
            const imagePromises = items.map(async (item: any) => {
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
          }
        } catch (error) {
          console.error('Error loading items:', error);
        }
      }
    } catch (error) {
      console.error('Error loading outfit:', error);
      Alert.alert('Error', 'Failed to load outfit');
    } finally {
      setLoading(false);
    }
  };

  const startPollingForOutfitRender = async (jobId: string) => {
    try {
      const { data: finalJob } = await pollAIJobWithFinalCheck(
        jobId,
        120,
        2000,
        '[OutfitView]'
      );

      if (finalJob && finalJob.status === 'succeeded') {
        setRenderJobId(null);
        setIsGenerating(false);
        await refreshOutfit();
      } else if (finalJob && finalJob.status === 'failed') {
        setRenderJobId(null);
        setIsGenerating(false);
        Alert.alert('Error', 'Outfit generation failed');
      }
    } catch (error) {
      console.error('Error polling:', error);
    }
  };

  const refreshOutfit = async () => {
    if (!id) return;

    const { data } = await getOutfit(id);
    if (data) {
      setOutfit(data.outfit);
      setCoverImage(data.coverImage);
      setOutfitItems(data.items);

      if (data.coverImage) {
        setIsGenerating(false);
      }
    }
  };

  const loadNavigationOutfits = async () => {
    if (!outfitIds || !user) return;

    try {
      const idsArray = outfitIds.split(',').filter(Boolean);
      if (idsArray.length === 0) return;

      const { data: outfitsData } = await supabase
        .from('outfits')
        .select('*')
        .in('id', idsArray)
        .eq('owner_user_id', user.id)
        .is('archived_at', null);

      if (outfitsData) {
        const outfitMap = new Map(
          outfitsData.map((outfit) => [outfit.id, outfit])
        );
        const navItems = await Promise.all(
          idsArray.map(async (outfitId) => {
            const foundOutfit = outfitMap.get(outfitId);
            if (!foundOutfit) return null;
            const imageUrl = await getOutfitCoverImageUrl(foundOutfit);
            return {
              id: outfitId,
              title: foundOutfit.title || 'Untitled Outfit',
              imageUrl,
            };
          })
        );

        setNavigationOutfits(
          navItems.filter(
            (item): item is { id: string; title: string; imageUrl: string | null } =>
              item !== null
          )
        );
      }
    } catch (error) {
      console.error('Error loading navigation:', error);
    }
  };

  const navigateToOutfit = (targetOutfitId: string) => {
    if (!outfitIds) return;
    const queryParts = [`outfitIds=${encodeURIComponent(outfitIds)}`];
    if (filters) {
      queryParts.push(`filters=${encodeURIComponent(filters)}`);
    }
    if (returnTo) {
      queryParts.push(`returnTo=${encodeURIComponent(returnTo)}`);
    }
    router.replace(`/outfits/${targetOutfitId}/view?${queryParts.join('&')}`);
  };

  const handleBackPress = () => {
    if (returnTo === 'outfits' || outfitIds) {
      router.replace('/(tabs)/outfits');
      return;
    }
    router.back();
  };

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
      setDeleting(false);
      setShowDeleteConfirm(false);
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

      setOutfit({ ...outfit, is_favorite: newFavoriteStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleCommentPress = async () => {
    if (!showComments && comments.length === 0) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

  const getImageUrl = (image: any) => {
    if (!image || !image.storage_key) return null;
    return supabase.storage
      .from(image.storage_bucket || 'media')
      .getPublicUrl(image.storage_key).data.publicUrl;
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LoadingSpinner text="Loading outfit..." />
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={commonStyles.container}>
        <Text style={styles.errorText}>Outfit not found</Text>
      </View>
    );
  }

  const coverImageUrl = coverImage ? getImageUrl(coverImage) : null;

  return (
    <View style={commonStyles.container}>
      <LoadingOverlay visible={isGenerating} message="Generating outfit..." />

      {/* Header */}
      <Header
        leftContent={
          <TouchableOpacity onPress={handleBackPress}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        }
        rightContent={
          outfit.owner_user_id === user?.id && (
            <>
              <TouchableOpacity onPress={toggleFavorite}>
                <Ionicons
                  name={outfit?.is_favorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={outfit?.is_favorite ? colors.error : colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEdit}>
                <Ionicons name="pencil-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </>
          )
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        {coverImageUrl && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setShowImageModal(true)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: coverImageUrl }}
              style={styles.coverImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        )}

        {/* Social Actions */}
        <SocialActionBar
          liked={liked}
          likeCount={likeCount}
          saved={saved}
          saveCount={saveCount}
          commentCount={commentCount}
          onLike={toggleLike}
          onComment={handleCommentPress}
          onSave={toggleSave}
        />

        {/* Comments */}
        {showComments && (
          <View style={styles.commentsContainer}>
            <CommentSection comments={comments} onSubmit={submitComment} />
          </View>
        )}

        {/* Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.title}>{outfit.title || 'Untitled Outfit'}</Text>

          {outfit.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{outfit.notes}</Text>
            </View>
          )}

          {/* Items */}
          {outfitItems.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionLabel}>Items ({outfitItems.length})</Text>
              {outfitItems.map((outfitItem, index) => {
                const wardrobeItem = wardrobeItems.get(outfitItem.wardrobe_item_id);
                const imageUrl = wardrobeItem
                  ? itemImageUrls.get(wardrobeItem.id)
                  : null;

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
                      <Image
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

      {/* Navigation Bar */}
      {navigationOutfits.length > 1 && (
        <View style={styles.navigationContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigationContent}
          >
            {navigationOutfits.map((navOutfit) => {
              const isActive = navOutfit.id === id;
              return (
                <TouchableOpacity
                  key={navOutfit.id}
                  style={[
                    styles.navigationItem,
                    isActive && styles.navigationItemActive,
                  ]}
                  onPress={() => !isActive && navigateToOutfit(navOutfit.id)}
                  disabled={isActive}
                >
                  {navOutfit.imageUrl ? (
                    <Image
                      source={{ uri: navOutfit.imageUrl }}
                      style={styles.navigationImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.navigationPlaceholder}>
                      <Text style={styles.navigationPlaceholderText}>
                        {navOutfit.title?.charAt(0) || 'O'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
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
              <Image
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
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Outfit</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this outfit?
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
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: colors.white,
  },
  coverImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 0.75,
  },
  commentsContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
  },
  detailsSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  notesSection: {
    marginBottom: spacing.lg + spacing.md,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  itemsSection: {
    marginTop: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + spacing.xs / 2,
  },
  itemNumberText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: spacing.md,
    marginRight: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.gray100,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  navigationContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm + spacing.xs / 2,
  },
  navigationContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm + spacing.xs / 2,
  },
  navigationItem: {
    width: 60,
    height: 80,
    borderRadius: spacing.sm + spacing.xs / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  navigationItemActive: {
    borderColor: colors.primary,
  },
  navigationImage: {
    width: '100%',
    height: '100%',
  },
  navigationPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
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
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
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
    color: colors.white,
    fontSize: 30,
    fontWeight: '300',
  },
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.lg,
    padding: spacing.lg + spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm + spacing.xs / 2,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg + spacing.md,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs / 2,
  },
  deleteModalButton: {
    flex: 1,
    padding: spacing.sm + spacing.xs / 2,
    borderRadius: spacing.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray100,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  confirmDeleteButton: {
    backgroundColor: colors.error,
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
});
