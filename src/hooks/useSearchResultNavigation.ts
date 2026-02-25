/**
 * useSearchResultNavigation
 * Shared hook that maps a search result type to its destination route.
 * Eliminates the duplicated switch-case in WardrobeScreen and OutfitsScreen.
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { SearchResult } from '@/hooks/useSearch';

export function useSearchResultNavigation() {
  const router = useRouter();

  const handleSearchResultPress = useCallback(
    (result: SearchResult) => {
      switch (result.type) {
        case 'user':
          router.push(`/users/${result.id}`);
          break;
        case 'outfit':
          router.push(`/outfits/${result.id}`);
          break;
        case 'lookbook':
          router.push(`/lookbooks/${result.id}`);
          break;
        case 'wardrobe_item':
          router.push(`/wardrobe/item/${result.id}`);
          break;
      }
    },
    [router]
  );

  return { handleSearchResultPress };
}
