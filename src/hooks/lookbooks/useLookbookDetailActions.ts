/**
 * useLookbookDetailActions Hook
 * Handlers and modal state for lookbook detail screen actions
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { deleteLookbook, saveLookbook, Lookbook } from '@/lib/lookbooks';
import { createPost } from '@/lib/posts';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';

interface UseLookbookDetailActionsProps {
  lookbook: Lookbook | null;
  outfits: any[];
  onOutfitsChange: (outfits: any[]) => void;
  onRefresh: () => Promise<void>;
  onSlideshowOpen: (outfits: any[]) => Promise<void>;
}

interface UseLookbookDetailActionsReturn {
  // Edit modal
  showEditModal: boolean;
  editTitle: string;
  editDescription: string;
  editVisibility: 'public' | 'followers' | 'private_link' | 'private';
  setShowEditModal: (show: boolean) => void;
  setEditTitle: (title: string) => void;
  setEditDescription: (description: string) => void;
  setEditVisibility: (visibility: 'public' | 'followers' | 'private_link' | 'private') => void;
  handleEdit: () => void;
  handleSaveEdit: (
    title: string,
    description: string,
    visibility: 'public' | 'followers' | 'private_link' | 'private'
  ) => Promise<void>;

  // Add outfits modal
  showAddOutfitsModal: boolean;
  availableOutfits: any[];
  selectedNewOutfits: Set<string>;
  loadingOutfits: boolean;
  addOutfitImageUrls: Map<string, string | null>;
  setShowAddOutfitsModal: (show: boolean) => void;
  openAddOutfitsModal: () => Promise<void>;
  toggleNewOutfitSelection: (outfitId: string) => void;
  handleAddOutfits: (addOutfitsFn: (outfitIds: string[]) => Promise<void>) => Promise<void>;
  handleCloseAddOutfitsModal: () => void;

  // Outfit menu
  showOutfitMenu: boolean;
  selectedOutfit: any | null;
  setShowOutfitMenu: (show: boolean) => void;
  openOutfitMenu: (outfit: any) => void;
  handleEditOutfitFromMenu: () => void;
  handleRemoveOutfitFromMenu: (removeOutfitFn: (outfitId: string) => Promise<void>) => Promise<void>;

  // Actions
  deleting: boolean;
  publishing: boolean;
  handleDelete: () => void;
  handlePublish: () => Promise<void>;
  toggleFavorite: (outfitId: string, currentFavoriteStatus: boolean) => Promise<void>;
  handleOpenSlideshow: () => Promise<void>;
}

export function useLookbookDetailActions({
  lookbook,
  outfits,
  onOutfitsChange,
  onRefresh,
  onSlideshowOpen,
}: UseLookbookDetailActionsProps): UseLookbookDetailActionsReturn {
  const router = useRouter();
  const { user } = useAuth();

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<
    'public' | 'followers' | 'private_link' | 'private'
  >('followers');

  // Outfit actions menu state
  const [showOutfitMenu, setShowOutfitMenu] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<any | null>(null);

  // Add outfits modal state
  const [showAddOutfitsModal, setShowAddOutfitsModal] = useState(false);
  
  const handleCloseAddOutfitsModal = useCallback(() => {
    setShowAddOutfitsModal(false);
    setSelectedNewOutfits(new Set());
  }, []);
  const [availableOutfits, setAvailableOutfits] = useState<any[]>([]);
  const [selectedNewOutfits, setSelectedNewOutfits] = useState<Set<string>>(new Set());
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [addOutfitImageUrls, setAddOutfitImageUrls] = useState<Map<string, string | null>>(
    new Map()
  );

  // Action states
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleEdit = useCallback(() => {
    if (!lookbook) return;
    setEditTitle(lookbook.title);
    setEditDescription(lookbook.description || '');
    setEditVisibility(
      lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility
    );
    setShowEditModal(true);
  }, [lookbook]);

  const handleSaveEdit = useCallback(
    async (
      title: string,
      description: string,
      visibility: 'public' | 'followers' | 'private_link' | 'private'
    ) => {
      if (!user || !lookbook || !title.trim()) {
        Alert.alert('Error', 'Title is required');
        return;
      }

      try {
        const outfitIds = outfits.map((outfit) => outfit.id);

        const { error } = await saveLookbook(
          user.id,
          {
            id: lookbook.id,
            title: title.trim(),
            description: description.trim() || undefined,
            visibility,
            type: lookbook.type,
          },
          outfitIds
        );

        if (error) {
          Alert.alert('Error', 'Failed to update lookbook');
        } else {
          setShowEditModal(false);
          await onRefresh();
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update lookbook');
      }
    },
    [user, lookbook, outfits, onRefresh]
  );

  const handleDelete = useCallback(() => {
    if (!user || !lookbook) return;

    Alert.alert(
      'Delete Lookbook',
      'Are you sure you want to delete this lookbook? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteLookbook(user.id, lookbook.id);

            if (error) {
              Alert.alert('Error', 'Failed to delete lookbook');
              setDeleting(false);
            } else {
              Alert.alert('Success', 'Lookbook deleted', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            }
          },
        },
      ]
    );
  }, [user, lookbook, router]);

  const handlePublish = useCallback(async () => {
    if (!user || !lookbook) return;

    setPublishing(true);

    try {
      const { error } = await createPost(
        user.id,
        'lookbook',
        lookbook.id,
        undefined,
        lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility
      );

      if (error) {
        if (Platform.OS === 'web') {
          alert(`Failed to publish: ${error.message || error}`);
        } else {
          Alert.alert('Error', `Failed to publish: ${error.message || error}`);
        }
      } else {
        if (Platform.OS === 'web') {
          alert('Lookbook published to feed!');
        } else {
          Alert.alert('Success', 'Lookbook published to feed!', [{ text: 'OK' }]);
        }
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(error.message || 'An unexpected error occurred');
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      setPublishing(false);
    }
  }, [user, lookbook]);

  const openAddOutfitsModal = useCallback(async () => {
    if (!user) return;

    setLoadingOutfits(true);
    setShowAddOutfitsModal(true);

    try {
      const { data: allOutfits } = await getUserOutfits(user.id);
      if (allOutfits) {
        const existingOutfitIds = new Set(outfits.map((o) => o.id));
        const available = allOutfits.filter((o: any) => !existingOutfitIds.has(o.id));
        setAvailableOutfits(available);

        const imageUrlMap = new Map<string, string | null>();
        await Promise.all(
          available.map(async (outfit: any) => {
            const url = await getOutfitCoverImageUrl(outfit);
            imageUrlMap.set(outfit.id, url);
          })
        );
        setAddOutfitImageUrls(imageUrlMap);
      }
    } finally {
      setLoadingOutfits(false);
    }
  }, [user, outfits]);

  const toggleNewOutfitSelection = useCallback((outfitId: string) => {
    setSelectedNewOutfits((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(outfitId)) {
        newSelected.delete(outfitId);
      } else {
        newSelected.add(outfitId);
      }
      return newSelected;
    });
  }, []);

  const handleAddOutfits = useCallback(
    async (addOutfitsFn: (outfitIds: string[]) => Promise<void>) => {
      if (selectedNewOutfits.size === 0) return;
      await addOutfitsFn(Array.from(selectedNewOutfits));
      setShowAddOutfitsModal(false);
      setSelectedNewOutfits(new Set());
    },
    [selectedNewOutfits]
  );

  const openOutfitMenu = useCallback((outfit: any) => {
    setSelectedOutfit(outfit);
    setShowOutfitMenu(true);
  }, []);

  const handleEditOutfitFromMenu = useCallback(() => {
    if (!selectedOutfit) return;
    setShowOutfitMenu(false);
    router.push(`/outfits/${selectedOutfit.id}`);
  }, [selectedOutfit, router]);

  const handleRemoveOutfitFromMenu = useCallback(
    async (removeOutfitFn: (outfitId: string) => Promise<void>) => {
      if (!selectedOutfit) return;
      setShowOutfitMenu(false);
      await removeOutfitFn(selectedOutfit.id);
    },
    [selectedOutfit]
  );

  const toggleFavorite = useCallback(
    async (outfitId: string, currentFavoriteStatus: boolean) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from('outfits')
          .update({ is_favorite: !currentFavoriteStatus })
          .eq('id', outfitId)
          .eq('owner_user_id', user.id);

        if (error) throw error;

        onOutfitsChange(
          outfits.map((outfit) =>
            outfit.id === outfitId
              ? { ...outfit, is_favorite: !currentFavoriteStatus }
              : outfit
          )
        );
      } catch (error: any) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [user, outfits, onOutfitsChange]
  );

  const handleOpenSlideshow = useCallback(async () => {
    if (outfits.length === 0) return;
    await onSlideshowOpen(outfits);
  }, [outfits, onSlideshowOpen]);

  return {
    // Edit modal
    showEditModal,
    editTitle,
    editDescription,
    editVisibility,
    setShowEditModal,
    setEditTitle,
    setEditDescription,
    setEditVisibility,
    handleEdit,
    handleSaveEdit,

    // Add outfits modal
    showAddOutfitsModal,
    availableOutfits,
    selectedNewOutfits,
    loadingOutfits,
    addOutfitImageUrls,
    setShowAddOutfitsModal,
    openAddOutfitsModal,
    toggleNewOutfitSelection,
    handleAddOutfits,
    handleCloseAddOutfitsModal,

    // Outfit menu
    showOutfitMenu,
    selectedOutfit,
    setShowOutfitMenu,
    openOutfitMenu,
    handleEditOutfitFromMenu,
    handleRemoveOutfitFromMenu,

    // Actions
    deleting,
    publishing,
    handleDelete,
    handlePublish,
    toggleFavorite,
    handleOpenSlideshow,
  };
}
