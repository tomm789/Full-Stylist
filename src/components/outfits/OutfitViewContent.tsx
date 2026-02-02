/**
 * OutfitViewContent Component
 * Main content display for outfit view
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import SocialActionBar from '@/components/outfits/SocialActionBar';
import CommentSection from '@/components/outfits/CommentSection';
import { AIGenerationFeedback } from '@/components/ai';
import { supabase } from '@/lib/supabase';
import { continueTimeline } from '@/lib/perf/timeline';

const IMAGE_RETRY_DELAYS = [500, 1000, 2000];
const MAX_IMAGE_RETRIES = 3;

interface OutfitViewContentProps {
  outfit: any;
  coverImage: any | null;
  /** When set, use this data URI for instant render (from job.result.base64_result); bypasses fetch from storage */
  coverImageDataUri?: string | null;
  outfitItems: any[];
  wardrobeItems: Map<string, any>;
  itemImageUrls: Map<string, string>;
  liked: boolean;
  likeCount: number;
  saved: boolean;
  saveCount: number;
  commentCount: number;
  comments: any[];
  showComments: boolean;
  showImageModal: boolean;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onSubmitComment: (text: string) => Promise<boolean>;
  onImageModalClose: () => void;
  onImagePress: () => void;
  /** When set, timeline logs image load events and bounded retry on error (freshly generated). */
  renderTraceId?: string;
  /** When set, client-only log: time from job succeeded to image_load_end. */
  jobSucceededAt?: number | null;
  /** Called when cover image has loaded (e.g. to trigger deferred engagement fetch in PERF_MODE). Fired at most once per coverImageUrl. */
  onCoverImageLoad?: () => void;
  /** Called when cover image errors after MAX retries (fallback to trigger deferred engagement). Fired at most once. */
  onCoverImageErrorAfterRetries?: () => void;
  /** When true, show feedback UI over cover (full overlay or compact thumbs in corner). */
  showFeedbackOverlay?: boolean;
  /** When true, show only thumbs in bottom-right (feedback already given). */
  feedbackCompact?: boolean;
  /** Job id for the generation (for submit_ai_feedback). */
  feedbackJobId?: string | null;
  /** Job type for the generation (e.g. outfit_render). */
  feedbackJobType?: string;
  /** Called when user submits feedback (parent can switch to compact state). */
  onFeedbackSubmitted?: (jobId: string) => void;
}

export function OutfitViewContent({
  outfit,
  coverImage,
  coverImageDataUri,
  outfitItems,
  wardrobeItems,
  itemImageUrls,
  liked,
  likeCount,
  saved,
  saveCount,
  commentCount,
  comments,
  showComments,
  showImageModal,
  onLike,
  onSave,
  onComment,
  onSubmitComment,
  onImageModalClose,
  onImagePress,
  renderTraceId,
  jobSucceededAt,
  onCoverImageLoad,
  onCoverImageErrorAfterRetries,
  showFeedbackOverlay,
  feedbackCompact,
  feedbackJobId,
  feedbackJobType = 'outfit_render',
  onFeedbackSubmitted,
}: OutfitViewContentProps) {
  const router = useRouter();
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const imageRetryCountRef = useRef(0);
  const didFireCoverLoadRef = useRef(false);
  const didFireErrorFallbackRef = useRef(false);

  const getImageUrl = (image: any) => {
    if (!image || !image.storage_key) return null;
    return supabase.storage
      .from(image.storage_bucket || 'media')
      .getPublicUrl(image.storage_key).data.publicUrl;
  };

  // Prefer instant base64 from job result; storage URL is secondary
  const uriType: 'dataUri' | 'storageUrl' = coverImageDataUri ? 'dataUri' : 'storageUrl';
  let coverImageUrl: string | null = coverImageDataUri ?? (coverImage ? getImageUrl(coverImage) : null);
  // Cache-bust storage URL for newly generated renders so we don't show stale/placeholder
  if (coverImageUrl && !coverImageDataUri && renderTraceId) {
    const sep = coverImageUrl.includes('?') ? '&' : '?';
    coverImageUrl = `${coverImageUrl}${sep}v=${renderTraceId}&t=${Date.now()}`;
  }

  const timeline = renderTraceId ? continueTimeline(renderTraceId) : null;

  // Reset "fired" refs when cover URL changes so a new image can trigger callbacks once
  useEffect(() => {
    didFireCoverLoadRef.current = false;
    didFireErrorFallbackRef.current = false;
  }, [coverImageUrl]);

  const handleImageLoadStart = useCallback(() => {
    const ts = Date.now();
    const msSinceJobSucceeded = jobSucceededAt != null && typeof jobSucceededAt === 'number'
      ? Math.round(ts - jobSucceededAt)
      : undefined;
    timeline?.mark('image_load_start', { uriType, msSinceJobSucceeded });
    console.debug('[outfit_render_timing] image_load_start_at', { ts, uriType, msSinceJobSucceeded });
  }, [timeline, uriType, jobSucceededAt]);

  const handleImageLoad = useCallback(() => {
    const ts = Date.now();
    const msSinceJobSucceeded = jobSucceededAt != null && typeof jobSucceededAt === 'number'
      ? Math.round(ts - jobSucceededAt)
      : undefined;
    timeline?.mark('image_load_end', { uriType, msSinceJobSucceeded });
    console.debug('[outfit_render_timing] image_load_end_at', { ts, uriType, msSinceJobSucceeded });
    if (!onCoverImageLoad) return;
    if (didFireCoverLoadRef.current) return;
    didFireCoverLoadRef.current = true;
    onCoverImageLoad();
  }, [timeline, uriType, jobSucceededAt, onCoverImageLoad]);

  const handleImageError = useCallback(() => {
    const retryCount = imageRetryCountRef.current;
    const delay = IMAGE_RETRY_DELAYS[retryCount] ?? 2000;
    timeline?.mark('image_load_error', { uriType, retryCount, delay });
    console.debug('[outfit_render_timing] image_load_error', { uriType, retryCount, delay });
    if (retryCount >= MAX_IMAGE_RETRIES) {
      if (onCoverImageErrorAfterRetries && !didFireErrorFallbackRef.current) {
        didFireErrorFallbackRef.current = true;
        onCoverImageErrorAfterRetries();
      }
      return;
    }
    if (!renderTraceId) return;
    imageRetryCountRef.current = retryCount + 1;
    setTimeout(() => {
      setImageRetryKey((k) => k + 1);
    }, delay);
  }, [timeline, uriType, renderTraceId, onCoverImageErrorAfterRetries]);

  return (
    <>
      {/* Cover Image */}
      {coverImageUrl && (
        <View style={styles.imageContainer}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onImagePress}
            activeOpacity={0.9}
          >
            <Image
              key={imageRetryKey}
              source={{ uri: coverImageUrl }}
              style={styles.coverImage}
              contentFit="contain"
              cachePolicy={renderTraceId && !coverImageDataUri ? 'none' : undefined}
              onLoadStart={handleImageLoadStart}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </TouchableOpacity>
          {showFeedbackOverlay && feedbackJobId && (
            <AIGenerationFeedback
              jobId={feedbackJobId}
              jobType={feedbackJobType}
              onClose={(id) => id != null && onFeedbackSubmitted?.(id)}
              compact={feedbackCompact}
            />
          )}
        </View>
      )}

      {/* Social Actions */}
      <SocialActionBar
        liked={liked}
        likeCount={likeCount}
        saved={saved}
        saveCount={saveCount}
        commentCount={commentCount}
        onLike={onLike}
        onComment={onComment}
        onSave={onSave}
      />

      {/* Comments */}
      {showComments && (
        <View style={styles.commentsContainer}>
          <CommentSection comments={comments} onSubmit={onSubmitComment} />
        </View>
      )}

      {/* Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.title}>
          {outfit.title || 'Untitled Outfit'}
        </Text>

        {outfit.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notesText}>{outfit.notes}</Text>
          </View>
        )}

        {/* Items */}
        {outfitItems.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionLabel}>
              Items ({outfitItems.length})
            </Text>
            {outfitItems.map((outfitItem, index) => {
              const wardrobeItem = wardrobeItems.get(
                outfitItem.wardrobe_item_id
              );
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

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={onImageModalClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={onImageModalClose}
          >
            {coverImageUrl && (
              <Image
                source={{ uri: coverImageUrl }}
                style={styles.fullscreenImage}
                contentFit="contain"
                cachePolicy={renderTraceId && !coverImageDataUri ? 'none' : undefined}
                onLoadStart={handleImageLoadStart}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onImageModalClose}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  commentsContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  detailsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  notesSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  itemNumber: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
