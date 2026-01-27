/**
 * Wardrobe module - exports all wardrobe-related functions
 * 
 * Usage:
 * import { getWardrobeItems, getWardrobeCategories } from '@/lib/wardrobe';
 */

// Re-export from items
export {
  type WardrobeItem,
  getDefaultWardrobeId,
  getWardrobeItems,
  searchWardrobeItems,
  getWardrobeItem,
  getWardrobeItemsByIds,
  createWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  getUserWardrobeItems,
  saveWardrobeItem,
  unsaveWardrobeItem,
  isWardrobeItemSaved,
  getSavedWardrobeItems,
} from './items';

// Re-export from images
export {
  getWardrobeItemImages,
  getWardrobeItemsImages,
  addImageToWardrobeItem,
  removeImageFromWardrobeItem,
  updateImageSortOrder,
  setPrimaryImage,
  getPrimaryImage,
} from './images';

// Re-export from categories
export {
  type WardrobeCategory,
  type WardrobeSubcategory,
  getWardrobeCategories,
  getSubcategories,
  getCategory,
  getSubcategory,
  getCategoriesWithSubcategories,
} from './categories';

// Re-export from diagnostics
export {
  findOrphanedImages,
  repairWardrobeItemImageLinks,
  diagnoseWardrobeItemImages,
  checkImagesRLSMigration,
} from './diagnostics';
