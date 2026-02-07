import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FeedItem } from '@/lib/posts';
import { usePostMenuContext } from './usePostMenuContext';
import type { SortOption, SortOrder } from './useOutfitFilters';

type MenuButtonPosition = { x: number; y: number; width: number; height: number } | null;

type SortStateInput = {
  showSortModal: boolean;
  setShowSortModal: (show: boolean) => void;
  filters: { sortBy: SortOption; sortOrder: SortOrder; showFavoritesOnly: boolean };
  updateFilter: (key: string, value: any) => void;
  showGridOutfits: boolean;
  setShowGridOutfits: Dispatch<SetStateAction<boolean>>;
  showGridLookbooks: boolean;
  setShowGridLookbooks: Dispatch<SetStateAction<boolean>>;
  availableOccasions: string[];
  selectedOccasions: string[];
  toggleOccasion: (occasion: string) => void;
  setSelectedOccasions: (occasions: string[]) => void;
};

type SocialModalsState = {
  openMenuPostId: string | null;
  menuButtonPosition: MenuButtonPosition;
  setOpenMenuPostId: (postId: string | null) => void;
  setMenuButtonPosition: (position: MenuButtonPosition) => void;
  handleEditOutfit: (outfitId: string) => void;
  handleDeletePost: (postId: string) => Promise<void>;
  followStatuses: Map<string, boolean>;
  unfollowingUserId: string | null;
  handleUnfollow: (userId: string) => Promise<void>;
  showComments: boolean;
  setShowComments: (show: boolean) => void;
  selectedItem: FeedItem | null;
  comments: any[];
  setComments: (comments: any[]) => void;
};

type SlideshowStateInput = {
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

type LookbookStateInput<TVisibility extends string = string> = {
  pickerVisible: boolean;
  setPickerVisible: (show: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  visibility: TVisibility;
  setVisibility: Dispatch<SetStateAction<TVisibility>>;
  saving: boolean;
  selectedOutfitCount: number;
  onCreateLookbook: () => Promise<void>;
  userLookbooks: any[];
  loadingLookbooks: boolean;
  selectedLookbookId: string | null;
  setSelectedLookbookId: (id: string | null) => void;
  onAddToExistingLookbook: () => Promise<void>;
};

type UseOutfitsModalsStateParams<TVisibility extends string = string> = {
  userId?: string;
  activeFeedItems: FeedItem[];
  outfitImages: Map<string, string | null>;
  sort: SortStateInput;
  modals: SocialModalsState;
  updateCommentCount: (postId: string, count: number) => void;
  tryOnOutfit: (outfitId: string, referenceImageUrl?: string | null) => void | Promise<void>;
  tryingOnOutfit: boolean;
  onArchiveOutfit: (outfitId: string) => void | Promise<void>;
  onViewOutfit: (outfitId: string) => void;
  generationOutfitId: string | null;
  slideshow: SlideshowStateInput;
  lookbook: LookbookStateInput<TVisibility>;
};

export function useOutfitsModalsState<TVisibility extends string = string>({
  userId,
  activeFeedItems,
  outfitImages,
  sort,
  modals,
  updateCommentCount,
  tryOnOutfit,
  tryingOnOutfit,
  onArchiveOutfit,
  onViewOutfit,
  generationOutfitId,
  slideshow,
  lookbook,
}: UseOutfitsModalsStateParams<TVisibility>) {
  const postMenuContext = usePostMenuContext({
    activeFeedItems,
    openMenuPostId: modals.openMenuPostId,
    followStatuses: modals.followStatuses,
  });

  const closePostMenu = useCallback(() => {
    modals.setOpenMenuPostId(null);
    modals.setMenuButtonPosition(null);
  }, [modals]);

  const commentsPostId =
    modals.selectedItem?.type === 'post'
      ? modals.selectedItem.post?.id || null
      : modals.selectedItem?.repost?.original_post?.id || null;

  const sortState = useMemo(
    () => ({
      showSortModal: sort.showSortModal,
      setShowSortModal: sort.setShowSortModal,
      filters: sort.filters,
      updateFilter: sort.updateFilter,
      showGridOutfits: sort.showGridOutfits,
      setShowGridOutfits: sort.setShowGridOutfits,
      showGridLookbooks: sort.showGridLookbooks,
      setShowGridLookbooks: sort.setShowGridLookbooks,
      availableOccasions: sort.availableOccasions,
      selectedOccasions: sort.selectedOccasions,
      toggleOccasion: sort.toggleOccasion,
      setSelectedOccasions: sort.setSelectedOccasions,
    }),
    [sort]
  );

  const postMenuState = useMemo(
    () => ({
      visible: modals.openMenuPostId !== null,
      feedItem: postMenuContext.feedItem,
      currentUserId: userId,
      isFollowingOwner: postMenuContext.isFollowingOwner,
      menuButtonPosition: modals.menuButtonPosition,
      tryingOnOutfit,
      unfollowingUserId: modals.unfollowingUserId,
      onClose: closePostMenu,
      onEditOutfit: modals.handleEditOutfit,
      onArchiveOutfit,
      onDeletePost: modals.handleDeletePost,
      onTryOnOutfit: tryOnOutfit,
      onUnfollow: modals.handleUnfollow,
      getImageUrl: (outfitId: string) => outfitImages.get(outfitId) || null,
    }),
    [
      closePostMenu,
      modals,
      outfitImages,
      onArchiveOutfit,
      postMenuContext.feedItem,
      postMenuContext.isFollowingOwner,
      tryOnOutfit,
      tryingOnOutfit,
      userId,
    ]
  );

  const commentsState = useMemo(
    () => ({
      visible: modals.showComments,
      onClose: () => modals.setShowComments(false),
      postId: commentsPostId,
      userId,
      comments: modals.comments,
      onCommentsUpdate: modals.setComments,
      onCommentCountUpdate: (count: number) => {
        const postId =
          modals.selectedItem?.type === 'post'
            ? modals.selectedItem.post?.id
            : modals.selectedItem?.repost?.original_post?.id;
        if (postId) {
          updateCommentCount(postId, count);
        }
      },
    }),
    [commentsPostId, modals, updateCommentCount, userId]
  );

  const slideshowState = useMemo(
    () => ({
      loading: slideshow.loading,
      visible: slideshow.visible,
      outfits: slideshow.outfits,
      images: slideshow.images,
      currentIndex: slideshow.currentIndex,
      isAutoPlaying: slideshow.isAutoPlaying,
      onClose: slideshow.onClose,
      onNext: slideshow.onNext,
      onPrev: slideshow.onPrev,
      onToggleAutoPlay: slideshow.onToggleAutoPlay,
    }),
    [slideshow]
  );

  const generationState = useMemo(
    () => ({
      generatingOutfitId: generationOutfitId,
      onViewOutfit,
    }),
    [generationOutfitId, onViewOutfit]
  );

  const lookbookState = useMemo(
    () => ({
      pickerVisible: lookbook.pickerVisible,
      onClosePicker: () => lookbook.setPickerVisible(false),
      title: lookbook.title,
      onChangeTitle: lookbook.setTitle,
      description: lookbook.description,
      onChangeDescription: lookbook.setDescription,
      visibility: lookbook.visibility,
      onChangeVisibility: (visibility: TVisibility) => lookbook.setVisibility(visibility),
      saving: lookbook.saving,
      selectedOutfitCount: lookbook.selectedOutfitCount,
      onCreateLookbook: async () => {
        await lookbook.onCreateLookbook();
        lookbook.setPickerVisible(false);
      },
      userLookbooks: lookbook.userLookbooks,
      loadingLookbooks: lookbook.loadingLookbooks,
      selectedLookbookId: lookbook.selectedLookbookId,
      onSelectLookbook: lookbook.setSelectedLookbookId,
      onAddToExistingLookbook: async () => {
        await lookbook.onAddToExistingLookbook();
        lookbook.setPickerVisible(false);
      },
    }),
    [lookbook]
  );

  return {
    sortState,
    postMenuState,
    commentsState,
    slideshowState,
    generationState,
    lookbookState,
  };
}
