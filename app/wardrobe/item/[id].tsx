import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import {
  getWardrobeItemImages,
  getWardrobeCategories,
  getWardrobeItem,
  getWardrobeItemsByIds,
  getWardrobeItemsImages,
  saveWardrobeItem,
  unsaveWardrobeItem,
  isWardrobeItemSaved,
  WardrobeItem,
  WardrobeCategory,
} from '@/lib/wardrobe';
import { getEntityAttributes } from '@/lib/attributes';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { getActiveProductShotJob, getRecentProductShotJob, getAIJob, AIJob } from '@/lib/ai-jobs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ItemDetailScreen() {
  const { id, itemIds, readOnly } = useLocalSearchParams<{ id: string; itemIds?: string; readOnly?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isReadOnly = readOnly === 'true';
  useEffect(() => {
    // Listen for window resize events and update state
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const cappedWidth = Math.min(window.width, 630);
      setCurrentScreenWidth(cappedWidth);
    });
    
    return () => {
      subscription?.remove();
      // Cleanup polling intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (autoTagPollingRef.current) {
        clearInterval(autoTagPollingRef.current);
        autoTagPollingRef.current = null;
      }
      if (attributeRefreshRef.current) {
        clearInterval(attributeRefreshRef.current);
        attributeRefreshRef.current = null;
      }
    };
  }, []);
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [category, setCategory] = useState<WardrobeCategory | null>(null);
  const [allImages, setAllImages] = useState<Array<{ id: string; image_id: string; type: string; image: any }>>([]);
  const [displayImages, setDisplayImages] = useState<Array<{ id: string; image_id: string; type: string; image: any }>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [showAddToOutfit, setShowAddToOutfit] = useState(false);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [navigationItems, setNavigationItems] = useState<Array<{ id: string; title: string; imageUrl: string | null }>>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const navigationScrollRef = useRef<ScrollView>(null);
  const [isGeneratingProductShot, setIsGeneratingProductShot] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoTagPollingRef = useRef<NodeJS.Timeout | null>(null);
  const attributeRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track current screen width dynamically for responsive layout
  // Cap at 630px max width to prevent images from becoming too large on wide screens (like social feed)
  const [currentScreenWidth, setCurrentScreenWidth] = useState(() => {
    const width = Dimensions.get('window').width;
    return Math.min(width, 630);
  });

  useEffect(() => {
    if (id) {
      loadItemData();
      if (itemIds) {
        loadNavigationItems();
      }
    }
    
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (autoTagPollingRef.current) {
        clearInterval(autoTagPollingRef.current);
        autoTagPollingRef.current = null;
      }
      if (attributeRefreshRef.current) {
        clearInterval(attributeRefreshRef.current);
        attributeRefreshRef.current = null;
      }
    };
  }, [id, itemIds]);
  
  // Check if item is saved (for read-only view of other user's items)
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!id || !user || !item) return;
      const isOwn = item.owner_user_id === user.id;
      if (isReadOnly && !isOwn) {
        const { data: saved } = await isWardrobeItemSaved(user.id, id);
        setIsSaved(saved || false);
      }
    };
    
    if (item && user) {
      checkIfSaved();
    }
  }, [id, item, user, isReadOnly]);

  useEffect(() => {
    // Auto-scroll to current item in navigation
    if (navigationItems.length > 0 && currentItemIndex >= 0 && navigationScrollRef.current) {
      const itemWidth = 60 + 12; // width + gap
      const scrollPosition = Math.max(0, currentItemIndex * itemWidth - currentScreenWidth / 2 + itemWidth / 2);
      setTimeout(() => {
        navigationScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
      }, 100);
    }
  }, [navigationItems, currentItemIndex, currentScreenWidth]);

  const loadItemData = async () => {
    if (!id || !user) return;

    setLoading(true);

    try {
      // Load item details directly by ID (OPTIMIZED - no longer fetches all items)
      const { data: foundItem, error: itemError } = await getWardrobeItem(id);
      
      if (itemError) throw itemError;
      
      if (foundItem) {
        setItem(foundItem);

        // Load category
        const { data: categories } = await getWardrobeCategories();
        const foundCategory = categories?.find((c) => c.id === foundItem.category_id);
        if (foundCategory) {
          setCategory(foundCategory);
        }
      }

      // Load images (original + product_shot)
      const { data: itemImages, error: imagesError } = await getWardrobeItemImages(id);
      
      if (itemImages) {
        setAllImages(itemImages);
        // Filter to show original + product_shot in carousel
        const filtered = itemImages.filter((img) => img.type === 'original' || img.type === 'product_shot');
        
        setDisplayImages(filtered);
        
        // Check if product shot exists, if not, check for active or recently completed job
        const hasProductShot = filtered.some((img) => img.type === 'product_shot');
        
        if (!hasProductShot && user) {
          // Check for active product shot job
          const { data: activeJob, error: jobError } = await getActiveProductShotJob(id, user.id);
          
          if (activeJob) {
            setIsGeneratingProductShot(true);
            startPollingForProductShot(activeJob.id);
          } else {
            // Check for recently completed job (within last 60 seconds) - job might have completed very quickly
            const { data: recentJob } = await getRecentProductShotJob(id, user.id);
            
            if (recentJob && recentJob.status === 'succeeded') {
              // Job just completed - refresh images immediately
              await refreshImages();
            } else {
              // No active or recent job found - start periodic refresh check
              // This handles cases where job completed but we missed it
              setIsGeneratingProductShot(true);
              startPeriodicImageRefresh();
            }
          }
        }
      }

      // Load attributes
      const { data: itemAttributes, error: attrError } = await getEntityAttributes('wardrobe_item', id);
      if (itemAttributes) {
        setAttributes(itemAttributes);
      }
      
      // Check for active auto_tag job if attributes are empty or item has placeholder title
      if (user && (!itemAttributes || itemAttributes.length === 0 || foundItem.title === 'New Item')) {
        // Check for active auto_tag job
        const { data: activeAutoTagJobs } = await supabase
          .from('ai_jobs')
          .select('*')
          .eq('job_type', 'auto_tag')
          .eq('owner_user_id', user.id)
          .in('status', ['queued', 'running'])
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (activeAutoTagJobs) {
          // Filter to find job for this item
          const itemAutoTagJob = activeAutoTagJobs.find((job: any) => {
            try {
              const input = job.input as any;
              return input?.wardrobe_item_id === id;
            } catch {
              return false;
            }
          });
          
          if (itemAutoTagJob) {
            // Start polling for auto_tag completion
            startPollingForAutoTag(itemAutoTagJob.id);
          } else {
            // No active job - start periodic refresh to check for completed attributes
            startPeriodicAttributeRefresh();
          }
        } else {
          // No active jobs - start periodic refresh
          startPeriodicAttributeRefresh();
        }
      } else if (user && itemAttributes && itemAttributes.length > 0 && foundItem.title !== 'New Item') {
        // Attributes exist and title is set - AI has completed, no need to poll
      }

      // Load tags
      const { data: tagLinks } = await supabase
        .from('tag_links')
        .select('*, tags(id, name)')
        .eq('entity_type', 'wardrobe_item')
        .eq('entity_id', id);

      if (tagLinks) {
        const itemTags = tagLinks
          .map((link: any) => link.tags)
          .filter((tag: any) => tag)
          .map((tag: any) => ({ id: tag.id, name: tag.name }));
        setTags(itemTags);
      }
    } catch (error: any) {
      console.error('Failed to load item data:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const refreshImages = async () => {
    if (!id) return;
    
    // Refresh images
    const { data: refreshedImages } = await getWardrobeItemImages(id);
    
    // Refresh attributes (auto_tag job may have completed)
    const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id);
    
    if (refreshedImages) {
      const hasProductShot = refreshedImages.some((img) => img.type === 'product_shot');
      setAllImages(refreshedImages);
      const filtered = refreshedImages.filter((img) => img.type === 'original' || img.type === 'product_shot');
      setDisplayImages(filtered);
      
      // Update attributes if they were loaded
      if (itemAttributes) {
        setAttributes(itemAttributes);
      }
      
      // If product shot now exists, stop loading indicator
      if (hasProductShot) {
        setIsGeneratingProductShot(false);
      }
      
      // Reset to first image (product shot should be at index 0)
      setCurrentImageIndex(0);
    }
  };

  const startPeriodicImageRefresh = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Check for product shot every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      if (!id) return;
      await refreshImages();
    }, 3000); // Check every 3 seconds

    // Stop after 90 seconds (30 attempts)
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsGeneratingProductShot(false);
      }
    }, 90000);
  };

  const startPeriodicAttributeRefresh = () => {
    // Clear any existing attribute refresh
    if (attributeRefreshRef.current) {
      clearInterval(attributeRefreshRef.current);
    }
    
    // Use a separate interval for attribute refresh (less frequent)
    attributeRefreshRef.current = setInterval(async () => {
      if (!id) return;
      
      // Refresh attributes and item data
      const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id);
      if (itemAttributes && itemAttributes.length > 0) {
        setAttributes(itemAttributes);
        // Also refresh item to get updated title/category
        const { data: refreshedItem } = await getWardrobeItem(id);
        if (refreshedItem) {
          setItem(refreshedItem);
          // Update category if it was set
          if (refreshedItem.category_id) {
            const { data: categories } = await getWardrobeCategories();
            const foundCategory = categories?.find((c) => c.id === refreshedItem.category_id);
            if (foundCategory) {
              setCategory(foundCategory);
            }
          }
        }
        // Stop refreshing once we have attributes
        if (attributeRefreshRef.current) {
          clearInterval(attributeRefreshRef.current);
          attributeRefreshRef.current = null;
        }
      }
    }, 5000); // Check every 5 seconds

    // Stop after 120 seconds (24 attempts)
    setTimeout(() => {
      if (attributeRefreshRef.current) {
        clearInterval(attributeRefreshRef.current);
        attributeRefreshRef.current = null;
      }
    }, 120000);
  };

  const startPollingForAutoTag = (jobId: string) => {
    // Clear any existing auto_tag polling
    if (autoTagPollingRef.current) {
      clearInterval(autoTagPollingRef.current);
    }
    
    // Poll for auto_tag job completion
    autoTagPollingRef.current = setInterval(async () => {
      if (!id || !user) return;

      try {
        const { data: job, error } = await getAIJob(jobId);
        
        if (error || !job) {
          // Job not found or error - switch to periodic refresh
          clearInterval(autoTagPollInterval);
          startPeriodicAttributeRefresh();
          return;
        }

        // Check if job completed
        if (job.status === 'succeeded' || job.status === 'failed') {
          // Clear polling
          if (autoTagPollingRef.current) {
            clearInterval(autoTagPollingRef.current);
            autoTagPollingRef.current = null;
          }

          // Refresh attributes and item data
          if (job.status === 'succeeded') {
            const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id);
            if (itemAttributes) {
              setAttributes(itemAttributes);
            }
            // Refresh item to get updated title/category
            const { data: refreshedItem } = await getWardrobeItem(id);
            if (refreshedItem) {
              setItem(refreshedItem);
              // Update category if it was set
              if (refreshedItem.category_id) {
                const { data: categories } = await getWardrobeCategories();
                const foundCategory = categories?.find((c) => c.id === refreshedItem.category_id);
                if (foundCategory) {
                  setCategory(foundCategory);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling for auto_tag:', error);
        // Switch to periodic refresh on error
        if (autoTagPollingRef.current) {
          clearInterval(autoTagPollingRef.current);
          autoTagPollingRef.current = null;
        }
        startPeriodicAttributeRefresh();
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds (30 attempts) and switch to periodic refresh
    setTimeout(() => {
      if (autoTagPollingRef.current) {
        clearInterval(autoTagPollingRef.current);
        autoTagPollingRef.current = null;
      }
      startPeriodicAttributeRefresh();
    }, 60000);
  };

  const startPollingForProductShot = (jobId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds for job completion
    pollingIntervalRef.current = setInterval(async () => {
      if (!id || !user) return;

      try {
        const { data: job, error } = await getAIJob(jobId);
        
        if (error || !job) {
          // Job not found or error - switch to periodic refresh
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          startPeriodicImageRefresh();
          return;
        }

        // Check if job completed
        if (job.status === 'succeeded' || job.status === 'failed') {
          setIsGeneratingProductShot(false);
          
          // Clear polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Refresh images to show the new product shot
          if (job.status === 'succeeded') {
            await refreshImages();
          }
        }
      } catch (error) {
        console.error('Error polling for product shot:', error);
        // Switch to periodic refresh on error
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        startPeriodicImageRefresh();
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds (30 attempts) and switch to periodic refresh
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Switch to periodic refresh as fallback
      startPeriodicImageRefresh();
    }, 60000);
  };

  const loadNavigationItems = async () => {
    if (!itemIds || !user) return;

    try {
      const idsArray = itemIds.split(',');
      const currentIndex = idsArray.indexOf(id || '');
      setCurrentItemIndex(currentIndex >= 0 ? currentIndex : 0);

      // Load items by IDs (keep this optimization - it's fine)
      const { data: allItems } = await getWardrobeItemsByIds(idsArray);
      
      if (!allItems || allItems.length === 0) return;

      // Create a map for quick lookup
      const itemsMap = new Map(allItems.map(item => [item.id, item]));

      // OPTIMIZED: Load images for first 6 navigation items only (prevents timeout on large lists)
      const visibleItemIds = idsArray.slice(0, 6);
      const { data: imagesMap } = await getWardrobeItemsImages(visibleItemIds);

      const navItems = idsArray.map((itemId) => {
        const foundItem = itemsMap.get(itemId);
        if (!foundItem) return null;

        // Get first image for thumbnail from loaded images (only first 6 have images)
        const images = imagesMap.get(itemId) || [];
        let imageUrl: string | null = null;
        if (images.length > 0 && images[0].image?.storage_key) {
          const storageBucket = images[0].image.storage_bucket || 'media';
          const { data: urlData } = supabase.storage
            .from(storageBucket)
            .getPublicUrl(images[0].image.storage_key);
          imageUrl = urlData?.publicUrl || null;
        }

        return {
          id: itemId,
          title: foundItem.title,
          imageUrl,
        };
      }).filter((item): item is { id: string; title: string; imageUrl: string | null } => item !== null);

      setNavigationItems(navItems);
    } catch (error) {
      console.error('Failed to load navigation items:', error);
    }
  };

  const getImageUrl = (imageData: any): string | null => {
    if (!imageData) return null;
    const { data: urlData } = supabase.storage
      .from(imageData.storage_bucket || 'media')
      .getPublicUrl(imageData.storage_key);
    return urlData.publicUrl;
  };

  const navigateToItem = (targetItemId: string) => {
    if (!itemIds) return;
    router.replace(`/wardrobe/item/${targetItemId}?itemIds=${itemIds}`);
  };

  const toggleFavorite = async () => {
    if (!id || !user || !item) return;

    try {
      const newFavoriteStatus = !item.is_favorite;
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', id)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      // Update local state
      setItem({ ...item, is_favorite: newFavoriteStatus });
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleAddToOutfit = () => {
    if (!item || !category) {
      Alert.alert('Error', 'Item data not loaded');
      return;
    }
    // Navigate to outfit editor with item preselected
    router.push(`/outfits/new?category_id=${item.category_id}&item_id=${item.id}`);
  };

  const handleSaveItem = async () => {
    if (!id || !user || isSaving) return;

    setIsSaving(true);
    const isCurrentlySaved = isSaved;

    if (isCurrentlySaved) {
      const { error } = await unsaveWardrobeItem(user.id, id);
      if (!error) {
        setIsSaved(false);
        Alert.alert('Success', 'Item removed from your wardrobe');
      } else {
        Alert.alert('Error', 'Failed to remove item from wardrobe');
      }
    } else {
      const { error } = await saveWardrobeItem(user.id, id);
      if (!error) {
        setIsSaved(true);
        Alert.alert('Success', 'Item saved to your wardrobe');
      } else {
        Alert.alert('Error', 'Failed to save item to wardrobe');
      }
    }

    setIsSaving(false);
  };

  const isOwnItem = item && user && item.owner_user_id === user.id && !isReadOnly;

  const handleEdit = () => {
    if (!id || !isOwnItem) return;
    // Navigate to edit screen (we'll create this route)
    router.push(`/wardrobe/item/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!isOwnItem) return;
    if (!id || !user) return;

    // Web fallback using window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
      
      if (!confirmed) return;
      
      try {
        // Archive the item (soft delete)
        const { error } = await supabase
          .from('wardrobe_items')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', id)
          .eq('owner_user_id', user.id);

        if (error) {
          throw error;
        }

        alert('Item deleted successfully');
        router.back();
      } catch (error: any) {
        alert(error.message || 'Failed to delete item');
      }
      return;
    }

    // Native Alert for iOS/Android
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Archive the item (soft delete)
              const { error } = await supabase
                .from('wardrobe_items')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', id)
                .eq('owner_user_id', user.id);

              if (error) {
                throw error;
              }

              Alert.alert('Success', 'Item deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!item || !user) return;

    try {
      // Generate share link (for now, use app link - can be enhanced with private link slugs)
      const shareUrl = `${process.env.EXPO_PUBLIC_APP_URL || 'https://fullstylist.app'}/wardrobe/item/${id}`;
      const message = `Check out my ${item.title} on Full Stylist!`;

      await Share.share({
        message: `${message}\n${shareUrl}`,
        title: item.title,
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setShowImageModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back, Edit, Delete, and Share - STICKY */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRightButtons}>
          {isOwnItem && (
            <TouchableOpacity onPress={toggleFavorite} style={styles.headerButton}>
              <Ionicons
                name={item?.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item?.is_favorite ? '#ff0000' : '#000'}
              />
            </TouchableOpacity>
          )}
          {isOwnItem && (
            <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
              <Ionicons name="pencil-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          {isOwnItem && (
            <TouchableOpacity onPress={handleDelete} style={[styles.headerButton, styles.deleteButton]}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content - Image and Details */}
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel - Square aspect ratio */}
        {displayImages.length > 0 ? (
          <View style={[styles.carouselContainer, { width: currentScreenWidth, alignSelf: 'center' }]}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const { contentOffset, layoutMeasurement } = event.nativeEvent;
                const calculatedIndex = Math.round(contentOffset.x / layoutMeasurement.width);
                if (calculatedIndex !== currentImageIndex && calculatedIndex >= 0 && calculatedIndex < displayImages.length) {
                  setCurrentImageIndex(calculatedIndex);
                }
              }}
              scrollEventThrottle={16}
              style={styles.carousel}
            >
            {displayImages.map((itemImage, index) => {
              const imageUrl = getImageUrl(itemImage.image);
              return (
                <TouchableOpacity
                  key={itemImage.id}
                  style={[styles.imageContainer, { width: currentScreenWidth }]}
                  onPress={() => openImageModal(index)}
                  activeOpacity={0.9}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>No Image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            </ScrollView>

            {/* Image Indicator - Now inside carousel container */}
            {displayImages.length > 1 && (
              <View style={styles.indicatorContainer}>
                <Text style={styles.indicatorText}>
                  {currentImageIndex + 1} / {displayImages.length}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}

        {/* Item Details Section */}
        <View style={styles.detailsContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>

        {item.brand && (
          <Text style={styles.itemBrand}>{item.brand}</Text>
        )}

        {category && (
          <Text style={styles.itemCategory}>{category.name}</Text>
        )}

        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}

        {/* Attributes */}
        {attributes.length > 0 && (() => {
          // Group attributes by definition key
          const groupedAttributes = attributes.reduce((acc, attr) => {
            const key = attr.attribute_definitions?.key || attr.definition_id;
            if (!acc[key]) {
              acc[key] = {
                name: attr.attribute_definitions?.name || attr.attribute_definitions?.key || key,
                values: [] as string[],
              };
            }
            const value = attr.attribute_values?.value || attr.raw_value || '';
            if (value) {
              acc[key].values.push(value);
            }
            return acc;
          }, {} as Record<string, { name: string; values: string[] }>);

          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attributes</Text>
              <View style={styles.attributesList}>
                {Object.entries(groupedAttributes).map(([key, groupData]) => {
                  const data = groupData as { name: string; values: string[] };
                  return (
                    <View key={key} style={styles.attributeItem}>
                      <Text style={styles.attributeKey}>{data.name}:</Text>
                      <Text style={styles.attributeValue}>{data.values.join(', ')}</Text>
                    </View>
                  );
                })}
                {/* Size field at the bottom */}
                {item.size && (
                  <View style={styles.attributeItem}>
                    <Text style={styles.attributeKey}>Size:</Text>
                    <Text style={styles.attributeValue}>
                      {typeof item.size === 'string' ? item.size : JSON.stringify(item.size)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsList}>
              {tags.map((tag) => (
                <View key={tag.id} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Metadata */}
        {(item.material) && (
          <View style={styles.section}>
            {item.material && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Material:</Text>
                <Text style={styles.metadataValue}>
                  {typeof item.material === 'string' ? item.material : JSON.stringify(item.material)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isReadOnly && !isOwnItem && (
            <TouchableOpacity 
              style={[styles.saveButton, isSaved && styles.saveButtonActive]} 
              onPress={handleSaveItem}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name={isSaved ? 'bookmark' : 'bookmark-outline'} 
                    size={20} 
                    color={isSaved ? '#007AFF' : '#fff'} 
                    style={styles.saveButtonIcon}
                  />
                  <Text style={[styles.saveButtonText, { color: isSaved ? '#007AFF' : '#fff' }]}>
                    {isSaved ? 'Saved to Wardrobe' : 'Save to My Wardrobe'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addToOutfitButton} onPress={handleAddToOutfit}>
            <Text style={styles.addToOutfitButtonText}>Add to Outfit</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.modalCloseText}>×</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const containerWidth = event.nativeEvent.layoutMeasurement.width;
              const index = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
              setModalImageIndex(index);
            }}
            style={styles.modalCarousel}
          >
            {displayImages.map((itemImage) => {
              const imageUrl = getImageUrl(itemImage.image);
              return (
                <View key={itemImage.id} style={[styles.modalImageContainer, { width: currentScreenWidth }]}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.modalImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>No Image</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {displayImages.length > 1 && (
            <View style={styles.modalIndicator}>
              <Text style={styles.modalIndicatorText}>
                {modalImageIndex + 1} / {displayImages.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Item Navigation Slider */}
      {navigationItems.length > 1 && (
        <View style={styles.navigationContainer}>
          <ScrollView
            ref={navigationScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigationScrollContent}
          >
            {navigationItems.map((navItem, index) => {
              const isActive = navItem.id === id;
              return (
                <TouchableOpacity
                  key={navItem.id}
                  style={[styles.navigationItem, isActive && styles.navigationItemActive]}
                  onPress={() => !isActive && navigateToItem(navItem.id)}
                >
                  {navItem.imageUrl ? (
                    <Image
                      source={{ uri: navItem.imageUrl }}
                      style={styles.navigationImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.navigationImagePlaceholder}>
                      <Text style={styles.navigationImagePlaceholderText}>?</Text>
                    </View>
                  )}
                  {isActive && <View style={styles.navigationActiveIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  deleteButton: {
    // No special background, icon color will indicate delete action
  },
  carouselContainer: {
    // Width is set inline using currentScreenWidth (capped at 630px max)
    aspectRatio: 1, // Square container (1:1 aspect ratio)
    backgroundColor: '#000',
  },
  carousel: {
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    // Width is set inline using currentScreenWidth to fix ScrollView paging issue
    aspectRatio: 1, // Square (1:1)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 16,
  },
  noImageContainer: {
    width: '100%',
    aspectRatio: 1, // Square
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noImageText: {
    color: '#666',
    fontSize: 16,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingDialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingDialogMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 100, // Space for sticky header
    paddingBottom: 100,
  },
  detailsContent: {
    padding: 20,
    backgroundColor: '#fff',
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  itemBrand: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  attributesList: {
    gap: 8,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  attributeKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  attributeValue: {
    fontSize: 14,
    color: '#000',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  metadataValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonActive: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  saveButtonIcon: {
    marginRight: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addToOutfitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addToOutfitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalCarousel: {
    flex: 1,
  },
  modalImageContainer: {
    // Width is set inline using currentScreenWidth to fix ScrollView paging issue
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  navigationScrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  navigationItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navigationItemActive: {
    borderColor: '#fff',
  },
  navigationImage: {
    width: '100%',
    height: '100%',
  },
  navigationImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationImagePlaceholderText: {
    color: '#666',
    fontSize: 16,
  },
  navigationActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#fff',
  },
});
