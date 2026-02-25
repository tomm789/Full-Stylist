/**
 * useWardrobeItemActions
 * Supabase mutations for toggling favourites and soft-deleting wardrobe items.
 * Preserves Platform.OS === 'web' alert/confirm branching for cross-platform parity.
 */

import { Alert, Platform } from 'react-native';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WardrobeItem } from '@/lib/wardrobe';

export type UseWardrobeItemActionsParams = {
  userId: string | undefined;
  selectedItem: WardrobeItem | null;
  setShowItemModal: (visible: boolean) => void;
  refresh: () => void;
};

export function useWardrobeItemActions({
  userId,
  selectedItem,
  setShowItemModal,
  refresh,
}: UseWardrobeItemActionsParams) {
  const handleToggleFavorite = useCallback(
    async (itemId: string, currentFavoriteStatus: boolean) => {
      if (!userId) return;
      try {
        const { error } = await supabase
          .from('wardrobe_items')
          .update({ is_favorite: !currentFavoriteStatus })
          .eq('id', itemId)
          .eq('owner_user_id', userId);
        if (error) throw error;
        refresh();
      } catch (error: any) {
        Alert.alert('Error', 'Failed to toggle favorite');
        console.error('Failed to toggle favorite:', error);
      }
    },
    [userId, refresh]
  );

  const handleModalDelete = useCallback(() => {
    if (!selectedItem || !userId) return;
    if (selectedItem.owner_user_id !== userId) return;

    const deleteAction = async () => {
      try {
        const { error } = await supabase
          .from('wardrobe_items')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', selectedItem.id)
          .eq('owner_user_id', userId);
        if (error) throw error;
        setShowItemModal(false);
        refresh();
        if (Platform.OS === 'web') {
          alert('Item deleted successfully');
        } else {
          Alert.alert('Success', 'Item deleted successfully');
        }
      } catch (error: any) {
        if (Platform.OS === 'web') {
          alert(error.message || 'Failed to delete item');
        } else {
          Alert.alert('Error', error.message || 'Failed to delete item');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        deleteAction();
      }
    } else {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this item? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: deleteAction },
        ]
      );
    }
  }, [selectedItem, userId, setShowItemModal, refresh]);

  return { handleToggleFavorite, handleModalDelete };
}
