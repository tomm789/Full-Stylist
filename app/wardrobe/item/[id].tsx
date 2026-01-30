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
import { continueTimeline, isPerfLogsEnabled } from '@/lib/perf/timeline';
import { logWardrobeAddTiming } from '@/lib/perf/wardrobeAddTiming';
import {
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared/modals';

export default function ItemDetailScreen() {
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
  } = useWardrobeItemDetail({
    itemId: id,
    userId: user?.id,
  });
  
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRightButtons}>
          {isOwnItem && (
            <TouchableOpacity
              onPress={actions.toggleFavorite}
              style={styles.headerButton}
            >
              <Ionicons
                name={item?.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item?.is_favorite ? '#ff0000' : '#000'}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

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
            <DropdownMenuItem
              label="Delete"
              icon="trash-outline"
              onPress={() => {
                closeMenu();
                actions.handleDelete();
              }}
              danger
            />
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
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
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
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
  headerButton: {
    padding: 8,
  },
  deleteButton: {
    // No special background, icon color indicates delete
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
  },
  detailsContent: {
    padding: 20,
    backgroundColor: '#fff',
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  itemBrand: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  fastPathImageContainer: {
    aspectRatio: 1,
    backgroundColor: '#000',
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
    color: '#fff',
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
    backgroundColor: '#e0e0e0',
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
    backgroundColor: '#fff3f3',
    borderRadius: 8,
  },
  generationErrorText: {
    color: '#c00',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    alignSelf: 'center',
  },
});
