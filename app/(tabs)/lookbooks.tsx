import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserLookbooks,
  getSystemLookbookOutfits,
  Lookbook,
  getLookbook,
} from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';

type SystemCategory = 'all' | 'favorites' | 'recent' | 'top';

interface SystemLookbookData {
  category: SystemCategory;
  title: string;
  icon: string;
  outfits: any[];
  coverImageUrl: string | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LookbooksScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [lookbookThumbnails, setLookbookThumbnails] = useState<Map<string, string | null>>(new Map());
  const [loadingLookbookIds, setLoadingLookbookIds] = useState<Set<string>>(new Set());
  const [systemLookbooks, setSystemLookbooks] = useState<SystemLookbookData[]>([]);
  const [outfitImagesCache, setOutfitImagesCache] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slideshowVisible, setSlideshowVisible] = useState(false);
  const [slideshowLoading, setSlideshowLoading] = useState(false);
  const [slideshowOutfits, setSlideshowOutfits] = useState<any[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<Map<string, string | null>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (user && !isLoadingData) {
      loadData();
    }
  }, [user]);

  // Reload data when screen comes into focus (e.g., after deleting an outfit)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadData();
      }
    }, [user])
  );

  const loadData = async () => {
    if (!user || isLoadingData) return;

    setIsLoadingData(true);
    setLoading(true);

    // Load custom lookbooks and all system categories in parallel
    const [
      customLookbooksResult,
      allOutfitsResult,
      favoritesResult,
      recentResult,
      topResult,
    ] = await Promise.all([
      getUserLookbooks(user.id),
      getSystemLookbookOutfits(user.id, 'system_all'),
      getSystemLookbookOutfits(user.id, 'system_favorites'),
      getSystemLookbookOutfits(user.id, 'system_recent'),
      getSystemLookbookOutfits(user.id, 'system_top'),
    ]);

    // Get all outfits for mapping
    const { data: allUserOutfits } = await getUserOutfits(user.id);
    const outfitMap = allUserOutfits ? new Map(allUserOutfits.map((o: any) => [o.id, o])) : new Map();

    // Process custom lookbooks
    if (customLookbooksResult.data) {
      const filtered = customLookbooksResult.data.filter((lb) => lb.type.startsWith('custom_'));
      setLookbooks(filtered);
      
      // Mark all lookbooks as loading
      setLoadingLookbookIds(new Set(filtered.map(lb => lb.id)));
      
      // Load thumbnails for each lookbook in parallel
      const thumbnailPromises = filtered.map(async (lookbook) => {
        if (lookbook.type === 'custom_manual') {
          const { data } = await getLookbook(lookbook.id);
          if (data && data.outfits.length > 0 && allUserOutfits) {
            const firstOutfit = allUserOutfits.find((o: any) => o.id === data.outfits[0].outfit_id);
            if (firstOutfit) {
              const imageUrl = await getOutfitCoverImageUrl(firstOutfit);
              return { id: lookbook.id, url: imageUrl };
            }
          }
        }
        return null;
      });
      
      const thumbnailResults = await Promise.all(thumbnailPromises);
      const thumbnailMap = new Map<string, string | null>();
      thumbnailResults.forEach(result => {
        if (result) {
          thumbnailMap.set(result.id, result.url);
        }
      });
      
      setLookbookThumbnails(thumbnailMap);
      setLoadingLookbookIds(new Set());
    }

    // Process system lookbooks (no cover images needed - using icons only)
    const systemCategories: { category: SystemCategory; title: string; icon: string; result: any }[] = [
      { category: 'all', title: 'All Outfits', icon: '👔', result: allOutfitsResult },
      { category: 'favorites', title: 'Favorites', icon: '❤️', result: favoritesResult },
      { category: 'recent', title: 'Recent', icon: '🕒', result: recentResult },
      { category: 'top', title: 'Top Rated', icon: '⭐', result: topResult },
    ];

    const systemLookbooksData: SystemLookbookData[] = systemCategories
      .map(({ category, title, icon, result }) => {
        const outfitsWithData = result.data
          ? result.data.map((so: any) => outfitMap.get(so.outfit_id)).filter(Boolean)
          : [];

        return {
          category,
          title,
          icon,
          outfits: outfitsWithData,
          coverImageUrl: null, // Always null - using icons only
        };
      })
      // Hide top rated if there's no engagement (no outfits with rating > 0)
      .filter((lookbook) => {
        if (lookbook.category === 'top') {
          return lookbook.outfits.length > 0;
        }
        return true;
      });

    setSystemLookbooks(systemLookbooksData);
    setLoading(false);
    setIsLoadingData(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };


  const openSlideshow = async (lookbookId?: string, systemCategory?: SystemCategory) => {
    if (!user) return;

    setSlideshowLoading(true);
    
    try {
      let outfitsToShow: any[] = [];

      if (lookbookId) {
        // Custom lookbook
        const { data } = await getLookbook(lookbookId);
        if (data && data.outfits.length > 0) {
          const { data: allOutfits } = await getUserOutfits(user.id);
          if (allOutfits) {
            const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
            outfitsToShow = data.outfits
              .map((lo: any) => outfitMap.get(lo.outfit_id))
              .filter(Boolean);
          }
        }
      } else if (systemCategory) {
        // System lookbook (All Outfits, Favorites, etc.)
        const systemLookbook = systemLookbooks.find((lb) => lb.category === systemCategory);
        if (systemLookbook) {
          outfitsToShow = systemLookbook.outfits;
        }
      }

      if (outfitsToShow.length > 0) {
        // Pre-load all images BEFORE opening slideshow
        const imageMap = new Map<string, string | null>();
        const loadPromises = outfitsToShow.map(async (outfit) => {
          const url = await getOutfitCoverImageUrl(outfit);
          imageMap.set(outfit.id, url);
        });
        await Promise.all(loadPromises);
        
        // Now open the slideshow with images ready
        setSlideshowImages(imageMap);
        setSlideshowOutfits(outfitsToShow);
        setCurrentSlideIndex(0);
        setIsAutoPlaying(true);
        setSlideshowVisible(true);
      }
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

  const toggleFavorite = async (outfitId: string, currentFavoriteStatus: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: !currentFavoriteStatus })
        .eq('id', outfitId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      // Update local state in all system lookbooks
      setSystemLookbooks(prevLookbooks =>
        prevLookbooks.map(lookbook => ({
          ...lookbook,
          outfits: lookbook.outfits.map(outfit =>
            outfit.id === outfitId ? { ...outfit, is_favorite: !currentFavoriteStatus } : outfit
          ),
        }))
      );
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const renderSystemLookbook = ({ item }: { item: SystemLookbookData }) => {
    return (
      <TouchableOpacity
        style={styles.systemLookbookCard}
        onPress={() => router.push(`/lookbooks/system-${item.category}`)}
      >
        <Text style={styles.systemLookbookIcon}>{item.icon}</Text>
        <Text style={styles.systemLookbookTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.systemLookbookCount}>
          {item.outfits.length}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderLookbook = ({ item }: { item: Lookbook }) => {
    const thumbnailUrl = lookbookThumbnails.get(item.id);
    const isLoading = loadingLookbookIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.lookbookCard}
        onPress={() => router.push(`/lookbooks/${item.id}`)}
      >
        {isLoading ? (
          <View style={styles.lookbookPlaceholder}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : thumbnailUrl ? (
          <ExpoImage
            source={{ uri: thumbnailUrl }}
            style={styles.lookbookImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.lookbookPlaceholder}>
            <Text style={styles.lookbookPlaceholderText}>📚</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            openSlideshow(item.id);
          }}
        >
          <Text style={styles.playButtonText}>▶</Text>
        </TouchableOpacity>
        <View style={styles.lookbookInfo}>
          <Text style={styles.lookbookTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.lookbookDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !lookbooks.length && !systemLookbooks.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* System Lookbooks Section - Category Cards */}
            {systemLookbooks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.systemLookbooksGrid}>
                  {systemLookbooks.map((item) => (
                    <View key={item.category} style={styles.systemLookbookCardWrapper}>
                      {renderSystemLookbook({ item })}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Custom Lookbooks Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Lookbooks</Text>
                <TouchableOpacity onPress={() => router.push('/lookbooks/new')}>
                  <Text style={styles.addButtonText}>+ New</Text>
                </TouchableOpacity>
              </View>
              {lookbooks.length > 0 ? (
                <FlatList
                  horizontal
                  data={lookbooks}
                  renderItem={renderLookbook}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.lookbooksList}
                />
              ) : (
                <View style={styles.emptyLookbooksContainer}>
                  <Text style={styles.emptyLookbooksText}>No lookbooks yet. Create your first one!</Text>
                </View>
              )}
            </View>

            {/* Empty State */}
            {!loading && lookbooks.length === 0 && systemLookbooks.every(lb => lb.outfits.length === 0) && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No outfits yet</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/outfits/new')}
                >
                  <Text style={styles.emptyButtonText}>Create your first outfit</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  systemLookbooksGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    flexWrap: 'nowrap',
  },
  systemLookbookCardWrapper: {
    flex: 1,
    minWidth: 0,
  },
  systemLookbookCard: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemLookbookIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  systemLookbookTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  systemLookbookCount: {
    fontSize: 10,
    color: '#999',
  },
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  lookbooksList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyLookbooksContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyLookbooksText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  lookbookCard: {
    width: 130,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  lookbookImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  lookbookPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookbookPlaceholderText: {
    fontSize: 48,
  },
  playButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  lookbookInfo: {
    padding: 8,
  },
  lookbookTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  lookbookDescription: {
    fontSize: 12,
    color: '#666',
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
});