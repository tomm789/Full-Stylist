import React from 'react';
import OutfitsModals from './OutfitsModals';
import type { FeedItem } from '@/lib/posts';
import type { SortOption, SortOrder } from '@/hooks/outfits';

export type OutfitsModalsContainerProps = {
  sortState: {
    showSortModal: boolean;
    setShowSortModal: (show: boolean) => void;
    filters: { sortBy: SortOption; sortOrder: SortOrder; showFavoritesOnly: boolean };
    updateFilter: (key: string, value: any) => void;
    showGridOutfits: boolean;
    setShowGridOutfits: React.Dispatch<React.SetStateAction<boolean>>;
    showGridLookbooks: boolean;
    setShowGridLookbooks: React.Dispatch<React.SetStateAction<boolean>>;
    availableOccasions: string[];
    selectedOccasions: string[];
    toggleOccasion: (occasion: string) => void;
    setSelectedOccasions: (occasions: string[]) => void;
  };
  postMenuState: {
    visible: boolean;
    feedItem: FeedItem | null;
    currentUserId?: string;
    isFollowingOwner: boolean;
    menuButtonPosition: { x: number; y: number; width: number; height: number } | null;
    tryingOnOutfit: boolean;
    unfollowingUserId: string | null;
    onClose: () => void;
    onEditOutfit: (outfitId: string) => void;
    onArchiveOutfit: (outfitId: string) => void;
    onDeletePost: (postId: string) => void;
    onTryOnOutfit: (outfitId: string, referenceImageUrl?: string | null) => void;
    onUnfollow: (userId: string) => void;
    getImageUrl: (outfitId: string) => string | null;
  };
  commentsState: {
    visible: boolean;
    onClose: () => void;
    postId: string | null;
    userId?: string;
    comments: any[];
    onCommentsUpdate: (comments: any[]) => void;
    onCommentCountUpdate: (count: number) => void;
  };
  slideshowState: {
    loading: boolean;
    visible: boolean;
    outfits: any[];
    images: Map<string, string | null>;
    currentIndex: number;
    isAutoPlaying: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    onToggleAutoPlay: () => void;
  };
  generationState: {
    generatingOutfitId: string | null;
    onViewOutfit: (outfitId: string) => void;
  };
  lookbookState: {
    pickerVisible: boolean;
    onClosePicker: () => void;
    title: string;
    onChangeTitle: (title: string) => void;
    description: string;
    onChangeDescription: (description: string) => void;
    visibility: 'public' | 'followers' | 'private_link';
    onChangeVisibility: (visibility: 'public' | 'followers' | 'private_link') => void;
    saving: boolean;
    selectedOutfitCount: number;
    onCreateLookbook: () => Promise<void>;
    userLookbooks: any[];
    loadingLookbooks: boolean;
    selectedLookbookId: string | null;
    onSelectLookbook: (id: string | null) => void;
    onAddToExistingLookbook: () => Promise<void>;
  };
};

export default function OutfitsModalsContainer({
  sortState,
  postMenuState,
  commentsState,
  slideshowState,
  generationState,
  lookbookState,
}: OutfitsModalsContainerProps) {
  return (
    <OutfitsModals
      showSortModal={sortState.showSortModal}
      onCloseSortModal={() => sortState.setShowSortModal(false)}
      sortBy={sortState.filters.sortBy}
      sortOrder={sortState.filters.sortOrder}
      onSortChange={(sortBy) => {
        sortState.updateFilter('sortBy', sortBy);
        sortState.setShowSortModal(false);
      }}
      onOrderToggle={() =>
        sortState.updateFilter(
          'sortOrder',
          sortState.filters.sortOrder === 'asc' ? 'desc' : 'asc'
        )
      }
      showFavoritesOnly={sortState.filters.showFavoritesOnly}
      onToggleFavoritesOnly={() =>
        sortState.updateFilter('showFavoritesOnly', !sortState.filters.showFavoritesOnly)
      }
      showGridOutfits={sortState.showGridOutfits}
      showGridLookbooks={sortState.showGridLookbooks}
      onToggleGridOutfits={() => sortState.setShowGridOutfits((prev) => !prev)}
      onToggleGridLookbooks={() => sortState.setShowGridLookbooks((prev) => !prev)}
      occasionOptions={sortState.availableOccasions}
      selectedOccasions={sortState.selectedOccasions}
      onToggleOccasion={sortState.toggleOccasion}
      onClearOccasions={() => sortState.setSelectedOccasions([])}
      onResetFilters={() => {
        sortState.setShowGridOutfits(true);
        sortState.setShowGridLookbooks(true);
        sortState.setSelectedOccasions([]);
        sortState.updateFilter('showFavoritesOnly', false);
      }}
      postMenuVisible={postMenuState.visible}
      feedItem={postMenuState.feedItem}
      currentUserId={postMenuState.currentUserId}
      isFollowingOwner={postMenuState.isFollowingOwner}
      menuButtonPosition={postMenuState.menuButtonPosition}
      tryingOnOutfit={postMenuState.tryingOnOutfit}
      unfollowingUserId={postMenuState.unfollowingUserId}
      onClosePostMenu={postMenuState.onClose}
      onEditOutfit={postMenuState.onEditOutfit}
      onArchiveOutfit={postMenuState.onArchiveOutfit}
      onDeletePost={postMenuState.onDeletePost}
      onTryOnOutfit={postMenuState.onTryOnOutfit}
      onUnfollow={postMenuState.onUnfollow}
      getImageUrl={postMenuState.getImageUrl}
      commentsVisible={commentsState.visible}
      onCloseComments={commentsState.onClose}
      commentsPostId={commentsState.postId}
      userId={commentsState.userId}
      comments={commentsState.comments}
      onCommentsUpdate={commentsState.onCommentsUpdate}
      onCommentCountUpdate={commentsState.onCommentCountUpdate}
      slideshowLoading={slideshowState.loading}
      slideshowVisible={slideshowState.visible}
      slideshowOutfits={slideshowState.outfits}
      slideshowImages={slideshowState.images}
      currentSlideIndex={slideshowState.currentIndex}
      isAutoPlaying={slideshowState.isAutoPlaying}
      onCloseSlideshow={slideshowState.onClose}
      onNextSlideshow={slideshowState.onNext}
      onPrevSlideshow={slideshowState.onPrev}
      onToggleAutoPlay={slideshowState.onToggleAutoPlay}
      generatingOutfitId={generationState.generatingOutfitId}
      onViewOutfit={generationState.onViewOutfit}
      lookbookPickerVisible={lookbookState.pickerVisible}
      onCloseLookbookPicker={lookbookState.onClosePicker}
      lookbookTitle={lookbookState.title}
      onChangeLookbookTitle={lookbookState.onChangeTitle}
      lookbookDescription={lookbookState.description}
      onChangeLookbookDescription={lookbookState.onChangeDescription}
      lookbookVisibility={lookbookState.visibility}
      onChangeLookbookVisibility={lookbookState.onChangeVisibility}
      lookbookSaving={lookbookState.saving}
      selectedOutfitCount={lookbookState.selectedOutfitCount}
      onCreateLookbook={lookbookState.onCreateLookbook}
      userLookbooks={lookbookState.userLookbooks}
      loadingLookbooks={lookbookState.loadingLookbooks}
      selectedLookbookId={lookbookState.selectedLookbookId}
      onSelectLookbook={lookbookState.onSelectLookbook}
      onAddToExistingLookbook={lookbookState.onAddToExistingLookbook}
    />
  );
}
