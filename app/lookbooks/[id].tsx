import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
  TextInput,
  RefreshControl,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getLookbook, deleteLookbook, Lookbook, LookbookOutfit, getSystemLookbookOutfits, saveLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { createPost } from '@/lib/posts';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function LookbookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [lookbook, setLookbook] = useState<Lookbook | null>(null);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [slideshowVisible, setSlideshowVisible] = useState(false);
  const [slideshowLoading, setSlideshowLoading] = useState(false);
  const [slideshowOutfits, setSlideshowOutfits] = useState<any[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<Map<string, string | null>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'followers' | 'private_link' | 'private'>('followers');
  const [saving, setSaving] = useState(false);
  
  // Outfit actions menu state
  const [showOutfitMenu, setShowOutfitMenu] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<any | null>(null);
  
  // Add outfits modal state
  const [showAddOutfitsModal, setShowAddOutfitsModal] = useState(false);
  const [availableOutfits, setAvailableOutfits] = useState<any[]>([]);
  const [selectedNewOutfits, setSelectedNewOutfits] = useState<Set<string>>(new Set());
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [addingOutfits, setAddingOutfits] = useState(false);
  const [addOutfitImageUrls, setAddOutfitImageUrls] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (id && user) {
      loadLookbook();
    }
  }, [id, user]);

  // Reload lookbook when screen comes into focus (e.g., after deleting an outfit)
  useFocusEffect(
    React.useCallback(() => {
      if (id && user) {
        loadLookbook();
      }
    }, [id, user])
  );

  const loadLookbook = async () => {
    if (!id || !user) return;

    setLoading(true);

    try {
      // Check if this is a virtual system lookbook
      if (typeof id === 'string' && id.startsWith('system-')) {
        const systemType = id.replace('system-', '') as 'all' | 'favorites' | 'recent' | 'top';
        const systemTypeMap = {
          all: 'system_all',
          favorites: 'system_favorites',
          recent: 'system_recent',
          top: 'system_top',
        } as const;
        
        const titleMap = {
          all: 'All Outfits',
          favorites: 'Favorites',
          recent: 'Recent',
          top: 'Top Rated',
        };

        // Create virtual lookbook object
        const virtualLookbook: Lookbook = {
          id: id,
          owner_user_id: 'system', // Special owner to prevent delete/publish
          title: titleMap[systemType],
          description: `Your ${titleMap[systemType].toLowerCase()} collection`,
          visibility: 'private',
          type: systemTypeMap[systemType],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setLookbook(virtualLookbook);

        // Load system outfits
        const { data: systemOutfitsResult } = await getSystemLookbookOutfits(
          user.id,
          systemTypeMap[systemType]
        );
        
        if (systemOutfitsResult) {
          const { data: allOutfits } = await getUserOutfits(user.id);
          if (allOutfits) {
            const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
            const outfitsWithData = systemOutfitsResult
              .map((so) => outfitMap.get(so.outfit_id))
              .filter(Boolean);
            setOutfits(outfitsWithData);
          }
        }
      } else {
        // Regular database lookbook
        const { data, error } = await getLookbook(id as string);

        if (error || !data) {
          Alert.alert('Error', 'Failed to load lookbook');
          router.back();
          return;
        }

        setLookbook(data.lookbook);

        // Load outfits based on lookbook type
        if (data.lookbook.type === 'custom_manual') {
          // Get outfit details for manual lookbooks
          // FIX: Get outfits from the lookbook owner, not the current user!
          const { data: allOutfits } = await getUserOutfits(data.lookbook.owner_user_id);
          
          if (allOutfits) {
            const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
            const lookbookOutfits = data.outfits
              .map((lo: LookbookOutfit) => outfitMap.get(lo.outfit_id))
              .filter(Boolean);
            
            setOutfits(lookbookOutfits);
          }
        } else {
          // For other system lookbooks, show empty for now
          setOutfits([]);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to load lookbook: ${error.message}`);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!lookbook) return;
    
    // Populate edit form with current values
    setEditTitle(lookbook.title);
    setEditDescription(lookbook.description || '');
    setEditVisibility(lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !lookbook || !editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);

    try {
      // Get current outfit IDs in order
      const outfitIds = outfits.map(outfit => outfit.id);

      const { error } = await saveLookbook(
        user.id,
        {
          id: lookbook.id,
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          visibility: editVisibility,
          type: lookbook.type,
        },
        outfitIds
      );

      if (error) {
        Alert.alert('Error', 'Failed to update lookbook');
      } else {
        setShowEditModal(false);
        // Reload the lookbook
        await loadLookbook();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update lookbook');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOutfit = (outfitId: string) => {
    Alert.alert(
      'Remove Outfit',
      'Remove this outfit from the lookbook?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Remove from local state
            setOutfits(prevOutfits => prevOutfits.filter(o => o.id !== outfitId));
          },
        },
      ]
    );
  };

  const handleRemoveOutfitFromMenu = async () => {
    if (!selectedOutfit || !user || !lookbook) {
      setShowOutfitMenu(false);
      return;
    }

    setShowOutfitMenu(false);

    const removeOutfitAction = async () => {
      try {
        // Get updated outfit IDs (excluding the one to remove)
        const updatedOutfitIds = outfits
          .filter(o => o.id !== selectedOutfit.id)
          .map(o => o.id);

        // Save to database
        const { error } = await saveLookbook(
          user.id,
          {
            id: lookbook.id,
            title: lookbook.title,
            description: lookbook.description,
            visibility: lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility,
            type: lookbook.type,
          },
          updatedOutfitIds
        );

        if (error) {
          if (Platform.OS === 'web') {
            alert('Error: Failed to remove outfit from lookbook');
          } else {
            Alert.alert('Error', 'Failed to remove outfit from lookbook');
          }
        } else {
          // Update local state
          setOutfits(prevOutfits => prevOutfits.filter(o => o.id !== selectedOutfit.id));
        }
      } catch (error: any) {
        if (Platform.OS === 'web') {
          alert(`Error: ${error.message || 'Failed to remove outfit'}`);
        } else {
          Alert.alert('Error', error.message || 'Failed to remove outfit');
        }
      }
    };

    // Platform-specific confirmation
    if (Platform.OS === 'web') {
      if (confirm('Remove this outfit from the lookbook?')) {
        await removeOutfitAction();
      }
    } else {
      Alert.alert(
        'Remove Outfit',
        'Remove this outfit from the lookbook?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: removeOutfitAction,
          },
        ]
      );
    }
  };

  const handleEditOutfitFromMenu = () => {
    if (!selectedOutfit) return;
    setShowOutfitMenu(false);
    router.push(`/outfits/${selectedOutfit.id}`);
  };

  const openOutfitMenu = (outfit: any) => {
    setSelectedOutfit(outfit);
    setShowOutfitMenu(true);
  };

  const openAddOutfitsModal = async () => {
    if (!user) return;
    
    setLoadingOutfits(true);
    setShowAddOutfitsModal(true);
    
    try {
      // Load all user outfits
      const { data: allOutfits } = await getUserOutfits(user.id);
      if (allOutfits) {
        // Filter out outfits already in the lookbook
        const existingOutfitIds = new Set(outfits.map(o => o.id));
        const available = allOutfits.filter((o: any) => !existingOutfitIds.has(o.id));
        setAvailableOutfits(available);
        
        // Pre-load all outfit images
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
  };

  const toggleNewOutfitSelection = React.useCallback((outfitId: string) => {
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

  const handleAddOutfits = async () => {
    if (!user || !lookbook || selectedNewOutfits.size === 0) return;

    setAddingOutfits(true);
    try {
      // Get updated outfit IDs (existing + new)
      const updatedOutfitIds = [
        ...outfits.map(o => o.id),
        ...Array.from(selectedNewOutfits)
      ];

      const { error } = await saveLookbook(
        user.id,
        {
          id: lookbook.id,
          title: lookbook.title,
          description: lookbook.description,
          visibility: lookbook.visibility === 'inherit' ? 'followers' : lookbook.visibility,
          type: lookbook.type,
        },
        updatedOutfitIds
      );

      if (error) {
        Alert.alert('Error', 'Failed to add outfits to lookbook');
      } else {
        // Close modal and reload lookbook
        setShowAddOutfitsModal(false);
        setSelectedNewOutfits(new Set());
        await loadLookbook();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add outfits');
    } finally {
      setAddingOutfits(false);
    }
  };

  const handleDelete = async () => {
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
  };

  const handlePublish = async () => {
    if (!user || !lookbook) {
      return;
    }

    setPublishing(true);
    
    try {
      const { data: post, error } = await createPost(
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
  };

  const openSlideshow = async () => {
    if (outfits.length === 0) return;

    setSlideshowLoading(true);
    
    try {
      // Pre-load all images BEFORE opening slideshow
      const imageMap = new Map<string, string | null>();
      const loadPromises = outfits.map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        imageMap.set(outfit.id, url);
      });
      await Promise.all(loadPromises);
      
      // Now open the slideshow with images ready
      setSlideshowImages(imageMap);
      setSlideshowOutfits(outfits);
      setCurrentSlideIndex(0);
      setIsAutoPlaying(true);
      setSlideshowVisible(true);
    } finally {
      setSlideshowLoading(false);
    }
  };

  const closeSlideshow = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
    setSlideshowVisible(false);
    setSlideshowOutfits([]);
    setSlideshowImages(new Map());
    setCurrentSlideIndex(0);
    setIsAutoPlaying(true);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slideshowOutfits.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setCurrentSlideIndex(0); // Loop back to start
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else {
      setCurrentSlideIndex(slideshowOutfits.length - 1); // Loop to end
    }
  };

  const handleManualNavigation = (direction: 'next' | 'prev') => {
    // Pause auto-play when user manually navigates
    setIsAutoPlaying(false);
    if (direction === 'next') {
      nextSlide();
    } else {
      previousSlide();
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const toggleFavorite = async (outfitId: string, currentFavoriteStatus: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: !currentFavoriteStatus })
        .eq('id', outfitId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      // Update local state
      setOutfits(prevOutfits =>
        prevOutfits.map(outfit =>
          outfit.id === outfitId ? { ...outfit, is_favorite: !currentFavoriteStatus } : outfit
        )
      );
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Auto-play effect
  useEffect(() => {
    if (slideshowVisible && isAutoPlaying && slideshowOutfits.length > 0) {
      const interval = setInterval(() => {
        nextSlide();
      }, 4000); // 4 seconds per slide
      setAutoPlayInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
  }, [slideshowVisible, isAutoPlaying, currentSlideIndex, slideshowOutfits.length]);

  // Separate component for Add Outfits modal outfit cards - now receives pre-loaded imageUrl
  const AddOutfitCard = React.memo(({ item, imageUrl, isSelected, onToggle }: { item: any; imageUrl: string | null; isSelected: boolean; onToggle: (id: string) => void }) => {
    return (
      <TouchableOpacity
        style={[
          styles.addOutfitCard,
          isSelected && styles.addOutfitCardSelected
        ]}
        onPress={() => onToggle(item.id)}
      >
        {imageUrl ? (
          <ExpoImage 
            source={{ uri: imageUrl }} 
            style={styles.addOutfitImage} 
            contentFit="cover" 
          />
        ) : (
          <View style={styles.addOutfitImagePlaceholder}>
            <Text style={styles.addOutfitImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.addOutfitCardOverlay}>
          {isSelected && (
            <View style={styles.addOutfitSelectedBadge}>
              <Text style={styles.addOutfitSelectedBadgeText}>✓</Text>
            </View>
          )}
          <Text style={styles.addOutfitCardTitle} numberOfLines={2}>
            {item.title || 'Untitled Outfit'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  const OutfitCard = ({ item, index }: { item: any; index: number }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      getOutfitCoverImageUrl(item).then(setImageUrl);
    }, [item]);

    const handlePress = () => {
      // Pass lookbook context to outfit view
      router.push({
        pathname: `/outfits/${item.id}/view`,
        params: {
          lookbookId: id as string,
          lookbookTitle: lookbook?.title || '',
          outfitIndex: index.toString(),
        },
      });
    };

    const handleFavoritePress = (e: any) => {
      e.stopPropagation();
      toggleFavorite(item.id, item.is_favorite || false);
    };

    const handleMenuPress = (e: any) => {
      e.stopPropagation();
      openOutfitMenu(item);
    };

    return (
      <TouchableOpacity
        style={styles.outfitCard}
        onPress={handlePress}
      >
        {imageUrl ? (
          <>
            <ExpoImage source={{ uri: imageUrl }} style={styles.outfitImage} contentFit="cover" />
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
          <View style={styles.outfitImagePlaceholder}>
            <Text style={styles.outfitImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.outfitTitleRow}>
          <Text style={styles.outfitTitle} numberOfLines={2}>
            {item.title || 'Untitled Outfit'}
          </Text>
          {lookbook?.type.startsWith('custom_') && (
            <TouchableOpacity
              onPress={handleMenuPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={18}
                color="#666"
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (!lookbook) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Lookbook not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {outfits.length > 0 && (
            <TouchableOpacity onPress={openSlideshow} disabled={slideshowLoading}>
              <Text style={[styles.playButton, slideshowLoading && styles.playButtonDisabled]}>
                {slideshowLoading ? 'Loading...' : '▶ Play'}
              </Text>
            </TouchableOpacity>
          )}
          {lookbook.owner_user_id === user?.id && lookbook.type.startsWith('custom_') && (
            <>
              <TouchableOpacity onPress={handleEdit} style={styles.headerIconButton}>
                <Ionicons name="pencil-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePublish} disabled={publishing} style={styles.headerIconButton}>
                {publishing ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="paper-plane-outline" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} disabled={deleting} style={styles.headerIconButton}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Lookbook Header */}
        <View style={styles.lookbookHeader}>
          <Text style={styles.lookbookTitle}>{lookbook.title}</Text>
          {lookbook.description && (
            <Text style={styles.lookbookDescription}>{lookbook.description}</Text>
          )}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Visibility:</Text>
              <Text style={styles.metadataValue}>
                {lookbook.visibility === 'public'
                  ? 'Public'
                  : lookbook.visibility === 'followers'
                  ? 'Followers'
                  : lookbook.visibility === 'private_link'
                  ? 'Private Link'
                  : 'Private'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Outfits:</Text>
              <Text style={styles.metadataValue}>{outfits.length}</Text>
            </View>
          </View>
        </View>

        {/* Outfits Grid */}
        {outfits.length === 0 ? (
          <View style={styles.emptyOutfitsContainer}>
            <Text style={styles.emptyOutfitsText}>No outfits in this lookbook yet</Text>
            {lookbook.type === 'custom_manual' && lookbook.owner_user_id === user?.id && (
              <TouchableOpacity
                style={styles.addOutfitsButton}
                onPress={openAddOutfitsModal}
              >
                <Text style={styles.addOutfitsButtonText}>Add Outfits</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.outfitsSection}>
            <Text style={styles.sectionTitle}>Outfits</Text>
            <FlatList
              data={outfits}
              renderItem={({ item, index }) => <OutfitCard item={item} index={index} />}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.outfitsList}
            />
          </View>
        )}
      </ScrollView>

      {/* Outfit Actions Menu Modal */}
      <Modal
        visible={showOutfitMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutfitMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setShowOutfitMenu(false)}
        >
          <View style={styles.menuModalContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditOutfitFromMenu}
            >
              <Ionicons name="create-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Edit Outfit</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRemoveOutfitFromMenu}
            >
              <Ionicons name="remove-circle-outline" size={20} color="#FF3B30" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Remove from Lookbook
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.editModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Lookbook</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              <Text style={[styles.editModalSave, saving && styles.editModalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalContent}>
            {/* Title */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Title *</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Lookbook title"
                placeholderTextColor="#999"
              />
            </View>

            {/* Description */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Add a description..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Visibility */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Visibility</Text>
              <View style={styles.visibilityOptions}>
                {[
                  { value: 'public', label: 'Public' },
                  { value: 'followers', label: 'Followers' },
                  { value: 'private_link', label: 'Private Link' },
                  { value: 'private', label: 'Private' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.visibilityOption,
                      editVisibility === option.value && styles.visibilityOptionActive,
                    ]}
                    onPress={() => setEditVisibility(option.value as any)}
                  >
                    <Text
                      style={[
                        styles.visibilityOptionText,
                        editVisibility === option.value && styles.visibilityOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Outfits */}
            <View style={styles.editField}>
              <View style={styles.editOutfitsHeader}>
                <Text style={styles.editLabel}>Outfits ({outfits.length})</Text>
                <TouchableOpacity
                  style={styles.editAddOutfitsButton}
                  onPress={() => {
                    setShowEditModal(false);
                    openAddOutfitsModal();
                  }}
                >
                  <Text style={styles.editAddOutfitsButtonText}>+ Add Outfits</Text>
                </TouchableOpacity>
              </View>
              {outfits.map((outfit, index) => (
                <View key={outfit.id} style={styles.editOutfitItem}>
                  <Text style={styles.editOutfitTitle} numberOfLines={1}>
                    {index + 1}. {outfit.title || 'Untitled Outfit'}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveOutfit(outfit.id)}>
                    <Text style={styles.editOutfitRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {outfits.length === 0 && (
                <Text style={styles.editOutfitEmpty}>No outfits in this lookbook</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Loading Modal */}
      <Modal
        visible={slideshowLoading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingModalContainer}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingModalText}>Loading slideshow...</Text>
          </View>
        </View>
      </Modal>

      {/* Add Outfits Modal */}
      <Modal
        visible={showAddOutfitsModal}
        animationType="slide"
        onRequestClose={() => {
          setShowAddOutfitsModal(false);
          setSelectedNewOutfits(new Set());
        }}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddOutfitsModal(false);
              setSelectedNewOutfits(new Set());
            }}>
              <Text style={styles.editModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Add Outfits</Text>
            <TouchableOpacity 
              onPress={handleAddOutfits} 
              disabled={addingOutfits || selectedNewOutfits.size === 0}
            >
              <Text style={[
                styles.editModalSave, 
                (addingOutfits || selectedNewOutfits.size === 0) && styles.editModalSaveDisabled
              ]}>
                {addingOutfits ? 'Adding...' : `Add (${selectedNewOutfits.size})`}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingOutfits ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : availableOutfits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No more outfits to add</Text>
              <Text style={styles.emptySubtext}>All your outfits are already in this lookbook</Text>
            </View>
          ) : (
            <FlatList
              data={availableOutfits}
              renderItem={({ item }) => (
                <AddOutfitCard
                  item={item}
                  imageUrl={addOutfitImageUrls.get(item.id) || null}
                  isSelected={selectedNewOutfits.has(item.id)}
                  onToggle={toggleNewOutfitSelection}
                />
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.addOutfitsList}
            />
          )}
        </View>
      </Modal>

      {/* Slideshow Modal */}
      <Modal
        visible={slideshowVisible}
        animationType="fade"
        onRequestClose={closeSlideshow}
        statusBarTranslucent
      >
        <View style={styles.slideshowContainer}>
          <StatusBar hidden />
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={closeSlideshow}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <TouchableOpacity style={styles.playPauseButton} onPress={toggleAutoPlay}>
            <Text style={styles.playPauseButtonText}>
              {isAutoPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Current Slide */}
          {slideshowOutfits.length > 0 && (
            <>
              <SlideshowSlide 
                outfit={slideshowOutfits[currentSlideIndex]} 
                imageUrl={slideshowImages.get(slideshowOutfits[currentSlideIndex].id) || null}
              />
              
              {/* Navigation Arrows */}
              <TouchableOpacity style={styles.leftArrow} onPress={() => handleManualNavigation('prev')}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rightArrow} onPress={() => handleManualNavigation('next')}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              {/* Slide Counter */}
              <View style={styles.slideCounter}>
                <Text style={styles.slideCounterText}>
                  {currentSlideIndex + 1} / {slideshowOutfits.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Slideshow Slide Component
const SlideshowSlide = ({ outfit, imageUrl }: { outfit: any; imageUrl: string | null }) => {
  return (
    <View style={styles.slide}>
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.slideImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
        />
      ) : (
        <View style={styles.slideImagePlaceholder}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <View style={styles.slideInfo}>
        <Text style={styles.slideTitle}>{outfit.title || 'Untitled Outfit'}</Text>
        {outfit.description && (
          <Text style={styles.slideDescription}>{outfit.description}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  headerIconButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  lookbookHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  lookbookTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  lookbookDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  outfitsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  outfitsList: {
    gap: 8,
  },
  outfitCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    padding: 2,
  },
  outfitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  outfitImagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  outfitTitle: {
    flex: 1,
    fontSize: 14,
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
  },
  emptyOutfitsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyOutfitsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  addOutfitsButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addOutfitsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading Modal Styles
  loadingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    padding: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  loadingModalText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  // Slideshow Modal Styles
  slideshowContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  playPauseButton: {
    position: 'absolute',
    top: 50,
    right: 70,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  slideImagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  slideTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  slideDescription: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  leftArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  slideCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  slideCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Outfit Menu Modal Styles
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  menuItemTextDanger: {
    color: '#FF3B30',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  editModalCancel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  editModalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  editModalSaveDisabled: {
    opacity: 0.5,
  },
  editModalContent: {
    flex: 1,
    padding: 16,
  },
  editField: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  visibilityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visibilityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  visibilityOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  visibilityOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  visibilityOptionTextActive: {
    color: '#fff',
  },
  editOutfitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  editOutfitTitle: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginRight: 12,
  },
  editOutfitRemove: {
    fontSize: 20,
    color: '#FF3B30',
    fontWeight: '600',
  },
  editOutfitEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  editOutfitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editAddOutfitsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  editAddOutfitsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Add Outfits Modal Styles
  addOutfitsList: {
    padding: 8,
  },
  addOutfitCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  addOutfitCardSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  addOutfitImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  addOutfitImagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOutfitImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  addOutfitCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  addOutfitSelectedBadge: {
    position: 'absolute',
    top: -60,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOutfitSelectedBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addOutfitCardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
