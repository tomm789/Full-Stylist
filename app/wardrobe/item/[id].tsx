/**
 * Wardrobe Item Detail Screen (Refactored)
 * View and manage a single wardrobe item
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import type { ThemeColors } from '@/styles/themes';

export default function ItemDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const commonStyles = createCommonStyles(colors);
  const { id, itemIds, readOnly, traceId: traceIdParam } = useLocalSearchParams<{
    id: string;
    itemIds?: string;
    readOnly?: string;
    traceId?: string;
    refresh?: string;
  }>();
  const timeline = traceIdParam && isPerfLogsEnabled() ? continueTimeline(traceIdParam) : null;
  const router = useRouter();
  const { user } = useAuth();
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
        console.debug('[wardrobe_item_render_timing] carousel_mounted_fallback_timeout', {
          itemId: id,
          msSinceMount: DEFERRED_CAROUSEL_FALLBACK_MS,
        });
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
      console.debug('[wardrobe_item_render_timing] image_load_start_at', {
        ts: imageLoadStartAt,
        itemId: id,
        uriType: 'dataUri',
        msSinceJobSucceeded,
      });
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
      console.debug('[wardrobe_item_render_timing] image_load_end_at', {
        ts: imageLoadEndAt,
        itemId: id,
        uriType: 'dataUri',
        msSinceJobSucceeded,
      });
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
      console.debug('[wardrobe_item_render_timing] image_load_error', { itemId: id, uriType: 'dataUri' });
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

  if (loading) {
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
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Image viewer always dark
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    // No special background, icon color indicates delete
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
  },
  detailsContent: {
    padding: 20,
    backgroundColor: colors.background,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  itemBrand: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 16,
    color: colors.gray800,
    marginBottom: 20,
    lineHeight: 24,
  },
  emptyText: {
    color: '#fff', // On dark image viewer background
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  fastPathImageContainer: {
    aspectRatio: 1,
    backgroundColor: '#000', // Image viewer always dark
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  fastPathImage: {
    width: '100%',
    height: '100%',
  },
  fastPathImageDimmed: {
    opacity: 0.7,
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingOverlayText: {
    color: '#fff', // Overlay text always white on dark overlay
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  carouselWrapper: {
    position: 'relative',
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  descriptionSkeleton: {
    marginBottom: 20,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonLineShort: {
    width: '60%',
  },
  generationErrorBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.error + '10',
    borderRadius: 8,
  },
  generationErrorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff', // Button text always white on primary bg
    fontSize: 14,
    fontWeight: '600',
  },
  imageErrorContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageErrorText: {
    color: '#fff', // Overlay text always white
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Image placeholder always dark
    alignSelf: 'center',
  },
});
