/**
 * useLookbookOutfits Hook
 * Manage lookbook outfit operations (add, remove, reorder)
 */

import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { saveLookbook, Lookbook } from '@/lib/lookbooks';

interface UseLookbookOutfitsProps {
  lookbook: Lookbook | null;
  userId: string | undefined;
  outfits: any[];
  onOutfitsChange: (outfits: any[]) => void;
  onRefresh: () => Promise<void>;
}

interface UseLookbookOutfitsReturn {
  addingOutfits: boolean;
  addOutfits: (outfitIds: string[]) => Promise<void>;
  removeOutfit: (outfitId: string) => Promise<void>;
  removeOutfitWithConfirm: (outfitId: string) => Promise<void>;
}

export function useLookbookOutfits({
  lookbook,
  userId,
  outfits,
  onOutfitsChange,
  onRefresh,
}: UseLookbookOutfitsProps): UseLookbookOutfitsReturn {
  const [addingOutfits, setAddingOutfits] = useState(false);

  const addOutfits = async (outfitIds: string[]) => {
    if (!userId || !lookbook || outfitIds.length === 0) return;

    setAddingOutfits(true);
    try {
      const updatedOutfitIds = [...outfits.map((o) => o.id), ...outfitIds];

      const { error } = await saveLookbook(
        userId,
        {
          id: lookbook.id,
          title: lookbook.title,
          description: lookbook.description,
          visibility:
            lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility,
          type: lookbook.type,
        },
        updatedOutfitIds
      );

      if (error) {
        Alert.alert('Error', 'Failed to add outfits to lookbook');
      } else {
        await onRefresh();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add outfits');
    } finally {
      setAddingOutfits(false);
    }
  };

  const removeOutfit = async (outfitId: string) => {
    if (!userId || !lookbook) return;

    try {
      const updatedOutfitIds = outfits.filter((o) => o.id !== outfitId).map((o) => o.id);

      const { error } = await saveLookbook(
        userId,
        {
          id: lookbook.id,
          title: lookbook.title,
          description: lookbook.description,
          visibility:
            lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility,
          type: lookbook.type,
        },
        updatedOutfitIds
      );

      if (error) {
        if (Platform.OS === 'web') {
          alert('Error: Failed to remove outfit from lookbook');
        } else {
          Alert.alert('Error', 'Failed to remove outfit from lookbook');
        }
      } else {
        onOutfitsChange(outfits.filter((o) => o.id !== outfitId));
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message || 'Failed to remove outfit'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to remove outfit');
      }
    }
  };

  const removeOutfitWithConfirm = async (outfitId: string) => {
    if (!userId || !lookbook) return;

    const removeAction = async () => {
      await removeOutfit(outfitId);
    };

    if (Platform.OS === 'web') {
      if (confirm('Remove this outfit from the lookbook?')) {
        await removeAction();
      }
    } else {
      Alert.alert(
        'Remove Outfit',
        'Remove this outfit from the lookbook?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: removeAction,
          },
        ]
      );
    }
  };

  return {
    addingOutfits,
    addOutfits,
    removeOutfit,
    removeOutfitWithConfirm,
  };
}
