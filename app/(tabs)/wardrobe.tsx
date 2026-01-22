import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDefaultWardrobeId,
  getWardrobeCategories,
  getWardrobeItems,
  getWardrobeItemImages,
  getWardrobeItemsImages,
  getSubcategories,
  repairWardrobeItemImageLinks,
  getSavedWardrobeItems,
  WardrobeCategory,
  WardrobeSubcategory,
  WardrobeItem,
} from '@/lib/wardrobe';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface FilterState {
  subcategoryId: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  season: string | null;
  tagIds: string[];
  favorites: boolean | null;
  showSavedItemsOnly: boolean | null;
}

export default function WardrobeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [wardrobeId, setWardrobeId] = useState<string | null>(null);
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [subcategories, setSubcategories] = useState<WardrobeSubcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [allItems, setAllItems] = useState<WardrobeItem[]>([]);
  const [itemImagesCache, setItemImagesCache] = useState<Map<string, string | null>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<FilterState>({
    subcategoryId: null,
    color: null,
    material: null,
    size: null,
    season: null,
    tagIds: [],
    favorites: null,
    showSavedItemsOnly: null,
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Outfit creator mode state
  const [outfitCreatorMode, setOutfitCreatorMode] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<string[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    if (user && !isLoadingWardrobe) {
      loadWardrobe();
    }
  }, [user]);

  // Reload items when page comes into focus (e.g., after deleting an item)
  useFocusEffect(
    React.useCallback(() => {
      if (wardrobeId) {
        loadItems();
        loadTags();
      }
    }, [wardrobeId])
  );

  useEffect(() => {
    if (wardrobeId && items.length > 0 && user) {
      // Check migration status once after items are loaded
      checkMigrationStatus();
      // Auto-repair disabled for performance - images are now batch loaded
      // autoRepairMissingLinks();
    }
  }, [wardrobeId, items, user]);

  const autoRepairMissingLinks = async () => {
    
    // Only run once per session
    if ((window as any).__wardrobeAutoRepairRun) {
      return;
    }
    (window as any).__wardrobeAutoRepairRun = true;

    if (!user) return;

    try {
      // Check if any items are missing images by trying to get images for first few items
      const itemsToCheck = items.slice(0, 3);
      let itemsWithoutImages = 0;
      
      for (const item of itemsToCheck) {
        const { data: images } = await getWardrobeItemImages(item.id);
        if (!images || images.length === 0) {
          itemsWithoutImages++;
        }
      }

      // If we found items without images, trigger repair
      if (itemsWithoutImages > 0) {
        const { data: repairResult, error: repairError } = await repairWardrobeItemImageLinks(user.id);
        if (!repairError && repairResult && repairResult.repaired > 0) {
          // Reload items to refresh the UI
          loadItems();
        }
      }
      
    } catch (error: any) {
      console.error('[WardrobeScreen] Error in auto-repair:', error);
    }
  };

  const checkMigrationStatus = async () => {
    // Check migration status only once per session
    if ((window as any).__wardrobeMigrationChecked) {
      return;
    }
    (window as any).__wardrobeMigrationChecked = true;

    // Try to check if the migration has been applied by querying for images
    // through wardrobe_item_images join
    try {
      if (items && items.length > 0) {
        // Try to get images for the first item to test if migration is working
        const testItemId = items[0].id;
        const { data: testImages } = await getWardrobeItemImages(testItemId);
        
        if (testImages && testImages.length > 0 && testImages[0].image === null) {
          console.warn('[WardrobeScreen] ⚠️  Migration 0008_fix_images_rls_for_wardrobe_items.sql may not be applied. Image data is inaccessible.');
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    if (wardrobeId) {
      loadItems();
      loadTags();
    }
  }, [wardrobeId, selectedCategoryId, searchQuery]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  // Use useMemo to avoid recalculating filters on every render
  const filteredItems = useMemo(() => {
    let filtered = [...allItems];

    // Subcategory filter
    if (filters.subcategoryId) {
      filtered = filtered.filter((item) => item.subcategory_id === filters.subcategoryId);
    }

    // Color filter
    if (filters.color) {
      const filterColor = filters.color.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.color_primary?.toLowerCase() === filterColor ||
          (item.color_palette &&
            typeof item.color_palette === 'object' &&
            JSON.stringify(item.color_palette).toLowerCase().includes(filterColor))
      );
    }

    // Material filter (JSON field - client-side)
    if (filters.material) {
      filtered = filtered.filter((item) => {
        if (!item.material) return false;
        const materialStr =
          typeof item.material === 'string'
            ? item.material
            : JSON.stringify(item.material);
        return materialStr.toLowerCase().includes(filters.material!.toLowerCase());
      });
    }

    // Size filter (JSON field - client-side)
    if (filters.size) {
      filtered = filtered.filter((item) => {
        if (!item.size) return false;
        const sizeStr = typeof item.size === 'string' ? item.size : JSON.stringify(item.size);
        return sizeStr.toLowerCase().includes(filters.size!.toLowerCase());
      });
    }

    // Season filter (JSON field - client-side)
    if (filters.season) {
      filtered = filtered.filter((item) => {
        if (!item.seasonality) return false;
        const seasonStr =
          typeof item.seasonality === 'string'
            ? item.seasonality
            : JSON.stringify(item.seasonality);
        return seasonStr.toLowerCase().includes(filters.season!.toLowerCase());
      });
    }

    // Favorites filter
    if (filters.favorites !== null) {
      filtered = filtered.filter((item) => item.is_favorite === filters.favorites);
    }

    // Show only saved items from friends' wardrobes
    if (filters.showSavedItemsOnly === true && user) {
      filtered = filtered.filter((item) => item.owner_user_id !== user.id);
    }

    // Tags filter (will need to load tag links for items)
    if (filters.tagIds.length > 0) {
      // For MVP, we'll need to load tag links for all items and filter
      // This can be optimized later
      filtered = filtered.filter((item) => {
        // Simplified - in production, would need to check tag_links table
        return true; // Placeholder - requires additional query
      });
    }

    
    return filtered;
  }, [allItems, filters]);
  
  // Update items when filtered results change
  useEffect(() => {
    setItems(filteredItems);
  }, [filteredItems]);

  const loadWardrobe = async () => {
    if (!user || isLoadingWardrobe) return;

    setIsLoadingWardrobe(true);
    setLoading(true);
    
    const { data: defaultWardrobeId, error: wardrobeError } = await getDefaultWardrobeId(user.id);
    if (wardrobeError || !defaultWardrobeId) {
      setLoading(false);
      setIsLoadingWardrobe(false);
      return;
    }
    
    setWardrobeId(defaultWardrobeId);

    const { data: categoriesData, error: categoriesError } = await getWardrobeCategories();
    if (!categoriesError) {
      setCategories(categoriesData);
    }

    setLoading(false);
    setIsLoadingWardrobe(false);
  };

  const loadSubcategories = async (categoryId: string) => {
    const { data: subs } = await getSubcategories(categoryId);
    if (subs) {
      setSubcategories(subs);
    }
  };

  const loadTags = async () => {
    if (!user || !wardrobeId) return;

    // Get all tags used in this wardrobe
    const { data: tagLinks } = await supabase
      .from('tag_links')
      .select('tag_id, tags(id, name)')
      .eq('entity_type', 'wardrobe_item')
      .in('entity_id', allItems.map((i) => i.id));

    if (tagLinks) {
      const uniqueTags = new Map<string, { id: string; name: string }>();
      tagLinks.forEach((link: any) => {
        if (link.tags) {
          uniqueTags.set(link.tags.id, { id: link.tags.id, name: link.tags.name });
        }
      });
      setAvailableTags(Array.from(uniqueTags.values()));
    }
  };

  const loadItems = async () => {
    if (!wardrobeId || isLoadingItems || !user) return;

    setIsLoadingItems(true);
    setLoading(true);
    
    // Load owned items
    const { data: ownedItems, error: ownedError } = await getWardrobeItems(wardrobeId, {
      category_id: selectedCategoryId || undefined,
      search: searchQuery || undefined,
    });

    // Load saved items from other users
    const { data: savedItems, error: savedError } = await getSavedWardrobeItems(user.id, {
      category_id: selectedCategoryId || undefined,
      search: searchQuery || undefined,
    });

    // Combine owned and saved items
    const allItemsData = [
      ...(ownedItems || []),
      ...(savedItems || []),
    ];

    if (!ownedError && !savedError) {
      setAllItems(allItemsData);
      
      // Batch load all images at once
      if (allItemsData.length > 0) {
        const itemIds = allItemsData.map(item => item.id);
        const { data: imagesMap } = await getWardrobeItemsImages(itemIds);
        
        // Build URL cache
        const newCache = new Map<string, string | null>();
        for (const itemId of itemIds) {
          const images = imagesMap.get(itemId);
          if (images && images.length > 0 && images[0].image?.storage_key) {
            const storageBucket = images[0].image.storage_bucket || 'media';
            const { data: urlData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(images[0].image.storage_key);
            newCache.set(itemId, urlData?.publicUrl || null);
          } else {
            newCache.set(itemId, null);
          }
        }
        setItemImagesCache(newCache);
      }
    } else if (!ownedError && !savedError) {
      setAllItems(allItemsData);
    }

    setLoading(false);
    setIsLoadingItems(false);
  };

  // Removed applyFilters - now using useMemo above

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const getItemImageUrl = async (itemId: string): Promise<string | null> => {
    try {
      const { data, error } = await getWardrobeItemImages(itemId);
      
      if (error) {
        console.error(`[Wardrobe] Failed to get images for item ${itemId}:`, error.message);
        return null;
      }

      if (!data || data.length === 0) {
        // Already logged in getWardrobeItemImages
        return null;
      }

      const imageData = data[0].image;
      if (!imageData) {
        // Already logged in getWardrobeItemImages as NULL
        return null;
      }

      if (!imageData.storage_key) {
        // Already logged in getWardrobeItemImages
        return null;
      }

      const storageBucket = imageData.storage_bucket || 'media';
      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(imageData.storage_key);

      if (!urlData?.publicUrl) {
        console.warn(`[Wardrobe] Failed to generate URL for item ${itemId}, key: ${imageData.storage_key}`);
        return null;
      }

      return urlData.publicUrl;
    } catch (error: any) {
      console.error(`[Wardrobe] Exception getting image URL for item ${itemId}:`, error.message);
      return null;
    }
  };

  // Memoize available values to avoid recalculating on every render
  const availableColors = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.color_primary) values.add(item.color_primary);
    });
    return Array.from(values).filter((v) => v).slice(0, 20);
  }, [allItems]);

  const availableMaterials = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.material) {
        const str = typeof item.material === 'string' ? item.material : JSON.stringify(item.material);
        if (str) values.add(str);
      }
    });
    return Array.from(values).filter((v) => v).slice(0, 10);
  }, [allItems]);

  const availableSizes = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.size) {
        const str = typeof item.size === 'string' ? item.size : JSON.stringify(item.size);
        if (str) values.add(str);
      }
    });
    return Array.from(values).filter((v) => v).slice(0, 10);
  }, [allItems]);

  const availableSeasons = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.seasonality) {
        const str = typeof item.seasonality === 'string' ? item.seasonality : JSON.stringify(item.seasonality);
        if (str) values.add(str);
      }
    });
    return Array.from(values).filter((v) => v).slice(0, 10);
  }, [allItems]);

  const clearFilters = () => {
    setFilters({
      subcategoryId: null,
      color: null,
      material: null,
      size: null,
      season: null,
      tagIds: [],
      favorites: null,
      showSavedItemsOnly: null,
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.subcategoryId !== null ||
      filters.color !== null ||
      filters.material !== null ||
      filters.size !== null ||
      filters.season !== null ||
      filters.tagIds.length > 0 ||
      filters.favorites !== null ||
      filters.showSavedItemsOnly === true
    );
  };

  const getActiveFilters = () => {
    const active: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (filters.subcategoryId) {
      const subcategory = subcategories.find(s => s.id === filters.subcategoryId);
      if (subcategory) {
        active.push({
          key: 'subcategory',
          label: subcategory.name,
          onClear: () => setFilters({ ...filters, subcategoryId: null }),
        });
      }
    }

    if (filters.color) {
      active.push({
        key: 'color',
        label: `Color: ${filters.color}`,
        onClear: () => setFilters({ ...filters, color: null }),
      });
    }

    if (filters.material) {
      active.push({
        key: 'material',
        label: `Material: ${filters.material}`,
        onClear: () => setFilters({ ...filters, material: null }),
      });
    }

    if (filters.size) {
      active.push({
        key: 'size',
        label: `Size: ${filters.size}`,
        onClear: () => setFilters({ ...filters, size: null }),
      });
    }

    if (filters.season) {
      active.push({
        key: 'season',
        label: `Season: ${filters.season}`,
        onClear: () => setFilters({ ...filters, season: null }),
      });
    }

    if (filters.tagIds.length > 0) {
      filters.tagIds.forEach(tagId => {
        const tag = availableTags.find(t => t.id === tagId);
        if (tag) {
          active.push({
            key: `tag-${tagId}`,
            label: tag.name,
            onClear: () => setFilters({ 
              ...filters, 
              tagIds: filters.tagIds.filter(id => id !== tagId) 
            }),
          });
        }
      });
    }

    if (filters.favorites !== null) {
      active.push({
        key: 'favorites',
        label: 'Favorites',
        onClear: () => setFilters({ ...filters, favorites: null }),
      });
    }

    if (filters.showSavedItemsOnly === true) {
      active.push({
        key: 'savedItems',
        label: "Friends' Wardrobes",
        onClear: () => setFilters({ ...filters, showSavedItemsOnly: null }),
      });
    }

    return active;
  };

  const toggleFavorite = async (itemId: string, currentFavoriteStatus: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ is_favorite: !currentFavoriteStatus })
        .eq('id', itemId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      // Update local state
      setAllItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, is_favorite: !currentFavoriteStatus } : item
        )
      );
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const toggleOutfitItemSelection = (itemId: string) => {
    setSelectedOutfitItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const exitOutfitCreatorMode = () => {
    setOutfitCreatorMode(false);
    setSelectedOutfitItems([]);
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  const handleGenerateOutfit = async () => {
    
    if (!user || selectedOutfitItems.length === 0) {
      alert('Please select items for your outfit');
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationStatus('Generating Outfit...\nThis may take 60-90 seconds');

      // Import required functions
      const { saveOutfit } = await import('@/lib/outfits');
      const { createAIJob, triggerAIJobExecution, pollAIJob } = await import('@/lib/ai-jobs');
      
      const selectedItems = items.filter(item => selectedOutfitItems.includes(item.id));
      const selectedItemInfo = selectedItems.map(i => ({
        id: i.id,
        title: i.title,
        owner_user_id: i.owner_user_id,
        isOwnItem: i.owner_user_id === user.id
      }));
      console.log('[Wardrobe] Selected items for outfit:', JSON.stringify(selectedItemInfo, null, 2));
      
      const outfitItems = selectedItems.map((item, index) => ({
        category_id: item.category_id,
        wardrobe_item_id: item.id,
        position: index,
      }));

      // Save the outfit first to get an outfit_id
      const { data: savedOutfit, error: saveError } = await saveOutfit(
        user.id,
        {
          title: `Outfit ${new Date().toLocaleDateString()}`,
          visibility: 'private',
        },
        outfitItems
      );
      
      if (saveError || !savedOutfit?.outfit?.id) {
        throw new Error(saveError?.message || 'Failed to save outfit');
      }

      const outfitId = savedOutfit.outfit.id;

      // Create outfit_render job with selected items
      const selected = selectedItems.map((item) => ({
        category: categories.find((c) => c.id === item.category_id)?.name || '',
        wardrobe_item_id: item.id,
      }));
      
      console.log('[Wardrobe] Creating outfit render job with item IDs:', JSON.stringify(selected.map(s => s.wardrobe_item_id), null, 2));

      const { data: renderJob, error: jobError } = await createAIJob(user.id, 'outfit_render', {
        user_id: user.id,
        outfit_id: outfitId,
        selected,
      });

      if (jobError || !renderJob) {
        throw new Error('Failed to start render job');
      }

      // Trigger the job execution
      await triggerAIJobExecution(renderJob.id);
      
      // Poll for completion (120 attempts = ~10+ minutes with exponential backoff)
      const { data: completedJob, error: pollError } = await pollAIJob(renderJob.id, 120, 2000);
      
      // If polling timed out, do one final check - job might have completed
      let finalJob = completedJob;
      if (pollError || !completedJob) {
        console.log('[Wardrobe] Outfit render polling timed out, doing final check...');
        const { getAIJob } = await import('@/lib/ai-jobs');
        const { data: finalCheck } = await getAIJob(renderJob.id);
        if (finalCheck && (finalCheck.status === 'succeeded' || finalCheck.status === 'failed')) {
          finalJob = finalCheck;
        } else {
          throw new Error('Outfit generation timed out. You can check your outfits later to see if it completed.');
        }
      }
      
      if (finalJob.status === 'failed') {
        throw new Error(`Generation failed: ${finalJob.error || 'Unknown error'}`);
      }

      // Success! Show success message briefly, then navigate
      setGenerationStatus('Success! Loading outfit...');
      
      setTimeout(() => {
        setIsGenerating(false);
        setOutfitCreatorMode(false);
        setSelectedOutfitItems([]);
        router.push(`/outfits/${outfitId}`);
      }, 500);

    } catch (error: any) {
      console.error('Outfit generation error:', error);
      alert(`Failed to generate outfit: ${error.message}`);
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const renderCategoryPill = ({ item }: { item: WardrobeCategory }) => {
    const isSelected = selectedCategoryId === item.id;
    return (
      <TouchableOpacity
        style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
        onPress={() => setSelectedCategoryId(isSelected ? null : item.id)}
      >
        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Item Card Component - Memoized to prevent unnecessary re-renders
  const ItemCard = React.memo(({ item }: { item: WardrobeItem }) => {
    // Use cached image URL instead of querying per item
    const imageUrl = itemImagesCache.get(item.id) || null;
    const imageLoading = !itemImagesCache.has(item.id);

    const handleItemPress = () => {
      if (outfitCreatorMode) {
        // In outfit creator mode, add/remove item from selection
        toggleOutfitItemSelection(item.id);
      } else {
        // Normal mode - navigate to detail page
        const itemIds = items.map(i => i.id).join(',');
        router.push(`/wardrobe/item/${item.id}?itemIds=${itemIds}`);
      }
    };

    const handleItemLongPress = () => {
      // Activate outfit creator mode and select this item
      if (!outfitCreatorMode) {
        setOutfitCreatorMode(true);
        setSelectedOutfitItems([item.id]);
      }
    };

    const handleFavoritePress = (e: any) => {
      e.stopPropagation();
      toggleFavorite(item.id, item.is_favorite || false);
    };

    const isSelectedForOutfit = outfitCreatorMode && selectedOutfitItems.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelectedForOutfit && styles.itemCardSelected]}
        onPress={handleItemPress}
        onLongPress={handleItemLongPress}
        delayLongPress={500}
      >
        {imageLoading ? (
          <View style={styles.itemImagePlaceholder}>
            <ActivityIndicator size="small" />
          </View>
        ) : imageUrl ? (
          <>
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.itemImage}
              contentFit="cover"
            />
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item.is_favorite ? '#ff0000' : '#fff'}
              />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Text style={styles.itemImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  });

  const renderItem = ({ item }: { item: WardrobeItem }) => {
    return <ItemCard item={item} />;
  };

  if (loading && !items.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full Screen Loader */}
      {isGenerating && (
        <View style={styles.fullScreenLoader}>
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loaderText}>{generationStatus}</Text>
          </View>
        </View>
      )}

      {/* Outfit Creator Bar */}
      {outfitCreatorMode && (
        <View style={styles.outfitCreatorBar}>
          <ScrollView 
            horizontal 
            style={styles.selectedItemsScroll}
            showsHorizontalScrollIndicator={false}
          >
            {selectedOutfitItems.map(itemId => {
              const item = items.find(i => i.id === itemId);
              const imageUrl = itemImagesCache.get(itemId) || null;
              if (!item) return null;
              
              return (
                <View key={itemId} style={styles.selectedItemCard}>
                  {imageUrl ? (
                    <ExpoImage
                      source={{ uri: imageUrl }}
                      style={styles.selectedItemImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.selectedItemImagePlaceholder} />
                  )}
                  <TouchableOpacity
                    style={styles.removeItemButton}
                    onPress={() => toggleOutfitItemSelection(itemId)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ff0000" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.exitOutfitModeButton}
            onPress={exitOutfitCreatorMode}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      )}

      {/* Generate Outfit Button */}
      {outfitCreatorMode && selectedOutfitItems.length > 0 && (
        <TouchableOpacity
          style={styles.generateOutfitButton}
          onPress={handleGenerateOutfit}
        >
          <Text style={styles.generateOutfitButtonText}>
            Generate Outfit ({selectedOutfitItems.length} items)
          </Text>
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search wardrobe..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilterDrawer(true)}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color={hasActiveFilters() ? '#fff' : '#666'} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/wardrobe/add')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersList}
          >
            <TouchableOpacity
              onPress={clearFilters}
              style={styles.clearAllFiltersButton}
            >
              <Text style={styles.clearAllFiltersText}>Clear All</Text>
            </TouchableOpacity>
            {getActiveFilters().map(filter => (
              <View key={filter.key} style={styles.activeFilterPill}>
                <Text style={styles.activeFilterText}>{filter.label}</Text>
                <TouchableOpacity
                  onPress={filter.onClear}
                  style={styles.activeFilterClearButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category Pills */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategoryPill}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Subcategory Pills */}
      {selectedCategoryId && subcategories.length > 0 && (
        <View style={styles.subcategoriesContainer}>
          <FlatList
            horizontal
            data={subcategories}
            renderItem={({ item }) => {
              const isSelected = filters.subcategoryId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.subcategoryPill, isSelected && styles.subcategoryPillSelected]}
                  onPress={() => {
                    setFilters({ 
                      ...filters, 
                      subcategoryId: isSelected ? null : item.id 
                    });
                  }}
                >
                  <Text style={[styles.subcategoryPillText, isSelected && styles.subcategoryPillTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesList}
          />
        </View>
      )}

      {/* Items Grid */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery || selectedCategoryId || hasActiveFilters()
              ? 'No items found'
              : 'Your wardrobe is empty'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/wardrobe/add')}
          >
            <Text style={styles.emptyButtonText}>Add your first item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.itemsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Filter Drawer */}
      <Modal
        visible={showFilterDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterDrawer(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterDrawer(false)}>
                <Text style={styles.drawerClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent}>
              {/* Favorites Toggle */}
              <View style={styles.favoritesSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Show only favourites</Text>
                  <Switch
                    value={filters.favorites === true}
                    onValueChange={(value) =>
                      setFilters({ ...filters, favorites: value ? true : null })
                    }
                  />
                </View>
              </View>

              {/* Friends' Wardrobes Toggle */}
              <View style={styles.favoritesSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Show only friends' wardrobes</Text>
                  <Switch
                    value={filters.showSavedItemsOnly === true}
                    onValueChange={(value) =>
                      setFilters({ ...filters, showSavedItemsOnly: value ? true : null })
                    }
                  />
                </View>
              </View>

              {/* Subcategory Filter */}
              {selectedCategoryId && subcategories.length > 0 && (
                <View style={styles.filterSection}>
                  <TouchableOpacity 
                    style={styles.accordionHeader}
                    onPress={() => toggleSection('subcategory')}
                  >
                    <Text style={styles.filterLabel}>Subcategory</Text>
                    <Ionicons 
                      name={expandedSections.has('subcategory') ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#333" 
                    />
                  </TouchableOpacity>
                  {expandedSections.has('subcategory') && (
                    <View style={styles.accordionContent}>
                      <View style={styles.optionsList}>
                    <Pressable
                      style={[
                        styles.optionPill,
                        filters.subcategoryId === null && styles.optionPillSelected,
                      ]}
                      onPress={() => setFilters({ ...filters, subcategoryId: null })}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          filters.subcategoryId === null && styles.optionPillTextSelected,
                        ]}
                      >
                        All
                      </Text>
                    </Pressable>
                    {subcategories.map((sub) => (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.optionPill,
                          filters.subcategoryId === sub.id && styles.optionPillSelected,
                        ]}
                        onPress={() =>
                          setFilters({ ...filters, subcategoryId: sub.id })
                        }
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            filters.subcategoryId === sub.id && styles.optionPillTextSelected,
                          ]}
                        >
                          {sub.name}
                        </Text>
                      </Pressable>
                    ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Color Filter */}
              <View style={styles.filterSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader}
                  onPress={() => toggleSection('color')}
                >
                  <Text style={styles.filterLabel}>Color</Text>
                  <Ionicons 
                    name={expandedSections.has('color') ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#333" 
                  />
                </TouchableOpacity>
                {expandedSections.has('color') && (
                  <View style={styles.accordionContent}>
                    <View style={styles.optionsList}>
                  <Pressable
                    style={[
                      styles.optionPill,
                      filters.color === null && styles.optionPillSelected,
                    ]}
                    onPress={() => setFilters({ ...filters, color: null })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        filters.color === null && styles.optionPillTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {availableColors.map((color) => (
                    <Pressable
                      key={color}
                      style={[
                        styles.optionPill,
                        filters.color === color && styles.optionPillSelected,
                      ]}
                      onPress={() =>
                        setFilters({ ...filters, color: color === filters.color ? null : color })
                      }
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          filters.color === color && styles.optionPillTextSelected,
                        ]}
                      >
                        {color}
                      </Text>
                    </Pressable>
                  ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Material Filter */}
              <View style={styles.filterSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader}
                  onPress={() => toggleSection('material')}
                >
                  <Text style={styles.filterLabel}>Material</Text>
                  <Ionicons 
                    name={expandedSections.has('material') ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#333" 
                  />
                </TouchableOpacity>
                {expandedSections.has('material') && (
                  <View style={styles.accordionContent}>
                    <View style={styles.optionsList}>
                  <Pressable
                    style={[
                      styles.optionPill,
                      filters.material === null && styles.optionPillSelected,
                    ]}
                    onPress={() => setFilters({ ...filters, material: null })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        filters.material === null && styles.optionPillTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {availableMaterials.map((material) => (
                    <Pressable
                      key={material}
                      style={[
                        styles.optionPill,
                        filters.material === material && styles.optionPillSelected,
                      ]}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          material: material === filters.material ? null : material,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          filters.material === material && styles.optionPillTextSelected,
                        ]}
                      >
                        {material.length > 20 ? `${material.substring(0, 20)}...` : material}
                      </Text>
                    </Pressable>
                  ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Size Filter */}
              <View style={styles.filterSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader}
                  onPress={() => toggleSection('size')}
                >
                  <Text style={styles.filterLabel}>Size</Text>
                  <Ionicons 
                    name={expandedSections.has('size') ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#333" 
                  />
                </TouchableOpacity>
                {expandedSections.has('size') && (
                  <View style={styles.accordionContent}>
                    <View style={styles.optionsList}>
                  <Pressable
                    style={[
                      styles.optionPill,
                      filters.size === null && styles.optionPillSelected,
                    ]}
                    onPress={() => setFilters({ ...filters, size: null })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        filters.size === null && styles.optionPillTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {availableSizes.map((size) => (
                    <Pressable
                      key={size}
                      style={[
                        styles.optionPill,
                        filters.size === size && styles.optionPillSelected,
                      ]}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          size: size === filters.size ? null : size,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          filters.size === size && styles.optionPillTextSelected,
                        ]}
                      >
                        {size.length > 20 ? `${size.substring(0, 20)}...` : size}
                      </Text>
                    </Pressable>
                  ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Season Filter */}
              <View style={styles.filterSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader}
                  onPress={() => toggleSection('season')}
                >
                  <Text style={styles.filterLabel}>Season</Text>
                  <Ionicons 
                    name={expandedSections.has('season') ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#333" 
                  />
                </TouchableOpacity>
                {expandedSections.has('season') && (
                  <View style={styles.accordionContent}>
                    <View style={styles.optionsList}>
                  <Pressable
                    style={[
                      styles.optionPill,
                      filters.season === null && styles.optionPillSelected,
                    ]}
                    onPress={() => setFilters({ ...filters, season: null })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        filters.season === null && styles.optionPillTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {availableSeasons.map((season) => (
                    <Pressable
                      key={season}
                      style={[
                        styles.optionPill,
                        filters.season === season && styles.optionPillSelected,
                      ]}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          season: season === filters.season ? null : season,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          filters.season === season && styles.optionPillTextSelected,
                        ]}
                      >
                        {season.length > 20 ? `${season.substring(0, 20)}...` : season}
                      </Text>
                    </Pressable>
                  ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <View style={styles.filterSection}>
                  <TouchableOpacity 
                    style={styles.accordionHeader}
                    onPress={() => toggleSection('tags')}
                  >
                    <Text style={styles.filterLabel}>Tags</Text>
                    <Ionicons 
                      name={expandedSections.has('tags') ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#333" 
                    />
                  </TouchableOpacity>
                  {expandedSections.has('tags') && (
                    <View style={styles.accordionContent}>
                      <View style={styles.optionsList}>
                    {availableTags.map((tag) => {
                      const isSelected = filters.tagIds.includes(tag.id);
                      return (
                        <Pressable
                          key={tag.id}
                          style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                          onPress={() => {
                            const newTagIds = isSelected
                              ? filters.tagIds.filter((id) => id !== tag.id)
                              : [...filters.tagIds, tag.id];
                            setFilters({ ...filters, tagIds: newTagIds });
                          }}
                        >
                          <Text
                            style={[
                              styles.optionPillText,
                              isSelected && styles.optionPillTextSelected,
                            ]}
                          >
                            {tag.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.drawerFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterDrawer(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  filterButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 6,
  },
  activeFiltersList: {
    paddingHorizontal: 8,
    gap: 6,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#333',
  },
  activeFilterClearButton: {
    padding: 2,
  },
  clearAllFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  clearAllFiltersText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 4,
  },
  categoryPillSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#666',
  },
  categoryPillTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  subcategoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  subcategoriesList: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  subcategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 4,
    backgroundColor: '#fff',
  },
  subcategoryPillSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  subcategoryPillText: {
    fontSize: 13,
    color: '#666',
  },
  subcategoryPillTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  itemsList: {
    padding: 8,
  },
  itemCard: {
    flex: 1,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  itemCardSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  outfitCreatorBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 8,
    alignItems: 'center',
    gap: 8,
  },
  selectedItemsScroll: {
    flex: 1,
  },
  selectedItemCard: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedItemImage: {
    width: '100%',
    height: '100%',
  },
  selectedItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  removeItemButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  exitOutfitModeButton: {
    padding: 8,
  },
  generateOutfitButton: {
    backgroundColor: '#007AFF',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateOutfitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
  },
  favoriteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    padding: 2,
  },
  itemImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  itemTitle: {
    padding: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  drawerClose: {
    fontSize: 28,
    color: '#666',
  },
  drawerContent: {
    padding: 20,
  },
  favoritesSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterSection: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accordionContent: {
    marginTop: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  optionPillSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionPillText: {
    fontSize: 12,
    color: '#666',
  },
  optionPillTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#333',
  },
  drawerFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
