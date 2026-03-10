/**
 * Wardrobe Item Detail Screen (Refactored)
 * View and manage a single wardrobe item
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWardrobeItemDetail,
  useWardrobeItemNavigation,
  useWardrobeItemDetailActions,
} from '@/hooks/wardrobe';
import {
  ItemImageCarousel,
  ItemAttributes,
  ItemNavigation,
  ItemActions,
} from '@/components/wardrobe';
import { AIGenerationFeedback } from '@/components/ai';
import { continueTimeline, isPerfLogsEnabled } from '@/lib/perf/timeline';
import { logWardrobeAddTiming } from '@/lib/perf/wardrobeAddTiming';
import {
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared/modals';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { LoadingSpinner } from '@/components/shared';
import { createCommonStyles } from '@/styles/commonStyles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/screens/wardrobe-item-detail.styles';
import { useFirstPostIntro } from '@/hooks/social/useFirstPostIntro';
import { FirstPostVisibilityModal } from '@/components/shared/modals/FirstPostVisibilityModal';
import { getUserSettings } from '@/lib/settings';
import { publishWardrobeItem, archiveWardrobeItem } from '@/lib/wardrobe';
import { showSuccessToast, showErrorToast } from '@/utils/toast';

export default function ItemDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const { id, itemIds, readOnly, traceId: traceIdParam, draft: draftParam } = useLocalSearchParams<{
    id: string;
    itemIds?: string;
    readOnly?: string;
    traceId?: string;
    refresh?: string;
    draft?: string;
  }>();
  const timeline = traceIdParam && isPerfLogsEnabled() ? continueTimeline(traceIdParam) : null;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isReadOnly = readOnly === 'true';

  // Data loading with polling
  const {
    item,
    category,
    displayImages,
    activeImageId,
    attributes,
    tags,
    loading,
    isGeneratingProductShot,
    isGeneratingDetails,
    generationFailed,
    retryGeneration,
    initialImageDataUri,
    initialTitle,
    initialDescription,
    jobSucceededAt,
    lastSucceededJobId,
    lastSucceededJobFeedbackAt,
    lastSucceededJobType,
  } = useWardrobeItemDetail({
    itemId: id,
    userId: user?.id,
  });

  // Draft state: item was just created and hasn't been published yet
  const [isDraft, setIsDraft] = useState(draftParam === 'true');
  const [isPublishing, setIsPublishing] = useState(false);

  // First-post intro modal for wardrobe
  const firstPostIntro = useFirstPostIntro();

  const handleDraftSave = useCallback(async () => {
    if (!user?.id || !id || isPublishing) return;
    setIsPublishing(true);
    try {
      const result = await publishWardrobeItem(user.id, id);
      if (result.error) {
        showErrorToast('Failed to publish item');
        return;
      }
      setIsDraft(false);
      showSuccessToast('Item saved to your feed');
      if (result.isFirstPost) {
        const { getPostForEntity } = await import('@/lib/posts');
        const { data: post } = await getPostForEntity(user.id, 'wardrobe', user.id);
        if (post) {
          firstPostIntro.triggerIntroIfNeeded('wardrobe', post.id);
        }
      }
    } finally {
      setIsPublishing(false);
    }
  }, [user?.id, id, isPublishing, firstPostIntro]);

  const handleDraftDiscard = useCallback(async () => {
    if (!user?.id || !id) return;
    const { error } = await archiveWardrobeItem(id, user.id);
    if (error) {
      showErrorToast('Failed to discard item');
      return;
    }
    router.back();
  }, [user?.id, id, router]);

  // On mount: detect orphaned drafts (no post exists) or check first-post intro
  useEffect(() => {
    if (!user?.id || !item || item.owner_user_id !== user.id) return;
    (async () => {
      const { getPostForEntity } = await import('@/lib/posts');
      const { data: post } = await getPostForEntity(user.id, 'wardrobe', user.id);

      // Orphaned draft: item exists but was never published (no post, not archived)
      if (!post && !item.archived_at && !isDraft) {
        setIsDraft(true);
        return;
      }

      // Already in draft mode — skip intro check
      if (isDraft) return;

      // Check first-post intro
      const { data: settings } = await getUserSettings(user.id);
      if (settings?.has_seen_visibility_intro_wardrobe) return;
      if (post) {
        firstPostIntro.triggerIntroIfNeeded('wardrobe', post.id);
      }
    })();
  }, [isDraft, user?.id, item?.id, firstPostIntro]);

  const [feedbackSubmittedForJobId, setFeedbackSubmittedForJobId] = useState<string | null>(null);
  const showFeedbackOverlay = !!(initialImageDataUri && lastSucceededJobId);
  const feedbackGiven =
    !!lastSucceededJobFeedbackAt || feedbackSubmittedForJobId === lastSucceededJobId;
  
  // Fast-path image rendering state
  const [showCarousel, setShowCarousel] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const didFireImageLoadRef = useRef(false);
  const didFireErrorFallbackRef = useRef(false);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fallback timeout: mount carousel after 4s if image never loads
  const DEFERRED_CAROUSEL_FALLBACK_MS = 4000;

  useEffect(() => {
    logWardrobeAddTiming('first_render_item_screen', { itemId: id });
  }, [id]);
  
  useEffect(() => {
    // Reset refs when initialImageDataUri changes
    didFireImageLoadRef.current = false;
    didFireErrorFallbackRef.current = false;
    setImageLoadError(false);
    
    // If no fast-path image, show carousel immediately
    if (!initialImageDataUri) {
      setShowCarousel(true);
      return;
    }
    
    // Set fallback timeout to mount carousel if image never loads
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!didFireImageLoadRef.current && !showCarousel) {
                if (__DEV__) {
          console.debug('[wardrobe_item_render_timing] carousel_mounted_fallback_timeout', {
            itemId: id,
            msSinceMount: DEFERRED_CAROUSEL_FALLBACK_MS,
          });
        }
        setShowCarousel(true);
      }
    }, DEFERRED_CAROUSEL_FALLBACK_MS);
    
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [initialImageDataUri, id]);
  
  const handleFastPathImageLoadStart = useCallback(() => {
    if (isPerfLogsEnabled()) timeline?.mark('image_load_start');
    const imageLoadStartAt = Date.now();
    const msSinceJobSucceeded = jobSucceededAt != null && typeof jobSucceededAt === 'number'
      ? Math.round(imageLoadStartAt - jobSucceededAt)
      : undefined;
    if (isPerfLogsEnabled()) {
            if (__DEV__) {
        console.debug('[wardrobe_item_render_timing] image_load_start_at', {
          ts: imageLoadStartAt,
          itemId: id,
          uriType: 'dataUri',
          msSinceJobSucceeded,
        });
      }
    }
  }, [id, jobSucceededAt, timeline]);
  
  const handleFastPathImageLoad = useCallback(() => {
    if (didFireImageLoadRef.current) return;
    didFireImageLoadRef.current = true;
    if (isPerfLogsEnabled()) timeline?.mark('image_load_end');
    const imageLoadEndAt = Date.now();
    const msSinceJobSucceeded = jobSucceededAt != null && typeof jobSucceededAt === 'number'
      ? Math.round(imageLoadEndAt - jobSucceededAt)
      : undefined;
    if (isPerfLogsEnabled()) {
            if (__DEV__) {
        console.debug('[wardrobe_item_render_timing] image_load_end_at', {
          ts: imageLoadEndAt,
          itemId: id,
          uriType: 'dataUri',
          msSinceJobSucceeded,
        });
      }
    }
    setShowCarousel(true);
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, [id, jobSucceededAt, timeline]);
  
  const handleFastPathImageError = useCallback(() => {
    if (didFireErrorFallbackRef.current) return;
    didFireErrorFallbackRef.current = true;
    if (isPerfLogsEnabled()) timeline?.mark('image_load_error');
    if (isPerfLogsEnabled()) {
            if (__DEV__) {
        console.debug('[wardrobe_item_render_timing] image_load_error', { itemId: id, uriType: 'dataUri' });
      }
    }
    setImageLoadError(true);
    setShowCarousel(true);
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, [id, timeline]);

  // Navigation
  const {
    navigationItems,
    currentItemIndex,
    navigationScrollRef,
    currentScreenWidth,
  } = useWardrobeItemNavigation({
    itemIds,
    currentItemId: id,
    userId: user?.id,
  });

  // Actions
  const actions = useWardrobeItemDetailActions({
    item,
    itemId: id,
    itemIds,
    isReadOnly,
  });

  // When active image changes (e.g. generation finished), show index 0 (active is first in ordered list)
  useEffect(() => {
    actions.setCurrentImageIndex(0);
  }, [activeImageId]);

  const isOwnItem = item && user && item.owner_user_id === user.id && !isReadOnly;
  const [showMenu, setShowMenu] = useState(false);

  const closeMenu = () => setShowMenu(false);

  if (loading || authLoading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner size="large" text="Loading item..." />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {isDraft ? (
        <Header
          variant="overlay"
          leftContent={
            <TouchableOpacity
              style={styles.draftButton}
              onPress={handleDraftDiscard}
              accessibilityLabel="Discard item"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
              <Text style={[styles.draftButtonText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          }
          rightContent={
            <TouchableOpacity
              style={[styles.draftButton, styles.draftSaveButton, { backgroundColor: colors.textPrimary }]}
              onPress={handleDraftSave}
              disabled={isPublishing || isGeneratingDetails}
              accessibilityLabel="Save item"
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.background} />
                  <Text style={[styles.draftButtonText, { color: colors.background, fontWeight: '600' }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          }
        />
      ) : (
        <Header
          variant="overlay"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
          rightContent={
            <View style={styles.headerRightButtons}>
              {isOwnItem && (
                <HeaderIconButton
                  icon={item?.is_favorite ? 'heart' : 'heart-outline'}
                  color={item?.is_favorite ? colors.favorite : colors.textPrimary}
                  onPress={actions.toggleFavorite}
                  accessibilityLabel="Toggle favorite"
                />
              )}
              <HeaderIconButton
                icon="ellipsis-vertical"
                onPress={() => setShowMenu(true)}
                accessibilityLabel="Open menu"
              />
            </View>
          }
        />
      )}

      <DropdownMenuModal
        visible={showMenu}
        onClose={closeMenu}
        topOffset={100}
        align="right"
      >
        {isOwnItem && (
          <>
            <DropdownMenuItem
              label="Edit"
              icon="pencil-outline"
              onPress={() => {
                closeMenu();
                actions.handleEdit();
              }}
            />
            <View style={dropdownMenuStyles.menuDivider} />
            {item?.archived_at ? (
              <DropdownMenuItem
                label="Restore"
                icon="refresh-outline"
                onPress={() => {
                  closeMenu();
                  setTimeout(() => actions.handleRestore(), 50);
                }}
              />
            ) : (
              <DropdownMenuItem
                label="Archive"
                icon="archive-outline"
                onPress={() => {
                  closeMenu();
                  setTimeout(() => actions.handleDelete(), 50);
                }}
                danger
              />
            )}
            <View style={dropdownMenuStyles.menuDivider} />
          </>
        )}
        <DropdownMenuItem
          label="Share"
          icon="share-outline"
          onPress={() => {
            closeMenu();
            actions.handleShare();
          }}
        />
      </DropdownMenuModal>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Fast-path image (single ExpoImage) or carousel */}
        {initialImageDataUri && !showCarousel ? (
          <View style={[styles.fastPathImageContainer, { width: currentScreenWidth }]}>
            <Image
              source={{ uri: initialImageDataUri }}
              style={[styles.fastPathImage, isGeneratingDetails && styles.fastPathImageDimmed]}
              contentFit="contain"
              onLoadStart={handleFastPathImageLoadStart}
              onLoad={handleFastPathImageLoad}
              onError={handleFastPathImageError}
            />
            {isGeneratingDetails && (
              <View style={styles.generatingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.generatingOverlayText}>Generating details…</Text>
              </View>
            )}
            {imageLoadError && (
              <View style={styles.imageErrorContainer}>
                <Text style={styles.imageErrorText}>Failed to load image</Text>
              </View>
            )}
            {showFeedbackOverlay && lastSucceededJobId && lastSucceededJobType && (
              <AIGenerationFeedback
                jobId={lastSucceededJobId}
                jobType={lastSucceededJobType}
                onClose={(id) => id != null && setFeedbackSubmittedForJobId(id)}
                compact={feedbackGiven}
              />
            )}
          </View>
        ) : showCarousel ? (
          <View style={styles.carouselWrapper}>
            <ItemImageCarousel
              key={activeImageId ?? 'carousel'}
              images={displayImages}
              currentScreenWidth={currentScreenWidth}
              onImageIndexChange={actions.setCurrentImageIndex}
              currentImageIndex={actions.currentImageIndex}
            />
            {showFeedbackOverlay &&
              lastSucceededJobId &&
              lastSucceededJobType &&
              actions.currentImageIndex === 0 && (
                <AIGenerationFeedback
                  jobId={lastSucceededJobId}
                  jobType={lastSucceededJobType}
                  onClose={(id) => id != null && setFeedbackSubmittedForJobId(id)}
                  compact={feedbackGiven}
                />
              )}
            {isGeneratingDetails && (
              <View style={[styles.generatingOverlay, { width: currentScreenWidth }]} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.generatingOverlayText}>Generating details…</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { width: currentScreenWidth }]}>
            <ActivityIndicator size="large" color="#666" />
          </View>
        )}

        {/* Item Details */}
        <View style={styles.detailsContent}>
          {isGeneratingDetails && !initialTitle && (!item?.title || item.title === 'New Item') ? (
            <View style={styles.titleSkeleton}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
            </View>
          ) : (
            <Text style={styles.itemTitle}>
              {initialTitle || (item?.title && item.title !== 'New Item' ? item.title : '') || 'Untitled'}
            </Text>
          )}

          {generationFailed && (
            <View style={styles.generationErrorBox}>
              <Text style={styles.generationErrorText}>Details couldn&apos;t be generated.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryGeneration}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}

          {category && (
            <Text style={styles.itemCategory}>{category.name}</Text>
          )}

          {isGeneratingDetails && !initialDescription && !item?.description ? (
            <View style={styles.descriptionSkeleton}>
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
            </View>
          ) : (initialDescription || item?.description) ? (
            <Text style={styles.itemDescription}>
              {initialDescription || item.description}
            </Text>
          ) : null}

          {/* Attributes and Tags */}
          <ItemAttributes attributes={attributes} tags={tags} item={item} />

          {/* Action Buttons */}
          <ItemActions
            isReadOnly={isReadOnly}
            isOwnItem={isOwnItem || false}
            isSaved={actions.isSaved}
            isSaving={actions.isSaving}
            onSave={actions.handleSaveItem}
            onAddToOutfit={actions.handleAddToOutfit}
          />
        </View>
      </ScrollView>

      {/* Item Navigation */}
      <ItemNavigation
        items={navigationItems}
        currentItemId={id}
        scrollRef={navigationScrollRef}
        onNavigate={actions.handleNavigateToItem}
      />

      {/* First-post visibility intro */}
      {firstPostIntro.introEntityType && (
        <FirstPostVisibilityModal
          visible={firstPostIntro.showIntro}
          entityType={firstPostIntro.introEntityType}
          currentVisibility={firstPostIntro.currentVisibility}
          defaultVisibility={firstPostIntro.defaultVisibility}
          onDone={firstPostIntro.handleIntroDone}
        />
      )}
    </View>
  );
}

