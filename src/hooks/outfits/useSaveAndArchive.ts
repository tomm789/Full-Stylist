import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { showSuccessToast, showErrorToast } from '@/utils/toast';

interface UseSaveAndArchiveProps {
  user: { id: string } | null;
  outfit: any | null;
  isNew: boolean;
  saveOutfit: () => Promise<{ id: string; isFirstPost: boolean } | null>;
  router: {
    replace: (path: string) => void;
    back: () => void;
  };
  onFirstPost?: (outfitId: string) => void;
}

export interface UseSaveAndArchiveReturn {
  saving: boolean;
  handleSave: () => Promise<void>;
  handleDelete: () => void;
}

export function useSaveAndArchive({
  user,
  outfit,
  isNew,
  saveOutfit,
  router,
  onFirstPost,
}: UseSaveAndArchiveProps): UseSaveAndArchiveReturn {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await saveOutfit();
      if (result) {
        if (result.isFirstPost && onFirstPost) {
          onFirstPost(result.id);
        }
        if (isNew) {
          showSuccessToast('Outfit saved! You can now generate the outfit image.');
          router.replace(`/outfits/${result.id}`);
        } else {
          showSuccessToast('Outfit saved!');
        }
      }
    } catch (error: any) {
      showErrorToast(error.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [user, saveOutfit, isNew, router, onFirstPost]);

  const handleDelete = useCallback(() => {
    if (!user || !outfit || isNew) return;

    Alert.alert('Archive Outfit', 'Move this outfit to your archive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { archiveOutfit } = await import('@/lib/outfits');
            const { error } = await archiveOutfit(user.id, outfit.id);
            if (error) throw error;
            showSuccessToast('Outfit archived');
            router.back();
          } catch (error: any) {
            showErrorToast(error.message || 'Failed to archive outfit');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [user, outfit, isNew, router]);

  return { saving, handleSave, handleDelete };
}
