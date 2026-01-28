/**
 * Item Navigation Helper Utilities
 * Utility functions for wardrobe item navigation
 */

import { useRouter } from 'expo-router';

/**
 * Navigate to a specific wardrobe item
 */
export function navigateToWardrobeItem(
  router: ReturnType<typeof useRouter>,
  itemId: string,
  itemIds?: string
) {
  if (itemIds) {
    router.replace(`/wardrobe/item/${itemId}?itemIds=${itemIds}`);
  } else {
    router.push(`/wardrobe/item/${itemId}`);
  }
}
