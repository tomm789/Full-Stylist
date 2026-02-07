/**
 * useOutfitViewActions Hook
 * Actions and handlers for outfit view screen
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';

interface UseOutfitViewActionsProps {
  outfitId: string | undefined;
  outfitIds: string | undefined;
  filters: string | undefined;
  returnTo: string | undefined;
  outfit: any | null;
  deleteOutfit: () => Promise<void>;
}

interface UseOutfitViewActionsReturn {
  // Navigation
  navigationOutfits: Array<{ id: string; title: string; imageUrl: string | null }>;
  navigateToOutfit: (targetOutfitId: string) => void;
  handleBackPress: () => void;

  // Modals
  showImageModal: boolean;
  showDeleteConfirm: boolean;
  showComments: boolean;
  setShowImageModal: (show: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowComments: (show: boolean) => void;

  // Actions
  deleting: boolean;
  handleEdit: () => void;
  handleDelete: () => void;
  confirmDelete: () => Promise<void>;
  toggleFavorite: () => Promise<void>;
  handleCommentPress: (comments: any[], loadComments: () => Promise<void>) => Promise<void>;
}

export function useOutfitViewActions({
  outfitId,
  outfitIds,
  filters,
  returnTo,
  outfit,
  deleteOutfit,
}: UseOutfitViewActionsProps): UseOutfitViewActionsReturn {
  const router = useRouter();
  const { user } = useAuth();

  // Navigation
  const [navigationOutfits, setNavigationOutfits] = useState<
    Array<{ id: string; title: string; imageUrl: string | null }>
  >([]);

  // Modals
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Actions
  const [deleting, setDeleting] = useState(false);

  const loadNavigationOutfits = useCallback(async () => {
    if (!outfitIds || !user) return;

    try {
      const idsArray = outfitIds.split(',').filter(Boolean);
      if (idsArray.length === 0) return;

      const { data: outfitsData } = await supabase
        .from('outfits')
        .select('*')
        .in('id', idsArray)
        .eq('owner_user_id', user.id)
        .is('archived_at', null)
        .is('deleted_at', null);

      if (outfitsData) {
        const outfitMap = new Map(
          outfitsData.map((outfit) => [outfit.id, outfit])
        );
        const navItems = await Promise.all(
          idsArray.map(async (outfitId) => {
            const foundOutfit = outfitMap.get(outfitId);
            if (!foundOutfit) return null;
            const imageUrl = await getOutfitCoverImageUrl(foundOutfit);
            return {
              id: outfitId,
              title: foundOutfit.title || 'Untitled Outfit',
              imageUrl,
            };
          })
        );

        setNavigationOutfits(
          navItems.filter(
            (item): item is { id: string; title: string; imageUrl: string | null } =>
              item !== null
          )
        );
      }
    } catch (error) {
      console.error('Error loading navigation:', error);
    }
  }, [outfitIds, user]);

  useEffect(() => {
    if (outfitIds && user) {
      loadNavigationOutfits();
    }
  }, [outfitIds, user, loadNavigationOutfits]);

  const navigateToOutfit = useCallback(
    (targetOutfitId: string) => {
      if (!outfitIds) return;
      const queryParts = [`outfitIds=${encodeURIComponent(outfitIds)}`];
      if (filters) {
        queryParts.push(`filters=${encodeURIComponent(filters)}`);
      }
      if (returnTo) {
        queryParts.push(`returnTo=${encodeURIComponent(returnTo)}`);
      }
      router.replace(`/outfits/${targetOutfitId}/view?${queryParts.join('&')}`);
    },
    [outfitIds, filters, returnTo, router]
  );

  const handleBackPress = useCallback(() => {
    if (returnTo === 'outfits' || outfitIds) {
      router.replace('/(tabs)/outfits');
      return;
    }
    router.back();
  }, [returnTo, outfitIds, router]);

  const handleEdit = useCallback(() => {
    if (!outfitId) return;
    router.push(`/outfits/${outfitId}`);
  }, [outfitId, router]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!user || !outfit) return;

    setDeleting(true);
    try {
      await deleteOutfit();
      setShowDeleteConfirm(false);
      setDeleting(false);
      Alert.alert('Success', 'Outfit archived');
      
      // Use replace instead of back to avoid navigation timing issues
      if (returnTo === 'outfits' || outfitIds) {
        router.replace('/(tabs)/outfits');
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/outfits');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to archive outfit');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [user, outfit, deleteOutfit, returnTo, outfitIds, router]);

  const toggleFavorite = useCallback(async () => {
    if (!outfitId || !user || !outfit) return;

    try {
      const newFavoriteStatus = !outfit.is_favorite;
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', outfitId)
        .eq('owner_user_id', user.id);

      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  }, [outfitId, user, outfit]);

  const handleCommentPress = useCallback(
    async (comments: any[], loadComments: () => Promise<void>) => {
      if (!showComments && comments.length === 0) {
        await loadComments();
      }
      setShowComments(!showComments);
    },
    [showComments]
  );

  return {
    // Navigation
    navigationOutfits,
    navigateToOutfit,
    handleBackPress,

    // Modals
    showImageModal,
    showDeleteConfirm,
    showComments,
    setShowImageModal,
    setShowDeleteConfirm,
    setShowComments,

    // Actions
    deleting,
    handleEdit,
    handleDelete,
    confirmDelete,
    toggleFavorite,
    handleCommentPress,
  };
}
