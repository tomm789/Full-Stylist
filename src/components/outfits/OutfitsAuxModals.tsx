import React from 'react';
import FindSimilarModal from '@/components/FindSimilarModal';
import { DropdownMenuItem, DropdownMenuModal } from '@/components/shared/modals';

export type OutfitsAuxModalsProps = {
  openOutfitMenuId: string | null;
  onCloseOutfitMenu: () => void;
  onEditOutfit: (outfitId: string) => void;
  onDuplicateOutfit: (outfitId: string) => void;
  onArchiveOutfit: (outfitId: string) => void;
  findSimilarVisible: boolean;
  onCloseFindSimilar: () => void;
  findSimilarEntityType: 'wardrobe_item' | 'outfit' | null;
  findSimilarEntityId: string | null;
  findSimilarCategoryId: string | null;
};

export default function OutfitsAuxModals({
  openOutfitMenuId,
  onCloseOutfitMenu,
  onEditOutfit,
  onDuplicateOutfit,
  onArchiveOutfit,
  findSimilarVisible,
  onCloseFindSimilar,
  findSimilarEntityType,
  findSimilarEntityId,
  findSimilarCategoryId,
}: OutfitsAuxModalsProps) {
  return (
    <>
      <DropdownMenuModal
        visible={openOutfitMenuId !== null}
        onClose={onCloseOutfitMenu}
        align="right"
      >
        <DropdownMenuItem
          label="Edit"
          icon="create-outline"
          onPress={() => openOutfitMenuId && onEditOutfit(openOutfitMenuId)}
        />
        <DropdownMenuItem
          label="Duplicate"
          icon="copy-outline"
          onPress={() => openOutfitMenuId && onDuplicateOutfit(openOutfitMenuId)}
        />
        <DropdownMenuItem
          label="Archive"
          icon="archive-outline"
          danger
          onPress={() => openOutfitMenuId && onArchiveOutfit(openOutfitMenuId)}
        />
      </DropdownMenuModal>

      <FindSimilarModal
        visible={findSimilarVisible}
        onClose={onCloseFindSimilar}
        entityType={findSimilarEntityType}
        entityId={findSimilarEntityId}
        categoryId={findSimilarCategoryId}
      />
    </>
  );
}
