import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOutfit,
  saveOutfit,
  Outfit,
  OutfitItem,
} from '@/lib/outfits';
import {
  getWardrobeCategories,
  getWardrobeItems,
  getWardrobeItemsByIds,
  getDefaultWardrobeId,
  getWardrobeItemImages,
  getSavedWardrobeItems,
  WardrobeCategory,
  WardrobeItem,
} from '@/lib/wardrobe';
import { createAIJob, triggerAIJobExecution, pollAIJob } from '@/lib/ai-jobs';
import { createPost } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { 
  getOutfitScheduledDates, 
  createCalendarEntry, 
  deleteCalendarEntry,
  CalendarEntry,
} from '@/lib/calendar';
import { Ionicons } from '@expo/vector-icons';
import { getUserSettings } from '@/lib/settings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

export default function OutfitEditorScreen() {
  const { id, item_id, category_id } = useLocalSearchParams<{ id: string; item_id?: string; category_id?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [wardrobeId, setWardrobeId] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [outfitItems, setOutfitItems] = useState<Map<string, WardrobeItem>>(new Map());
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<WardrobeItem[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [coverImage, setCoverImage] = useState<any>(null);
  const [itemImageUrls, setItemImageUrls] = useState<Map<string, string>>(new Map());
  const [scheduledDates, setScheduledDates] = useState<Array<{ date: string; entryId: string }>>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date>(new Date());
  const [schedulingDate, setSchedulingDate] = useState(false);
  const [headshots, setHeadshots] = useState<Array<{ id: string; url: string; created_at: string }>>([]);
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(null);
  const [activeHeadshotId, setActiveHeadshotId] = useState<string | null>(null);
  const [showHeadshotSelector, setShowHeadshotSelector] = useState(false);

  const isNew = id === 'new';

  // Category icons mapping
  const getCategoryIcon = (categoryName: string): string => {
    const iconMap: { [key: string]: string } = {
      'Tops': '👕',
      'Bottoms': '👖',
      'Dresses': '👗',
      'Outerwear': '🧥',
      'Shoes': '👟',
      'Accessories': '👜',
      'Jewelry': '💍',
      'Bags': '🎒',
      'Hats': '🎩',
      'Scarves': '🧣',
      'Belts': '📿',
      'Sunglasses': '🕶️',
    };
    return iconMap[categoryName] || '👔';
  };

  useEffect(() => {
    initialize();
  }, [user, id]);

  useEffect(() => {
    if (user) {
      loadHeadshots();
    }
  }, [user]);

  const initialize = async () => {
    if (!user) return;

    setLoading(true);

    // Get default wardrobe
    const { data: defaultWardrobeId } = await getDefaultWardrobeId(user.id);
    if (defaultWardrobeId) {
      setWardrobeId(defaultWardrobeId);
    }

    // Load categories
    const { data: categoriesData } = await getWardrobeCategories();
    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Handle preselected item from query params (when navigating from item detail)
    if (isNew && item_id && category_id && user) {
      // Load the preselected item
      const { data: preselectedItems } = await getWardrobeItemsByIds([item_id]);
      if (preselectedItems && preselectedItems.length > 0) {
        const preselectedItem = preselectedItems[0];
        const itemsMap = new Map<string, WardrobeItem>();
        itemsMap.set(category_id, preselectedItem);
        setOutfitItems(itemsMap);
        
        // Load image for preselected item
        const url = await getItemImageUrl(preselectedItem.id);
        if (url) {
          const newImageUrls = new Map<string, string>();
          newImageUrls.set(preselectedItem.id, url);
          setItemImageUrls(newImageUrls);
        }
      }
    }

    // Load existing outfit if editing
    if (!isNew && id) {
      const { data, error } = await getOutfit(id);
      if (error || !data) {
        Alert.alert('Error', 'Failed to load outfit');
        router.back();
        return;
      }

      setOutfit(data.outfit);
      setTitle(data.outfit.title || '');
      setNotes(data.outfit.notes || '');
      setCoverImage(data.coverImage);
      setCoverImage(data.coverImage);

      // Load wardrobe items for outfit items - optimized batch query
      const itemsMap = new Map<string, WardrobeItem>();
      if (data.items.length > 0) {
        // OPTIMIZED: Get only the wardrobe items we need by their IDs
        const wardrobeItemIds = data.items.map(oi => oi.wardrobe_item_id);
        const { data: wardrobeItems } = await getWardrobeItemsByIds(wardrobeItemIds);
        if (wardrobeItems) {
          // Create a map for fast lookup
          const wardrobeItemsById = new Map(wardrobeItems.map(wi => [wi.id, wi]));
          // Match outfit items to wardrobe items
          for (const outfitItem of data.items) {
            const item = wardrobeItemsById.get(outfitItem.wardrobe_item_id);
            if (item) {
              itemsMap.set(outfitItem.category_id, item);
            }
          }
        }
      }
      setOutfitItems(itemsMap);
      
      // Load images for selected items
      if (itemsMap.size > 0) {
        const imagePromises = Array.from(itemsMap.values()).map(async (item) => {
          const url = await getItemImageUrl(item.id);
          return { itemId: item.id, url };
        });
        const imageResults = await Promise.all(imagePromises);
        const newImageUrls = new Map<string, string>();
        imageResults.forEach(({ itemId, url }) => {
          if (url) {
            newImageUrls.set(itemId, url);
          }
        });
        setItemImageUrls(newImageUrls);
      }
      
      // Load scheduled dates for this outfit
      if (!isNew && id) {
        try {
          const { data: scheduledData } = await getOutfitScheduledDates(user.id, id);
          
          if (scheduledData && scheduledData.length > 0) {
            const dates = scheduledData.map(d => ({ date: d.date, entryId: d.entry.id }));
            setScheduledDates(dates);
          } else {
            setScheduledDates([]);
          }
        } catch (e: any) {
          console.error('Error loading scheduled dates:', e);
        }
      }
    }

    setLoading(false);
  };

  const loadHeadshots = async () => {
    if (!user) return;

    try {
      // Load user settings to get active headshot
      const { data: settings } = await getUserSettings(user.id);
      if (settings?.headshot_image_id) {
        setActiveHeadshotId(settings.headshot_image_id);
        setSelectedHeadshotId(settings.headshot_image_id); // Default to active headshot
      }

      // Load all user headshots
      const { data: allImages, error: imagesError } = await supabase
        .from('images')
        .select('id, storage_bucket, storage_key, created_at')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (imagesError) {
        console.error('Error loading headshots:', imagesError);
        return;
      }

      if (allImages) {
        // Filter for headshots
        const headshotImages = allImages.filter(img => img.storage_key?.includes('/ai/headshots/'));
        
        const headshotsWithUrls = headshotImages.map((img) => {
          const { data } = supabase.storage
            .from(img.storage_bucket || 'media')
            .getPublicUrl(img.storage_key);
          return {
            id: img.id,
            url: data.publicUrl,
            created_at: img.created_at
          };
        });

        setHeadshots(headshotsWithUrls);

        // If no headshot selected yet and we have headshots, select the active one or first one
        if (!selectedHeadshotId && headshotsWithUrls.length > 0) {
          const toSelect = activeHeadshotId && headshotsWithUrls.find(h => h.id === activeHeadshotId)
            ? activeHeadshotId
            : headshotsWithUrls[0].id;
          setSelectedHeadshotId(toSelect);
        }
      }
    } catch (error: any) {
      console.error('Error loading headshots:', error);
    }
  };
  
  const loadOutfit = async () => {
    if (!id || isNew) return;
    
    const { data, error } = await getOutfit(id);
    if (error || !data) return;
    
    setOutfit(data.outfit);
    setTitle(data.outfit.title || '');
    setNotes(data.outfit.notes || '');
    setCoverImage(data.coverImage);
    
    // Reload wardrobe items - optimized batch query
    const defaultWardrobeIdData = await getDefaultWardrobeId(user?.id || '');
    if (defaultWardrobeIdData.data && data.items.length > 0) {
      const itemsMap = new Map<string, WardrobeItem>();
      // OPTIMIZED: Get only the wardrobe items we need by their IDs
      const wardrobeItemIds = data.items.map(oi => oi.wardrobe_item_id);
      const { data: wardrobeItems } = await getWardrobeItemsByIds(wardrobeItemIds);
      if (wardrobeItems) {
        // Create a map for fast lookup
        const wardrobeItemsById = new Map(wardrobeItems.map(wi => [wi.id, wi]));
        // Match outfit items to wardrobe items
        for (const outfitItem of data.items) {
          const item = wardrobeItemsById.get(outfitItem.wardrobe_item_id);
          if (item) {
            itemsMap.set(outfitItem.category_id, item);
          }
        }
      }
      setOutfitItems(itemsMap);
      
      // Load images for selected items
      if (itemsMap.size > 0) {
        const imagePromises = Array.from(itemsMap.values()).map(async (item) => {
          const url = await getItemImageUrl(item.id);
          return { itemId: item.id, url };
        });
        const imageResults = await Promise.all(imagePromises);
        const newImageUrls = new Map<string, string>();
        imageResults.forEach(({ itemId, url }) => {
          if (url) {
            newImageUrls.set(itemId, url);
          }
        });
        setItemImageUrls(newImageUrls);
      }
    }
  };

  const openItemPicker = async (categoryId: string) => {
    if (!wardrobeId || !user) return;

    setSelectedCategory(categoryId);
    
    // Load owned items
    const { data: ownedItems } = await getWardrobeItems(wardrobeId, {
      category_id: categoryId,
    });

    // Load saved items from other users
    const { data: savedItems } = await getSavedWardrobeItems(user.id, {
      category_id: categoryId,
    });

    // Combine owned and saved items
    const items = [
      ...(ownedItems || []),
      ...(savedItems || []),
    ];
    
    setCategoryItems(items);
    
    // Load images for all items in parallel
    if (items && items.length > 0) {
      const imagePromises = items.map(async (item) => {
        const url = await getItemImageUrl(item.id);
        return { itemId: item.id, url };
      });
      const imageResults = await Promise.all(imagePromises);
      const newImageUrls = new Map(itemImageUrls);
      imageResults.forEach(({ itemId, url }) => {
        if (url) {
          newImageUrls.set(itemId, url);
        }
      });
      setItemImageUrls(newImageUrls);
    }
    
    setShowItemPicker(true);
  };

  const selectItem = async (item: WardrobeItem) => {
    if (!selectedCategory) return;

    setOutfitItems((prev) => {
      const updated = new Map(prev);
      updated.set(selectedCategory, item);
      return updated;
    });
    
    // Load image for the selected item if not already loaded
    if (!itemImageUrls.has(item.id)) {
      const url = await getItemImageUrl(item.id);
      if (url) {
        setItemImageUrls((prev) => {
          const updated = new Map(prev);
          updated.set(item.id, url);
          return updated;
        });
      }
    }
    
    setShowItemPicker(false);
    setSelectedCategory(null);
  };

  const removeItem = (categoryId: string) => {
    setOutfitItems((prev) => {
      const updated = new Map(prev);
      updated.delete(categoryId);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Allow null category_id for items that don't have categories yet
      const items = Array.from(outfitItems.entries()).map(([categoryId, item], index) => ({
        category_id: categoryId || null,
        wardrobe_item_id: item.id,
        position: index,
      }));

      const saveItemDetails = items.map(i => {
        const item = outfitItems.get(i.category_id);
        return {
          category_id: i.category_id,
          wardrobe_item_id: i.wardrobe_item_id,
          item: item ? {
            id: item.id,
            title: item.title,
            owner_user_id: item.owner_user_id,
            isOwnItem: item.owner_user_id === user.id
          } : null
        };
      });
      console.log('[OutfitEditor] Saving outfit with items:', JSON.stringify(saveItemDetails, null, 2));

      const { data, error } = await saveOutfit(
        user.id,
        {
          id: isNew ? undefined : outfit?.id,
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        items
      );

      if (error) {
        Alert.alert('Error', error.message || 'Failed to save outfit');
      } else if (data) {
        // If this was a new outfit, redirect to the actual outfit page so user can render it
        if (isNew && data.outfit.id) {
          Alert.alert('Success', 'Outfit saved! You can now generate the outfit image.', [
            { text: 'OK', onPress: () => router.replace(`/outfits/${data.outfit.id}`) },
          ]);
        } else {
          Alert.alert('Success', 'Outfit saved!');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !outfit || isNew) return;

    // Web fallback using window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this outfit? This action cannot be undone.');
      
      if (!confirmed) return;
      
      setSaving(true);
      try {
        // Archive the outfit (soft delete)
        const { error } = await supabase
          .from('outfits')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', outfit.id)
          .eq('owner_user_id', user.id);

        if (error) {
          throw error;
        }

        alert('Outfit deleted successfully');
        router.back();
      } catch (error: any) {
        alert(error.message || 'Failed to delete outfit');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Native Alert for iOS/Android
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to delete this outfit? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // Archive the outfit (soft delete)
              const { error } = await supabase
                .from('outfits')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', outfit.id)
                .eq('owner_user_id', user.id);

              if (error) {
                throw error;
              }

              Alert.alert('Success', 'Outfit deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete outfit');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handlePublish = async () => {
    if (!user || !outfit) return;

    setSaving(true);
    try {
      // For social sharing, posts should be 'public' or 'followers', not 'private'
      // Only use outfit visibility if it's 'public' or 'followers', otherwise default to 'public'
      let postVisibility: 'public' | 'followers' = 'public';
      if (outfit.visibility === 'public' || outfit.visibility === 'followers') {
        postVisibility = outfit.visibility;
      } else if (outfit.visibility === 'inherit') {
        postVisibility = 'followers';
      }
      
      const { data: post, error } = await createPost(
        user.id,
        'outfit',
        outfit.id,
        undefined, // No caption for MVP - can be enhanced later
        postVisibility
      );

      if (error) {
        // Web fallback for error alerts
        if (Platform.OS === 'web') {
          alert(`Failed to publish: ${error.message || error}`);
        } else {
          Alert.alert('Error', `Failed to publish: ${error.message || error}`);
        }
      } else {
        // Web fallback for success alerts
        if (Platform.OS === 'web') {
          alert('Outfit published to feed!');
        } else {
          Alert.alert('Success', 'Outfit published to feed!', [{ text: 'OK' }]);
        }
      }
    } catch (error: any) {
      // Web fallback for exception alerts
      if (Platform.OS === 'web') {
        alert(error.message || 'An unexpected error occurred');
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRender = async () => {
    if (!user || outfitItems.size === 0) {
      Alert.alert('Error', 'Please add items to the outfit before rendering');
      return;
    }

    setRendering(true);

    try {
      let currentOutfitId = outfit?.id;
      
      // Always save/update the outfit with current items before rendering
      // This ensures the saved outfit matches what's in the editor
      // Allow null category_id for items that don't have categories yet
      const items = Array.from(outfitItems.entries()).map(([categoryId, item], index) => ({
        category_id: categoryId || null,
        wardrobe_item_id: item.id,
        position: index,
      }));
      
      const { data: savedData, error: saveError } = await saveOutfit(
        user.id,
        {
          id: currentOutfitId || undefined, // Pass existing ID if editing
          title: title.trim() || 'Untitled Outfit',
          notes: notes.trim() || undefined,
        },
        items
      );
      
      if (saveError || !savedData) {
        Alert.alert('Error', 'Failed to save outfit before rendering');
        setRendering(false);
        return;
      }
      
      currentOutfitId = savedData.outfit.id;
      
      // Update local state
      setOutfit(savedData.outfit);
      
      // Create outfit_render job with items from current editor state
      // Handle items that may not have category_id yet (AI will recognize them)
      const selected = Array.from(outfitItems.entries()).map(([categoryId, item]) => ({
        category: categoryId ? (categories.find((c) => c.id === categoryId)?.name || '') : '',
        wardrobe_item_id: item.id,
      }));

      // Log items being sent to render job
      const itemDetails = Array.from(outfitItems.entries()).map(([categoryId, item]) => ({
        wardrobe_item_id: item.id,
        title: item.title,
        owner_user_id: item.owner_user_id,
        isOwnItem: item.owner_user_id === user.id,
        category: categories.find((c) => c.id === categoryId)?.name || '',
      }));
      console.log('[OutfitEditor] Creating render job with items:', JSON.stringify(itemDetails, null, 2));

      const { data: renderJob, error } = await createAIJob(user.id, 'outfit_render', {
        user_id: user.id,
        outfit_id: currentOutfitId,
        selected,
        prompt: notes.trim() || undefined,
        headshot_image_id: selectedHeadshotId || undefined, // Pass selected headshot
      });

      if (error) {
        Alert.alert('Error', 'Failed to start render job');
        setRendering(false);
        return;
      }
      
      if (!renderJob) {
        Alert.alert('Error', 'No render job created');
        setRendering(false);
        return;
      }
      
      // Trigger the job execution (fire-and-forget)
      const execResult = await triggerAIJobExecution(renderJob.id);
      
      if (execResult.error) {
        console.error('Failed to trigger job execution:', execResult.error);
        // Continue anyway - the job might still be processed
      }
      
      // Small delay to ensure job is saved in database before navigation
      // This helps the view page find the active job immediately
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear rendering state before navigating to avoid showing duplicate modals
      setRendering(false);
      
      // Navigate to the outfit view page - it will detect the active render job and show loading overlay
      router.push(`/outfits/${currentOutfitId}/view` as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      setRendering(false);
    }
  };

  const getItemImageUrl = async (itemId: string): Promise<string | null> => {
    const { data } = await getWardrobeItemImages(itemId);
    if (data && data.length > 0) {
      const imageData = data[0].image;
      if (imageData) {
        const { data: urlData } = supabase.storage
          .from(imageData.storage_bucket || 'media')
          .getPublicUrl(imageData.storage_key);
        return urlData.publicUrl;
      }
    }
    return null;
  };

  const loadScheduledDates = async () => {
    if (!user || !outfit?.id) return;
    
    const { data: scheduledData } = await getOutfitScheduledDates(user.id, outfit.id);
    if (scheduledData && scheduledData.length > 0) {
      const dates = scheduledData.map(d => ({ date: d.date, entryId: d.entry.id }));
      setScheduledDates(dates);
    } else {
      setScheduledDates([]);
    }
  };

  const handleScheduleDate = async () => {
    if (!user || !outfit?.id || isNew) return;

    setSchedulingDate(true);

    try {
      const dateStr = selectedScheduleDate.toISOString().split('T')[0];
      
      const { data, error } = await createCalendarEntry(user.id, dateStr, {
        outfit_id: outfit.id,
        status: 'planned',
      });

      if (error) {
        Alert.alert('Error', 'Failed to schedule outfit');
      } else {
        Alert.alert('Success', `Outfit scheduled for ${dateStr}`);
        await loadScheduledDates();
        setShowScheduleModal(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSchedulingDate(false);
    }
  };

  const handleRemoveSchedule = async (entryId: string, date: string) => {
    if (!user) return;

    const { error } = await deleteCalendarEntry(entryId);

    if (error) {
      Alert.alert('Error', 'Failed to remove scheduled date');
    } else {
      Alert.alert('Success', 'Scheduled date removed');
      await loadScheduledDates();
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysInCurrentMonth = (): Date[] => {
    const year = selectedScheduleDate.getFullYear();
    const month = selectedScheduleDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Add days in current month
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Add padding days from next month to fill week
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }

    return days;
  };

  const isInCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === selectedScheduleDate.getMonth() && 
           date.getFullYear() === selectedScheduleDate.getFullYear();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back and Delete buttons */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        {!isNew && outfit && (
          <TouchableOpacity onPress={handleDelete} style={[styles.headerButton, styles.deleteHeaderButton]}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{isNew ? 'New Outfit' : 'Edit Outfit'}</Text>

        {/* Headshot Selection Accordion */}
        {headshots.length > 0 && (
          <View style={styles.headshotSection}>
            <TouchableOpacity
              style={styles.headshotAccordionHeader}
              onPress={() => setShowHeadshotSelector(!showHeadshotSelector)}
            >
              <View style={styles.headshotAccordionHeaderContent}>
                <Ionicons name="person-outline" size={20} color="#000" />
                <Text style={styles.headshotAccordionTitle}>Headshot Selection</Text>
                {selectedHeadshotId && (
                  <View style={styles.selectedHeadshotBadge}>
                    <Text style={styles.selectedHeadshotBadgeText}>Selected</Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={showHeadshotSelector ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>

            {showHeadshotSelector && (
              <View style={styles.headshotSelectorContent}>
                <Text style={styles.headshotHint}>
                  Choose which headshot to use for generating this outfit
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.headshotSlider}
                  contentContainerStyle={styles.headshotSliderContent}
                >
                  {headshots.map((headshot) => {
                    const isSelected = selectedHeadshotId === headshot.id;
                    const isActive = activeHeadshotId === headshot.id;
                    
                    return (
                      <TouchableOpacity
                        key={headshot.id}
                        style={[
                          styles.headshotItem,
                          isSelected && styles.headshotItemSelected
                        ]}
                        onPress={() => setSelectedHeadshotId(headshot.id)}
                      >
                        <ExpoImage
                          source={{ uri: headshot.url }}
                          style={styles.headshotImage}
                          contentFit="cover"
                        />
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                          </View>
                        )}
                        {isActive && !isSelected && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Generated Outfit Image */}
        {coverImage && (
          <View style={styles.imageSection}>
            <ExpoImage
              source={{ uri: supabase.storage.from(coverImage.storage_bucket || 'media').getPublicUrl(coverImage.storage_key).data.publicUrl }}
              style={styles.generatedImage}
              contentFit="contain"
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Summer Work Outfit"
            value={title}
            onChangeText={setTitle}
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!saving}
          />
        </View>

        {/* Scheduling Section */}
        {!isNew && outfit && (
          <View style={styles.section}>
            <View style={styles.schedulingHeader}>
              <Text style={styles.label}>Scheduled Dates</Text>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => setShowScheduleModal(true)}
              >
                <Text style={styles.scheduleButtonText}>+ Schedule Date</Text>
              </TouchableOpacity>
            </View>
            
            {scheduledDates.length > 0 ? (
              <View style={styles.scheduledDatesList}>
                {scheduledDates.map((item) => (
                  <View key={item.entryId} style={styles.scheduledDateItem}>
                    <Text style={styles.scheduledDateText}>{formatDisplayDate(item.date)}</Text>
                    <TouchableOpacity
                      style={styles.removeScheduleButton}
                      onPress={() => handleRemoveSchedule(item.entryId, item.date)}
                    >
                      <Text style={styles.removeScheduleButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noScheduledDates}>No dates scheduled yet</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Category Slots</Text>
          <Text style={styles.hint}>Select one item per category</Text>

          {categories.map((category) => {
            const selectedItem = outfitItems.get(category.id);
            const itemImageUrl = selectedItem ? itemImageUrls.get(selectedItem.id) : null;
            
            return (
              <View key={category.id} style={styles.categorySlot}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(category.name)}</Text>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <View style={styles.categoryActions}>
                    {selectedItem && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeItem(category.id)}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => openItemPicker(category.id)}
                    >
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedItem && (
                  <View style={styles.selectedItem}>
                    {itemImageUrl && (
                      <ExpoImage
                        source={{ uri: itemImageUrl }}
                        style={styles.selectedItemImage}
                        contentFit="cover"
                      />
                    )}
                    <Text style={styles.selectedItemTitle}>{selectedItem.title}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Outfit</Text>
            )}
          </TouchableOpacity>

          {/* Render button - available for both new and existing outfits */}
          <TouchableOpacity
            style={[styles.renderButton, (rendering || outfitItems.size === 0) && styles.buttonDisabled]}
            onPress={handleRender}
            disabled={rendering || outfitItems.size === 0}
          >
            <Text style={styles.renderButtonText}>
              {coverImage ? 'Regenerate Outfit Image' : (isNew ? 'Save & Generate Outfit' : 'Generate Outfit Image')}
            </Text>
          </TouchableOpacity>

          {!isNew && outfit && (
            <>
              <TouchableOpacity
                style={styles.publishButton}
                onPress={handlePublish}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Text style={styles.publishButtonText}>Publish to Feed</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {!isNew && outfit && (
            <TouchableOpacity
              style={styles.bundleButton}
              onPress={() => router.push(`/outfits/${outfit.id}/bundle`)}
              disabled={saving}
            >
              <Text style={styles.bundleButtonText}>Create Bundle</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Item Picker Modal */}
      <Modal
        visible={showItemPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItemPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={categoryItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const imageUrl = itemImageUrls.get(item.id);
                return (
                  <TouchableOpacity
                    style={styles.itemOption}
                    onPress={() => selectItem(item)}
                  >
                    {imageUrl && (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        style={styles.itemOptionImage}
                        contentFit="cover"
                      />
                    )}
                    <Text style={styles.itemOptionText}>{item.title}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No items in this category</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Schedule Date Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Outfit</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Month Navigation */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity 
                  onPress={() => setSelectedScheduleDate(new Date(selectedScheduleDate.getFullYear(), selectedScheduleDate.getMonth() - 1, 1))}
                  style={styles.calendarNavButton}
                >
                  <Text style={styles.calendarNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.calendarMonth}>
                  {selectedScheduleDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity 
                  onPress={() => setSelectedScheduleDate(new Date(selectedScheduleDate.getFullYear(), selectedScheduleDate.getMonth() + 1, 1))}
                  style={styles.calendarNavButton}
                >
                  <Text style={styles.calendarNavText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Week Days */}
              <View style={styles.weekDaysRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.weekDay}>
                    <Text style={styles.weekDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {getDaysInCurrentMonth().map((date, index) => {
                  const inMonth = isInCurrentMonth(date);
                  const today = isToday(date);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !inMonth && styles.calendarDayOtherMonth,
                        today && styles.calendarDayToday,
                      ]}
                      onPress={() => setSelectedScheduleDate(date)}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !inMonth && styles.calendarDayTextOtherMonth,
                          today && styles.calendarDayTextToday,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Text style={styles.selectedDateDisplay}>
                  Selected: {selectedScheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  style={[styles.confirmScheduleButton, schedulingDate && styles.buttonDisabled]}
                  onPress={handleScheduleDate}
                  disabled={schedulingDate}
                >
                  {schedulingDate ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmScheduleButtonText}>Schedule</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rendering Overlay */}
      <Modal
        visible={rendering}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.overlayText}>Generating Outfit...</Text>
            <Text style={styles.overlaySubtext}>This may take 60-90 seconds</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  deleteHeaderButton: {
    backgroundColor: '#ff3b30',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  imageSection: {
    width: '100%',
    marginBottom: 24,
    marginHorizontal: IS_TABLET ? 0 : -20, // Break out of padding on mobile for edge-to-edge
    backgroundColor: '#fff',
    alignSelf: 'stretch',
  },
  generatedImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 0.75, // 3:4 portrait ratio - let height calculate naturally
    borderRadius: IS_TABLET ? 12 : 0, // No border radius on mobile for edge-to-edge
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categorySlot: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  selectedItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedItemTitle: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  actions: {
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  renderButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  renderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  publishButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bundleButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  bundleButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  itemOptionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  itemOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#000',
  },
  overlaySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  schedulingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduledDatesList: {
    gap: 8,
  },
  scheduledDateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scheduledDateText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  removeScheduleButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeScheduleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noScheduledDates: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayOtherMonth: {
    backgroundColor: '#f9f9f9',
  },
  calendarDayToday: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  calendarDayTextOtherMonth: {
    color: '#999',
  },
  calendarDayTextToday: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  selectedDateDisplay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
  },
  confirmScheduleButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  confirmScheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headshotSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  headshotAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  headshotAccordionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headshotAccordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  selectedHeadshotBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  selectedHeadshotBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  headshotSelectorContent: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  headshotHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  headshotSlider: {
    marginTop: 8,
  },
  headshotSliderContent: {
    paddingRight: 16,
    gap: 12,
  },
  headshotItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  headshotItemSelected: {
    borderColor: '#007AFF',
  },
  headshotImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  activeBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});