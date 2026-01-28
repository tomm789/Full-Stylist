/**
 * useWardrobeItemEdit Hook
 * Manage wardrobe item editing with form state and AI polling
 */

import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  getWardrobeItem,
  getWardrobeCategories,
  getSubcategories,
  WardrobeItem,
  WardrobeCategory,
  WardrobeSubcategory,
} from '@/lib/wardrobe';
import { getEntityAttributes } from '@/lib/attributes';
import { supabase } from '@/lib/supabase';

interface UseWardrobeItemEditProps {
  itemId: string | undefined;
  userId: string | undefined;
}

interface UseWardrobeItemEditReturn {
  item: WardrobeItem | null;
  title: string;
  description: string;
  brand: string;
  size: string;
  categories: WardrobeCategory[];
  selectedCategoryId: string;
  subcategories: WardrobeSubcategory[];
  selectedSubcategoryId: string;
  visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  loading: boolean;
  aiGenerationComplete: boolean;
  categoriesExpanded: boolean;
  subcategoriesExpanded: boolean;
  visibilityExpanded: boolean;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setBrand: (brand: string) => void;
  setSize: (size: string) => void;
  setSelectedCategoryId: (categoryId: string) => void;
  setSelectedSubcategoryId: (subcategoryId: string) => void;
  setVisibility: (visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit') => void;
  setCategoriesExpanded: (expanded: boolean) => void;
  setSubcategoriesExpanded: (expanded: boolean) => void;
  setVisibilityExpanded: (expanded: boolean) => void;
  saveItem: () => Promise<void>;
  refreshItem: () => Promise<void>;
}

export function useWardrobeItemEdit({
  itemId,
  userId,
}: UseWardrobeItemEditProps): UseWardrobeItemEditReturn {
  const router = useRouter();
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState<string>('');
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [subcategories, setSubcategories] = useState<WardrobeSubcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [visibility, setVisibility] = useState<
    'public' | 'followers' | 'private_link' | 'private' | 'inherit'
  >('inherit');
  const [loading, setLoading] = useState(true);
  const [aiGenerationComplete, setAiGenerationComplete] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [subcategoriesExpanded, setSubcategoriesExpanded] = useState(false);
  const [visibilityExpanded, setVisibilityExpanded] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) return;
    const { data } = await getSubcategories(categoryId);
    if (data) {
      setSubcategories(data);
    }
  };

  const startPollingForAICompletion = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!itemId || !userId) return;

      try {
        const { data: refreshedItem } = await getWardrobeItem(itemId);
        const { data: itemAttributes } = await getEntityAttributes(
          'wardrobe_item',
          itemId
        );

        if (refreshedItem && itemAttributes) {
          const hasAiAttributes = itemAttributes.some(
            (attr: any) => attr.source === 'ai'
          );
          const titleIsGenerated =
            refreshedItem.title && refreshedItem.title !== 'New Item';
          const isComplete = hasAiAttributes || titleIsGenerated;

          if (isComplete) {
            setAiGenerationComplete(true);
            setItem(refreshedItem);
            setTitle(refreshedItem.title || '');
            setDescription(refreshedItem.description || '');
            setSelectedCategoryId(refreshedItem.category_id || '');
            setSelectedSubcategoryId(refreshedItem.subcategory_id || '');
            setCategoriesExpanded(false);
            setSubcategoriesExpanded(false);

            if (refreshedItem.category_id) {
              await loadSubcategories(refreshedItem.category_id);
            }

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Error polling for AI completion:', error);
      }
    }, 2000);

    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }, 120000);
  };

  const initialize = async () => {
    if (!userId || !itemId) return;

    setLoading(true);

    try {
      const { data: categoriesData } = await getWardrobeCategories();
      if (categoriesData) {
        setCategories(categoriesData);
      }

      const { data: foundItem, error: itemError } = await getWardrobeItem(itemId);
      if (itemError) throw itemError;

      if (foundItem) {
        setItem(foundItem);
        setTitle(foundItem?.title || '');
        setDescription(foundItem.description || '');
        setBrand(foundItem.brand || '');
        setVisibility(foundItem.visibility_override || 'inherit');

        if (foundItem.size) {
          if (typeof foundItem.size === 'string') {
            setSize(foundItem.size);
          } else if (typeof foundItem.size === 'object' && foundItem.size !== null) {
            if (Array.isArray(foundItem.size)) {
              setSize(foundItem.size.join(', '));
            } else {
              const values = Object.values(foundItem.size);
              setSize(values.length > 0 ? String(values[0]) : '');
            }
          } else {
            setSize(String(foundItem.size));
          }
        } else {
          setSize('');
        }

        setCategoriesExpanded(!foundItem?.category_id);
        setSubcategoriesExpanded(!foundItem?.subcategory_id);
        setVisibilityExpanded(false);

        const { data: itemAttributes } = await getEntityAttributes(
          'wardrobe_item',
          itemId
        );

        const titleIsGenerated =
          foundItem?.title && foundItem?.title !== 'New Item';
        const hasAiAttributes =
          itemAttributes?.some((attr: any) => attr.source === 'ai') || false;
        const isComplete = titleIsGenerated || hasAiAttributes;

        setAiGenerationComplete(isComplete);

        if (isComplete) {
          setSelectedCategoryId(foundItem?.category_id || '');
          setSelectedSubcategoryId(foundItem?.subcategory_id || '');

          if (foundItem?.category_id) {
            await loadSubcategories(foundItem.category_id);
            setCategoriesExpanded(false);
            if (foundItem?.subcategory_id) {
              setSubcategoriesExpanded(false);
            }
          }
        } else {
          setSelectedCategoryId('');
          setSelectedSubcategoryId('');
          startPollingForAICompletion();
        }
      } else {
        Alert.alert('Error', 'Item not found');
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load item');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async () => {
    if (!itemId || !userId || !item) return;

    try {
      const updateData: any = {
        title: title.trim() || item.title,
        description: description.trim() || null,
        brand: brand.trim() || null,
        visibility_override: visibility === 'inherit' ? null : visibility,
      };

      if (selectedCategoryId) {
        updateData.category_id = selectedCategoryId;
      } else {
        updateData.category_id = null;
      }

      if (selectedSubcategoryId) {
        updateData.subcategory_id = selectedSubcategoryId;
      } else {
        updateData.subcategory_id = null;
      }

      if (size.trim()) {
        updateData.size = size.trim();
      }

      const { error } = await supabase
        .from('wardrobe_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('owner_user_id', userId);

      if (error) throw error;

      Alert.alert('Success', 'Item updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save item');
    }
  };

  const refreshItem = async () => {
    await initialize();
  };

  useEffect(() => {
    if (itemId && userId) {
      initialize();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [itemId, userId]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
      setCategoriesExpanded(false);
    } else {
      setSubcategories([]);
      setSelectedSubcategoryId('');
      setSubcategoriesExpanded(false);
    }
  }, [selectedCategoryId]);

  return {
    item,
    title,
    description,
    brand,
    size,
    categories,
    selectedCategoryId,
    subcategories,
    selectedSubcategoryId,
    visibility,
    loading,
    aiGenerationComplete,
    categoriesExpanded,
    subcategoriesExpanded,
    visibilityExpanded,
    setTitle,
    setDescription,
    setBrand,
    setSize,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    setVisibility,
    setCategoriesExpanded,
    setSubcategoriesExpanded,
    setVisibilityExpanded,
    saveItem,
    refreshItem,
  };
}
