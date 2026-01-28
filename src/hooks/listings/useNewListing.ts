/**
 * useNewListing Hook
 * Form state and handlers for creating a new listing
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { createListing } from '@/lib/listings';
import {
  getWardrobeItems,
  getWardrobeItemImages,
  getDefaultWardrobeId,
  WardrobeItem,
} from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

interface UseNewListingReturn {
  // Data
  items: WardrobeItem[];
  loading: boolean;
  selectedItem: WardrobeItem | null;
  itemImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  selectedImageIds: Set<string>;
  price: string;
  condition: 'new' | 'like_new' | 'good' | 'worn';

  // Setters
  setSelectedItem: (item: WardrobeItem | null) => void;
  setPrice: (price: string) => void;
  setCondition: (condition: 'new' | 'like_new' | 'good' | 'worn') => void;
  toggleImage: (imageId: string) => void;

  // Actions
  saving: boolean;
  handleCreate: () => Promise<void>;
  loadWardrobe: () => Promise<void>;
  selectItem: (item: WardrobeItem) => Promise<void>;
  getImageUrl: (imageData: any) => string | null;
}

export function useNewListing(): UseNewListingReturn {
  const router = useRouter();
  const { user } = useAuth();

  const [wardrobeId, setWardrobeId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [itemImages, setItemImages] = useState<
    Array<{ id: string; image_id: string; type: string; image: any }>
  >([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'worn'>('good');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadWardrobe = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data: defaultWardrobeId } = await getDefaultWardrobeId(user.id);
    if (defaultWardrobeId) {
      setWardrobeId(defaultWardrobeId);
      const { data: wardrobeItems } = await getWardrobeItems(defaultWardrobeId, {});
      if (wardrobeItems) {
        setItems(wardrobeItems);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWardrobe();
    }
  }, [user, loadWardrobe]);

  const selectItem = useCallback(async (item: WardrobeItem) => {
    setSelectedItem(item);
    const { data: images } = await getWardrobeItemImages(item.id);
    if (images) {
      // Filter to only original images
      const originalImages = images.filter((img) => img.type === 'original');
      setItemImages(originalImages);
      // Auto-select all original images
      setSelectedImageIds(new Set(originalImages.map((img) => img.image_id)));
    }
  }, []);

  const toggleImage = useCallback((imageId: string) => {
    setSelectedImageIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId);
      } else {
        newSelected.add(imageId);
      }
      return newSelected;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!user || !selectedItem) return;

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (selectedImageIds.size === 0) {
      Alert.alert('Error', 'Please select at least one original image');
      return;
    }

    setSaving(true);

    try {
      const { data: listing, error } = await createListing(user.id, selectedItem.id, {
        price: parseFloat(price),
        currency: 'AUD',
        condition: condition,
        imageIds: Array.from(selectedImageIds),
      });

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Listing created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', `Failed to create listing: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  }, [user, selectedItem, price, condition, selectedImageIds, router]);

  const getImageUrl = useCallback((imageData: any): string | null => {
    if (!imageData) return null;
    const { data: urlData } = supabase.storage
      .from(imageData.storage_bucket || 'media')
      .getPublicUrl(imageData.storage_key);
    return urlData.publicUrl;
  }, []);

  return {
    // Data
    items,
    loading,
    selectedItem,
    itemImages,
    selectedImageIds,
    price,
    condition,

    // Setters
    setSelectedItem,
    setPrice,
    setCondition,
    toggleImage,

    // Actions
    saving,
    handleCreate,
    loadWardrobe,
    selectItem,
    getImageUrl,
  };
}
