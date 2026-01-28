/**
 * useWardrobeItemDetailActions Hook
 * Actions and handlers for wardrobe item detail screen
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveWardrobeItem,
  unsaveWardrobeItem,
  isWardrobeItemSaved,
  WardrobeItem,
} from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { navigateToWardrobeItem } from '@/utils/itemNavigationHelpers';

interface UseWardrobeItemDetailActionsProps {
  item: WardrobeItem | null;
  itemId: string | undefined;
  itemIds: string | undefined;
  isReadOnly: boolean;
}

interface UseWardrobeItemDetailActionsReturn {
  // Image carousel
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;

  // Save state (for read-only view)
  isSaved: boolean;
  isSaving: boolean;

  // Actions
  toggleFavorite: () => Promise<void>;
  handleAddToOutfit: () => void;
  handleSaveItem: () => Promise<void>;
  handleEdit: () => void;
  handleDelete: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleNavigateToItem: (targetItemId: string) => void;
}

export function useWardrobeItemDetailActions({
  item,
  itemId,
  itemIds,
  isReadOnly,
}: UseWardrobeItemDetailActionsProps): UseWardrobeItemDetailActionsReturn {
  const router = useRouter();
  const { user } = useAuth();

  // Image carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Save state (for read-only view)
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if item is saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!itemId || !user || !item) return;
      const isOwn = item.owner_user_id === user.id;
      if (isReadOnly && !isOwn) {
        const { data: saved } = await isWardrobeItemSaved(user.id, itemId);
        setIsSaved(saved || false);
      }
    };

    if (item && user) {
      checkIfSaved();
    }
  }, [itemId, item, user, isReadOnly]);

  const isOwnItem = item && user && item.owner_user_id === user.id && !isReadOnly;

  const toggleFavorite = useCallback(async () => {
    if (!itemId || !user || !item) return;

    try {
      const newFavoriteStatus = !item.is_favorite;
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', itemId)
        .eq('owner_user_id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  }, [itemId, user, item]);

  const handleAddToOutfit = useCallback(() => {
    if (!item) {
      Alert.alert('Error', 'Item data not loaded');
      return;
    }
    router.push(`/outfits/new?category_id=${item.category_id}&item_id=${item.id}`);
  }, [item, router]);

  const handleSaveItem = useCallback(async () => {
    if (!itemId || !user || isSaving) return;

    setIsSaving(true);
    const isCurrentlySaved = isSaved;

    if (isCurrentlySaved) {
      const { error } = await unsaveWardrobeItem(user.id, itemId);
      if (!error) {
        setIsSaved(false);
        Alert.alert('Success', 'Item removed from your wardrobe');
      } else {
        Alert.alert('Error', 'Failed to remove item from wardrobe');
      }
    } else {
      const { error } = await saveWardrobeItem(user.id, itemId);
      if (!error) {
        setIsSaved(true);
        Alert.alert('Success', 'Item saved to your wardrobe');
      } else {
        Alert.alert('Error', 'Failed to save item to wardrobe');
      }
    }

    setIsSaving(false);
  }, [itemId, user, isSaved, isSaving]);

  const handleEdit = useCallback(() => {
    if (!itemId || !isOwnItem) return;
    router.push(`/wardrobe/item/${itemId}/edit`);
  }, [itemId, isOwnItem, router]);

  const handleDelete = useCallback(async () => {
    if (!isOwnItem || !itemId || !user) return;

    const deleteAction = async () => {
      try {
        const { error } = await supabase
          .from('wardrobe_items')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', itemId)
          .eq('owner_user_id', user.id);

        if (error) throw error;

        if (Platform.OS === 'web') {
          alert('Item deleted successfully');
        } else {
          Alert.alert('Success', 'Item deleted successfully');
        }
        router.back();
      } catch (error: any) {
        if (Platform.OS === 'web') {
          alert(error.message || 'Failed to delete item');
        } else {
          Alert.alert('Error', error.message || 'Failed to delete item');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (
        confirm('Are you sure you want to delete this item? This action cannot be undone.')
      ) {
        await deleteAction();
      }
    } else {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this item? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: deleteAction,
          },
        ]
      );
    }
  }, [isOwnItem, itemId, user, router]);

  const handleShare = useCallback(async () => {
    if (!item || !user) return;

    try {
      const shareUrl = `${process.env.EXPO_PUBLIC_APP_URL || 'https://fullstylist.app'}/wardrobe/item/${itemId}`;
      const message = `Check out my ${item.title} on Full Stylist!`;

      await Share.share({
        message: `${message}\n${shareUrl}`,
        title: item.title,
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  }, [item, itemId, user]);

  const handleNavigateToItem = useCallback(
    (targetItemId: string) => {
      navigateToWardrobeItem(router, targetItemId, itemIds);
    },
    [router, itemIds]
  );

  return {
    // Image carousel
    currentImageIndex,
    setCurrentImageIndex,

    // Save state
    isSaved,
    isSaving,

    // Actions
    toggleFavorite,
    handleAddToOutfit,
    handleSaveItem,
    handleEdit,
    handleDelete,
    handleShare,
    handleNavigateToItem,
  };
}
