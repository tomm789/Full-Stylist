/**
 * Wardrobe Utilities
 * Helper functions for wardrobe operations
 */

import { WardrobeItem } from '@/lib/wardrobe';

/**
 * Multi-select categories (allow multiple items from same category in outfit)
 */
export const MULTI_SELECT_CATEGORIES = new Set([
  'activewear',
  'accessories',
  'jewellery',
  'jewelry',
  'intimates',
  'sleepwear',
]);

/**
 * Check if a category allows multiple items in an outfit
 */
export function isMultiSelectCategory(categoryId: string | null, categoryName?: string): boolean {
  if (!categoryId && !categoryName) return false;
  
  const name = categoryName?.toLowerCase().trim();
  return name ? MULTI_SELECT_CATEGORIES.has(name) : false;
}

/**
 * Check if adding an item would conflict with already selected items
 */
export function findConflictingItem(
  item: WardrobeItem,
  selectedItems: WardrobeItem[],
  getCategoryName: (categoryId: string | null) => string
): WardrobeItem | null {
  if (selectedItems.length === 0) return null;

  const categoryName = getCategoryName(item.category_id);
  const allowMultipleSubcategories = isMultiSelectCategory(item.category_id, categoryName);

  return (
    selectedItems.find((selected) => {
      if (selected.id === item.id) return false;
      if (selected.category_id !== item.category_id) return false;
      if (!allowMultipleSubcategories) return true;
      if (!selected.subcategory_id || !item.subcategory_id) return true;
      return selected.subcategory_id === item.subcategory_id;
    }) || null
  );
}

/**
 * Group items by category
 */
export function groupItemsByCategory(
  items: WardrobeItem[]
): Map<string | null, WardrobeItem[]> {
  const groups = new Map<string | null, WardrobeItem[]>();

  items.forEach((item) => {
    const categoryId = item.category_id;
    if (!groups.has(categoryId)) {
      groups.set(categoryId, []);
    }
    groups.get(categoryId)!.push(item);
  });

  return groups;
}

/**
 * Sort items by various criteria
 */
export function sortItems(
  items: WardrobeItem[],
  sortBy: 'recent' | 'oldest' | 'name' | 'favorite'
): WardrobeItem[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'recent':
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case 'oldest':
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'favorite':
      return sorted.sort((a, b) => {
        if (a.is_favorite === b.is_favorite) return 0;
        return a.is_favorite ? -1 : 1;
      });
    default:
      return sorted;
  }
}

/**
 * Filter items by search query
 */
export function searchItems(items: WardrobeItem[], query: string): WardrobeItem[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();

  return items.filter((item) => {
    // Search in title
    if (item.title.toLowerCase().includes(lowerQuery)) return true;

    // Search in description
    if (item.description?.toLowerCase().includes(lowerQuery)) return true;

    // Search in brand
    if (item.brand?.toLowerCase().includes(lowerQuery)) return true;

    // Search in color
    if (item.color_primary?.toLowerCase().includes(lowerQuery)) return true;

    return false;
  });
}

/**
 * Get item count by category
 */
export function getItemCountByCategory(
  items: WardrobeItem[]
): Map<string | null, number> {
  const counts = new Map<string | null, number>();

  items.forEach((item) => {
    const categoryId = item.category_id;
    counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
  });

  return counts;
}

/**
 * Check if item is owned by user
 */
export function isOwnItem(item: WardrobeItem, userId: string | null): boolean {
  return Boolean(userId && item.owner_user_id === userId);
}

/**
 * Get visibility label
 */
export function getVisibilityLabel(
  visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit'
): string {
  const labels: Record<typeof visibility, string> = {
    public: 'Public',
    followers: 'Followers',
    private_link: 'Private Link',
    private: 'Private',
    inherit: 'Inherit from settings',
  };

  return labels[visibility] || 'Unknown';
}

/**
 * Parse JSON field safely
 */
export function parseJsonField<T = any>(field: any): T | null {
  if (!field) return null;
  if (typeof field === 'string') return field as any;
  if (typeof field === 'object') return field as T;
  return null;
}

/**
 * Format size field for display
 */
export function formatSize(size: any): string {
  if (!size) return '';
  if (typeof size === 'string') return size;
  if (Array.isArray(size)) return size.join(', ');
  if (typeof size === 'object') {
    const values = Object.values(size);
    return values.length > 0 ? String(values[0]) : '';
  }
  return String(size);
}
