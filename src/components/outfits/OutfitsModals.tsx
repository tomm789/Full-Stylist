/**
 * OutfitsModals Component
 * Composes all modals used in Outfits screen.
 */

import React from 'react';
import { ActivityIndicator, Modal, Text, View, StyleSheet } from 'react-native';
import { SortModal } from '@/components/outfits';
import type { SortOption, SortOrder } from '@/hooks/outfits';
import { CommentsModal, GeneratingOutfitModal, PostMenuModal } from '@/components/social';
import { SlideshowModal } from '@/components/lookbooks';
import LookbookPickerModal from '@/components/lookbooks/LookbookPickerModal';
import { colors, typography, spacing, borderRadius } from '@/styles';

type OutfitsModalsProps = {
  showSortModal: boolean;
  onCloseSortModal: () => void;
  sortBy: SortOption;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortOption) => void;
  onOrderToggle: () => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  showGridOutfits: boolean;
  showGridLookbooks: boolean;
  onToggleGridOutfits: () => void;
  onToggleGridLookbooks: () => void;
  occasionOptions: string[];
  selectedOccasions: string[];
  onToggleOccasion: (occasion: string) => void;
  onClearOccasions: () => void;
  onResetFilters: () => void;

  postMenuVisible: boolean;
  feedItem: any | null;
  currentUserId: string | undefined;
  isFollowingOwner: boolean;
  menuButtonPosition: { x: number; y: number; width: number; height: number } | null;
  tryingOnOutfit: boolean;
  unfollowingUserId: string | null;
  onClosePostMenu: () => void;
  onEditOutfit: (outfitId: string) => void;
  onDeletePost: (postId: string) => void;
  onArchiveOutfit?: (outfitId: string) => void;
  onTryOnOutfit: (outfitId: string) => void;
  onUnfollow: (userId: string) => void;
  getImageUrl: (outfitId: string) => string | null;

  commentsVisible: boolean;
  onCloseComments: () => void;
  commentsPostId: string | null;
  userId: string | undefined;
  comments: any[];
  onCommentsUpdate: (comments: any[]) => void;
  onCommentCountUpdate: (count: number) => void;

  slideshowLoading: boolean;
  slideshowVisible: boolean;
  slideshowOutfits: any[];
  slideshowImages: Map<string, string | null>;
  currentSlideIndex: number;
  isAutoPlaying: boolean;
  onCloseSlideshow: () => void;
  onNextSlideshow: () => void;
  onPrevSlideshow: () => void;
  onToggleAutoPlay: () => void;

  generatingOutfitId: string | null;
  onViewOutfit: (outfitId: string) => void;

  lookbookPickerVisible: boolean;
  onCloseLookbookPicker: () => void;
  lookbookTitle: string;
  onChangeLookbookTitle: (value: string) => void;
  lookbookDescription: string;
  onChangeLookbookDescription: (value: string) => void;
  lookbookVisibility: 'public' | 'followers' | 'private_link';
  onChangeLookbookVisibility: (value: 'public' | 'followers' | 'private_link') => void;
  lookbookSaving: boolean;
  selectedOutfitCount: number;
  onCreateLookbook: () => Promise<void> | void;
  userLookbooks: any[];
  loadingLookbooks: boolean;
  selectedLookbookId: string | null;
  onSelectLookbook: (id: string) => void;
  onAddToExistingLookbook: () => Promise<void> | void;
};

export default function OutfitsModals({
  showSortModal,
  onCloseSortModal,
  sortBy,
  sortOrder,
  onSortChange,
  onOrderToggle,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  showGridOutfits,
  showGridLookbooks,
  onToggleGridOutfits,
  onToggleGridLookbooks,
  occasionOptions,
  selectedOccasions,
  onToggleOccasion,
  onClearOccasions,
  onResetFilters,

  postMenuVisible,
  feedItem,
  currentUserId,
  isFollowingOwner,
  menuButtonPosition,
  tryingOnOutfit,
  unfollowingUserId,
  onClosePostMenu,
  onEditOutfit,
  onDeletePost,
  onArchiveOutfit,
  onTryOnOutfit,
  onUnfollow,
  getImageUrl,

  commentsVisible,
  onCloseComments,
  commentsPostId,
  userId,
  comments,
  onCommentsUpdate,
  onCommentCountUpdate,

  slideshowLoading,
  slideshowVisible,
  slideshowOutfits,
  slideshowImages,
  currentSlideIndex,
  isAutoPlaying,
  onCloseSlideshow,
  onNextSlideshow,
  onPrevSlideshow,
  onToggleAutoPlay,

  generatingOutfitId,
  onViewOutfit,

  lookbookPickerVisible,
  onCloseLookbookPicker,
  lookbookTitle,
  onChangeLookbookTitle,
  lookbookDescription,
  onChangeLookbookDescription,
  lookbookVisibility,
  onChangeLookbookVisibility,
  lookbookSaving,
  selectedOutfitCount,
  onCreateLookbook,
  userLookbooks,
  loadingLookbooks,
  selectedLookbookId,
  onSelectLookbook,
  onAddToExistingLookbook,
}: OutfitsModalsProps) {
  return (
    <>
      <SortModal
        visible={showSortModal}
        onClose={onCloseSortModal}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        onOrderToggle={onOrderToggle}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={onToggleFavoritesOnly}
        showGridOutfits={showGridOutfits}
        showGridLookbooks={showGridLookbooks}
        onToggleGridOutfits={onToggleGridOutfits}
        onToggleGridLookbooks={onToggleGridLookbooks}
        occasionOptions={occasionOptions}
        selectedOccasions={selectedOccasions}
        onToggleOccasion={onToggleOccasion}
        onClearOccasions={onClearOccasions}
        onResetFilters={onResetFilters}
      />

      <PostMenuModal
        visible={postMenuVisible}
        feedItem={feedItem}
        currentUserId={currentUserId}
        isFollowingOwner={isFollowingOwner}
        buttonPosition={menuButtonPosition}
        tryingOnOutfit={tryingOnOutfit}
        unfollowingUserId={unfollowingUserId}
        onClose={onClosePostMenu}
        onEditOutfit={onEditOutfit}
        onDeletePost={onDeletePost}
        onArchiveOutfit={onArchiveOutfit}
        onTryOnOutfit={onTryOnOutfit}
        onUnfollow={onUnfollow}
        getImageUrl={getImageUrl}
      />

      <CommentsModal
        visible={commentsVisible}
        onClose={onCloseComments}
        postId={commentsPostId}
        userId={userId}
        comments={comments}
        onCommentsUpdate={onCommentsUpdate}
        onCountUpdate={onCommentCountUpdate}
      />

      <Modal visible={slideshowLoading} transparent animationType="fade">
        <View style={styles.loadingModalContainer}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color={colors.textLight} />
            <Text style={styles.loadingModalText}>Loading slideshow...</Text>
          </View>
        </View>
      </Modal>

      <SlideshowModal
        visible={slideshowVisible}
        outfits={slideshowOutfits}
        images={slideshowImages}
        currentIndex={currentSlideIndex}
        isAutoPlaying={isAutoPlaying}
        onClose={onCloseSlideshow}
        onNext={onNextSlideshow}
        onPrevious={onPrevSlideshow}
        onToggleAutoPlay={onToggleAutoPlay}
      />

      <GeneratingOutfitModal
        visible={generatingOutfitId !== null}
        outfitId={generatingOutfitId}
        onViewOutfit={onViewOutfit}
        onDismiss={() => {}}
      />

      <LookbookPickerModal
        visible={lookbookPickerVisible}
        onClose={onCloseLookbookPicker}
        lookbookTitle={lookbookTitle}
        onChangeTitle={onChangeLookbookTitle}
        lookbookDescription={lookbookDescription}
        onChangeDescription={onChangeLookbookDescription}
        lookbookVisibility={lookbookVisibility}
        onChangeVisibility={onChangeLookbookVisibility}
        lookbookSaving={lookbookSaving}
        selectedOutfitCount={selectedOutfitCount}
        onCreate={onCreateLookbook}
        userLookbooks={userLookbooks}
        loadingLookbooks={loadingLookbooks}
        selectedLookbookId={selectedLookbookId}
        onSelectLookbook={onSelectLookbook}
        onAddToExisting={onAddToExistingLookbook}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    padding: spacing.xxxl,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  loadingModalText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    marginTop: spacing.lg,
  },
});
