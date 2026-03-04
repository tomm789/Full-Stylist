import React from 'react';
import { Platform } from 'react-native';
import { showSuccessToast } from '@/utils/toast';
import ItemDetailModal from '@/components/wardrobe/ItemDetailModal';
import OutfitCreatorOptionsModal from '@/components/wardrobe/OutfitCreatorOptionsModal';
import HeadshotSelectorModal from '@/components/wardrobe/HeadshotSelectorModal';
import WardrobeCameraOverlay from '@/components/wardrobe/WardrobeCameraOverlay';

interface WardrobeModalStackProps {
  activeTab: string;

  // Item Detail Modal
  showItemModal: boolean;
  selectedItem: any;
  imageCache: Map<string, string>;
  userId: string | undefined;
  onCloseItemModal: () => void;
  onItemAddToOutfit: (item: any) => void;
  onItemOpenDetail: () => void;
  onItemEdit: () => void;
  onItemDelete: () => void;

  // Creator Options Modal
  showCreatorOptionsModal: boolean;
  onCloseCreatorOptionsModal: () => void;
  onCreatorExpand: (expanded: boolean) => void;
  onSaveDraft: () => void;
  onResetCreator: () => void;

  // Headshot Modal
  showHeadshotSelector: boolean;
  onCloseHeadshotSelector: () => void;
  bodyShot: any;
  onNewHeadshot: () => Promise<void>;

  // Camera Overlay
  wardrobeCamera: any;
  onCameraImageReady: (uri: string) => void;
  onCameraClose: () => void;
}

export default function WardrobeModalStack({
  activeTab,
  showItemModal,
  selectedItem,
  imageCache,
  userId,
  onCloseItemModal,
  onItemAddToOutfit,
  onItemOpenDetail,
  onItemEdit,
  onItemDelete,
  showCreatorOptionsModal,
  onCloseCreatorOptionsModal,
  onCreatorExpand,
  onSaveDraft,
  onResetCreator,
  showHeadshotSelector,
  onCloseHeadshotSelector,
  bodyShot,
  onNewHeadshot,
  wardrobeCamera,
  onCameraImageReady,
  onCameraClose,
}: WardrobeModalStackProps) {
  return (
    <>
      {activeTab === 'my' && (
        <ItemDetailModal
          visible={showItemModal}
          onClose={onCloseItemModal}
          item={selectedItem}
          imageUrl={selectedItem ? imageCache.get(selectedItem.id) || null : null}
          isOwner={Boolean(userId && selectedItem && selectedItem.owner_user_id === userId)}
          onAddToOutfit={() => {
            if (!selectedItem) return;
            onItemAddToOutfit(selectedItem);
            onCloseItemModal();
            showSuccessToast('Added to outfit. Tip: Long hold an item to add it to your outfit.');
          }}
          onOpenDetail={onItemOpenDetail}
          onEdit={onItemEdit}
          onDelete={onItemDelete}
        />
      )}

      <OutfitCreatorOptionsModal
        visible={showCreatorOptionsModal}
        onClose={onCloseCreatorOptionsModal}
        onExpand={() => onCreatorExpand(true)}
        onSaveAsDraft={onSaveDraft}
        onClearSelection={onResetCreator}
      />

      <HeadshotSelectorModal
        visible={showHeadshotSelector}
        userId={userId ?? ''}
        currentHeadshotId={bodyShot.currentHeadshotId}
        currentBodyShotId={bodyShot.currentBodyShotId}
        headshots={bodyShot.availableHeadshots}
        onClose={onCloseHeadshotSelector}
        onCheckHeadshot={bodyShot.handleCheckHeadshot}
        onGenerateBodyShot={bodyShot.handleGenerateBodyShot}
        onSkipBodyShot={bodyShot.handleSkipBodyShot}
        loading={bodyShot.loadingHeadshots}
        onNewHeadshot={onNewHeadshot}
      />

      {Platform.OS !== 'web' && (
        <WardrobeCameraOverlay
          cameraAnimatedStyle={wardrobeCamera.cameraAnimatedStyle}
          isOpen={wardrobeCamera.isOpen}
          cameraRef={wardrobeCamera.cameraRef}
          onCameraReady={wardrobeCamera.onCameraReady}
          onImageReady={onCameraImageReady}
          onClose={onCameraClose}
          pickFromLibrary={wardrobeCamera.pickFromLibrary}
          capture={wardrobeCamera.capture}
          lastPhotoUri={wardrobeCamera.lastPhotoUri}
        />
      )}
    </>
  );
}
