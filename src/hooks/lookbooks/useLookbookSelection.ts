import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getLookbook, getUserLookbooks, saveLookbook } from '@/lib/lookbooks';

type LookbookVisibility = 'public' | 'followers' | 'private_link';

type UseLookbookSelectionParams = {
  userId?: string;
  onNavigateToLookbook: (lookbookId: string) => void;
};

export function useLookbookSelection({
  userId,
  onNavigateToLookbook,
}: UseLookbookSelectionParams) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set());
  const [selectedOutfitImages, setSelectedOutfitImages] = useState<
    Map<string, string | null>
  >(new Map());

  const [lookbookTitle, setLookbookTitle] = useState('');
  const [lookbookDescription, setLookbookDescription] = useState('');
  const [lookbookVisibility, setLookbookVisibility] =
    useState<LookbookVisibility>('followers');
  const [lookbookSaving, setLookbookSaving] = useState(false);
  const [userLookbooks, setUserLookbooks] = useState<any[]>([]);
  const [loadingLookbooks, setLoadingLookbooks] = useState(false);
  const [lookbookPickerVisible, setLookbookPickerVisible] = useState(false);
  const [selectedLookbookId, setSelectedLookbookId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectionMode || !userId) return;
    if (userLookbooks.length > 0 || loadingLookbooks) return;

    const loadLookbooks = async () => {
      setLoadingLookbooks(true);
      const { data } = await getUserLookbooks(userId);
      const manualLookbooks = (data || []).filter((lb) => lb.type === 'custom_manual');
      setUserLookbooks(manualLookbooks);
      setLoadingLookbooks(false);
    };

    loadLookbooks();
  }, [selectionMode, userId, userLookbooks.length, loadingLookbooks]);

  const toggleOutfitSelection = useCallback((outfitId: string, imageUrl?: string | null) => {
    setSelectedOutfitIds((prev) => {
      const next = new Set(prev);
      if (next.has(outfitId)) {
        next.delete(outfitId);
      } else {
        next.add(outfitId);
      }
      return next;
    });

    setSelectedOutfitImages((prevImages) => {
      const nextImages = new Map(prevImages);
      if (nextImages.has(outfitId)) {
        nextImages.delete(outfitId);
      } else {
        const existing = prevImages.get(outfitId) ?? null;
        nextImages.set(outfitId, imageUrl !== undefined ? imageUrl : existing);
      }
      return nextImages;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedOutfitIds(new Set());
    setSelectedOutfitImages(new Map());
    setLookbookTitle('');
    setLookbookDescription('');
    setLookbookVisibility('followers');
    setSelectedLookbookId(null);
    setLookbookPickerVisible(false);
  }, []);

  const handleCreateLookbook = useCallback(async () => {
    if (!userId) return;
    if (!lookbookTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for your lookbook');
      return;
    }
    if (selectedOutfitIds.size === 0) {
      Alert.alert('Error', 'Please select at least one outfit');
      return;
    }

    setLookbookSaving(true);
    try {
      const { data: lookbook, error } = await saveLookbook(
        userId,
        {
          title: lookbookTitle.trim(),
          description: lookbookDescription.trim() || undefined,
          visibility: lookbookVisibility,
          type: 'custom_manual',
        },
        Array.from(selectedOutfitIds)
      );

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Lookbook created');
      exitSelectionMode();
      if (lookbook?.id) {
        onNavigateToLookbook(lookbook.id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create lookbook');
    } finally {
      setLookbookSaving(false);
    }
  }, [
    exitSelectionMode,
    lookbookDescription,
    lookbookTitle,
    lookbookVisibility,
    onNavigateToLookbook,
    selectedOutfitIds,
    userId,
  ]);

  const handleAddToExistingLookbook = useCallback(async () => {
    if (!userId || !selectedLookbookId) return;
    if (selectedOutfitIds.size === 0) {
      Alert.alert('Error', 'Please select at least one outfit');
      return;
    }

    setLookbookSaving(true);
    try {
      const { data } = await getLookbook(selectedLookbookId);
      if (!data) {
        throw new Error('Lookbook not found');
      }

      const existingOutfitIds = (data.outfits || []).map((o: any) => o.outfit_id);
      const mergedOutfitIds = Array.from(
        new Set([...existingOutfitIds, ...Array.from(selectedOutfitIds)])
      );

      const { error } = await saveLookbook(
        userId,
        {
          id: data.lookbook.id,
          title: data.lookbook.title,
          description: data.lookbook.description,
          visibility:
            data.lookbook.visibility === 'inherit' ? 'followers' : data.lookbook.visibility,
          type: data.lookbook.type,
        },
        mergedOutfitIds
      );

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Outfits added to lookbook');
      exitSelectionMode();
      onNavigateToLookbook(data.lookbook.id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update lookbook');
    } finally {
      setLookbookSaving(false);
    }
  }, [exitSelectionMode, onNavigateToLookbook, selectedLookbookId, selectedOutfitIds, userId]);

  return {
    selectionMode,
    setSelectionMode,
    selectedOutfitIds,
    selectedOutfitImages,
    toggleOutfitSelection,
    exitSelectionMode,
    lookbookTitle,
    setLookbookTitle,
    lookbookDescription,
    setLookbookDescription,
    lookbookVisibility,
    setLookbookVisibility,
    lookbookSaving,
    lookbookPickerVisible,
    setLookbookPickerVisible,
    selectedLookbookId,
    setSelectedLookbookId,
    userLookbooks,
    loadingLookbooks,
    handleCreateLookbook,
    handleAddToExistingLookbook,
  };
}
