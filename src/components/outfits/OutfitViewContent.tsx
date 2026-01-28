/**
 * OutfitViewContent Component
 * Main content display for outfit view
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SocialActionBar, CommentSection } from '@/components/outfits';
import { supabase } from '@/lib/supabase';

interface OutfitViewContentProps {
  outfit: any;
  coverImage: any | null;
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
  onSubmitComment: (text: string) => Promise<void>;
  onImageModalClose: () => void;
  onImagePress: () => void;
}

export function OutfitViewContent({
  outfit,
  coverImage,
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
}: OutfitViewContentProps) {
  const router = useRouter();

  const getImageUrl = (image: any) => {
    if (!image || !image.storage_key) return null;
    return supabase.storage
      .from(image.storage_bucket || 'media')
      .getPublicUrl(image.storage_key).data.publicUrl;
  };

  const coverImageUrl = coverImage ? getImageUrl(coverImage) : null;

  return (
    <>
      {/* Cover Image */}
      {coverImageUrl && (
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={onImagePress}
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
