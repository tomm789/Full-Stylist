import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { getOutfit, saveOutfit, archiveOutfit } from '@/lib/outfits';
import type { Router } from 'expo-router';

export type UseOutfitActionsParams = {
  userId?: string;
  router: Router;
  refresh: () => Promise<void>;
  refreshDiscover: () => Promise<void>;
  onCloseOutfitMenu: () => void;
  onClosePostMenu: () => void;
};

export function useOutfitActions({
  userId,
  router,
  refresh,
  refreshDiscover,
  onCloseOutfitMenu,
  onClosePostMenu,
}: UseOutfitActionsParams) {
  const handleEditOutfit = useCallback(
    (outfitId: string) => {
      if (!userId) return;
      onCloseOutfitMenu();
      router.push(`/outfits/${outfitId}`);
    },
    [onCloseOutfitMenu, router, userId]
  );

  const handleDuplicateOutfit = useCallback(
    async (outfitId: string) => {
      if (!userId) return;

      onCloseOutfitMenu();

      const { data, error } = await getOutfit(outfitId);

      if (error || !data) {
        Alert.alert('Error', error?.message || 'Failed to load outfit');
        return;
      }

      const { outfit, items } = data;
      const baseTitle = outfit.title || 'Untitled Outfit';
      const duplicateTitle = `${baseTitle} (Copy)`;

      const { error: saveError } = await saveOutfit(
        userId,
        {
          title: duplicateTitle,
          notes: outfit.notes,
          visibility: outfit.visibility || 'followers',
        },
        items.map((item) => ({
          category_id: item.category_id ?? null,
          wardrobe_item_id: item.wardrobe_item_id,
          position: item.position,
        }))
      );

      if (saveError) {
        Alert.alert('Error', saveError?.message || 'Failed to duplicate outfit');
        return;
      }

      await refresh();
    },
    [onCloseOutfitMenu, refresh, userId]
  );

  const archiveOutfitWithConfirm = useCallback(
    async (
      outfitId: string,
      options?: {
        onClose?: () => void;
        onAfterArchive?: () => Promise<void>;
      }
    ) => {
      if (!userId) return;

      options?.onClose?.();

      const confirmArchive = async () => {
        const { error } = await archiveOutfit(userId, outfitId);
        if (error) {
          if (Platform.OS === 'web') {
            alert(error?.message || 'Failed to archive outfit');
          } else {
            Alert.alert('Error', error?.message || 'Failed to archive outfit');
          }
          return;
        }
        if (Platform.OS === 'web') {
          alert('Outfit archived');
        } else {
          Alert.alert('Success', 'Outfit archived');
        }
        if (options?.onAfterArchive) {
          await options.onAfterArchive();
        } else {
          await refresh();
        }
      };

      if (Platform.OS === 'web') {
        if (confirm('Archive this outfit?')) {
          void confirmArchive();
        }
        return;
      }

      setTimeout(() => {
        Alert.alert('Archive outfit', 'This will move the outfit to your archive.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive',
            style: 'destructive',
            onPress: confirmArchive,
          },
        ]);
      }, 50);
    },
    [refresh, userId]
  );

  const handleDeleteOutfit = useCallback(
    (outfitId: string) =>
      archiveOutfitWithConfirm(outfitId, {
        onClose: onCloseOutfitMenu,
      }),
    [archiveOutfitWithConfirm, onCloseOutfitMenu]
  );

  const handleArchiveOutfitFromPostMenu = useCallback(
    (outfitId: string) =>
      archiveOutfitWithConfirm(outfitId, {
        onClose: onClosePostMenu,
        onAfterArchive: async () => {
          await Promise.all([refresh(), refreshDiscover()]);
        },
      }),
    [archiveOutfitWithConfirm, onClosePostMenu, refresh, refreshDiscover]
  );

  return {
    handleEditOutfit,
    handleDuplicateOutfit,
    handleDeleteOutfit,
    handleArchiveOutfitFromPostMenu,
  };
}
