/**
 * Wardrobe Items Barrel File
 * Re-exports all wardrobe items types, queries, and mutations
 */

// Types
export type { WardrobeItem } from './items-types';

// Queries
export {
  getDefaultWardrobeId,
  getWardrobeItems,
  searchWardrobeItems,
  getWardrobeItem,
  getWardrobeItemsByIds,
  getUserWardrobeItems,
  isWardrobeItemSaved,
  getSavedWardrobeItems,
} from './items-queries';

// Mutations
export {
  createWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  saveWardrobeItem,
  unsaveWardrobeItem,
} from './items-mutations';
