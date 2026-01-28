/**
 * useNewLookbook Hook
 * Form state and handlers for creating a new lookbook
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { saveLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

type LookbookType = 'custom_manual' | 'custom_filter';

interface UseNewLookbookReturn {
  // Form state
  title: string;
  description: string;
  type: LookbookType;
  visibility: 'public' | 'followers' | 'private_link';
  selectedOutfits: Set<string>;
  filterDefinition: any;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setType: (type: LookbookType) => void;
  setVisibility: (visibility: 'public' | 'followers' | 'private_link') => void;
  setFilterDefinition: (filterDef: any) => void;

  // Outfits
  outfits: any[];
  outfitImageUrls: Map<string, string | null>;
  loading: boolean;
  toggleOutfit: (outfitId: string) => void;

  // Actions
  saving: boolean;
  handleCreate: () => Promise<void>;
  loadOutfits: () => Promise<void>;
}

export function useNewLookbook(): UseNewLookbookReturn {
  const router = useRouter();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<LookbookType>('custom_manual');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private_link'>('followers');
  const [selectedOutfits, setSelectedOutfits] = useState<Set<string>>(new Set());
  const [filterDefinition, setFilterDefinition] = useState<any>({});

  // Outfits
  const [outfits, setOutfits] = useState<any[]>([]);
  const [outfitImageUrls, setOutfitImageUrls] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);

  // Actions
  const [saving, setSaving] = useState(false);

  const loadOutfits = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data: userOutfits } = await getUserOutfits(user.id);
    if (userOutfits) {
      setOutfits(userOutfits);

      // Pre-load all outfit images
      const imageUrlMap = new Map<string, string | null>();
      await Promise.all(
        userOutfits.map(async (outfit: any) => {
          const url = await getOutfitCoverImageUrl(outfit);
          imageUrlMap.set(outfit.id, url);
        })
      );
      setOutfitImageUrls(imageUrlMap);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadOutfits();
    }
  }, [user, loadOutfits]);

  const toggleOutfit = useCallback((outfitId: string) => {
    setSelectedOutfits((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(outfitId)) {
        newSelected.delete(outfitId);
      } else {
        newSelected.add(outfitId);
      }
      return newSelected;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your lookbook');
      return;
    }

    if (type === 'custom_manual' && selectedOutfits.size === 0) {
      Alert.alert('Error', 'Please select at least one outfit for your lookbook');
      return;
    }

    setSaving(true);

    try {
      const lookbookData = {
        title: title.trim(),
        description: description.trim() || undefined,
        visibility: visibility,
        type: type,
        filter_definition: type === 'custom_filter' ? filterDefinition : undefined,
      };

      const outfitIds = type === 'custom_manual' ? Array.from(selectedOutfits) : undefined;

      const { data: lookbook, error } = await saveLookbook(user.id, lookbookData, outfitIds);

      if (error) {
        throw error;
      }

      // Navigate directly to the lookbook editor
      if (lookbook?.id) {
        router.replace(`/lookbooks/${lookbook.id}`);
      } else {
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to create lookbook: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  }, [user, title, description, type, visibility, selectedOutfits, filterDefinition, router]);

  return {
    // Form state
    title,
    description,
    type,
    visibility,
    selectedOutfits,
    filterDefinition,
    setTitle,
    setDescription,
    setType,
    setVisibility,
    setFilterDefinition,

    // Outfits
    outfits,
    outfitImageUrls,
    loading,
    toggleOutfit,

    // Actions
    saving,
    handleCreate,
    loadOutfits,
  };
}
