/**
 * useWardrobeItemNavigation Hook
 * Manage navigation between wardrobe items
 */

import { useState, useEffect, useRef } from 'react';
import { ScrollView, Dimensions } from 'react-native';
import { getWardrobeItemsByIds, getWardrobeItemsImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

interface UseWardrobeItemNavigationProps {
  itemIds: string | undefined;
  currentItemId: string | undefined;
  userId: string | undefined;
}

interface NavigationItem {
  id: string;
  title: string;
  imageUrl: string | null;
}

interface UseWardrobeItemNavigationReturn {
  navigationItems: NavigationItem[];
  currentItemIndex: number;
  navigationScrollRef: React.RefObject<ScrollView>;
  currentScreenWidth: number;
  navigateToItem: (targetItemId: string) => void;
}

export function useWardrobeItemNavigation({
  itemIds,
  currentItemId,
  userId,
}: UseWardrobeItemNavigationProps): UseWardrobeItemNavigationReturn {
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const navigationScrollRef = useRef<ScrollView>(null);
  const [currentScreenWidth, setCurrentScreenWidth] = useState(() => {
    const width = Dimensions.get('window').width;
    return Math.min(width, 630);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const cappedWidth = Math.min(window.width, 630);
      setCurrentScreenWidth(cappedWidth);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (itemIds && userId) {
      loadNavigationItems();
    }
  }, [itemIds, currentItemId, userId]);

  useEffect(() => {
    if (navigationItems.length > 0 && currentItemIndex >= 0 && navigationScrollRef.current) {
      const itemWidth = 60 + 12;
      const scrollPosition = Math.max(
        0,
        currentItemIndex * itemWidth - currentScreenWidth / 2 + itemWidth / 2
      );
      setTimeout(() => {
        navigationScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
      }, 100);
    }
  }, [navigationItems, currentItemIndex, currentScreenWidth]);

  const loadNavigationItems = async () => {
    if (!itemIds || !userId) return;

    try {
      const idsArray = itemIds.split(',');
      const currentIndex = idsArray.indexOf(currentItemId || '');
      setCurrentItemIndex(currentIndex >= 0 ? currentIndex : 0);

      const { data: allItems } = await getWardrobeItemsByIds(idsArray);

      if (!allItems || allItems.length === 0) return;

      const itemsMap = new Map(allItems.map((item) => [item.id, item]));

      const visibleItemIds = idsArray.slice(0, 6);
      const { data: imagesMap } = await getWardrobeItemsImages(visibleItemIds);

      const navItems = idsArray
        .map((itemId) => {
          const foundItem = itemsMap.get(itemId);
          if (!foundItem) return null;

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
            title: foundItem?.title,
            imageUrl,
          };
        })
        .filter(
          (item): item is NavigationItem => item !== null
        );

      setNavigationItems(navItems);
    } catch (error) {
      console.error('Failed to load navigation items:', error);
    }
  };

  const navigateToItem = (targetItemId: string) => {
    // This will be handled by the parent component using router
  };

  return {
    navigationItems,
    currentItemIndex,
    navigationScrollRef,
    currentScreenWidth,
    navigateToItem,
  };
}
