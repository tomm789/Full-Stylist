/**
 * Outfits module - exports all outfit-related functions
 * 
 * Usage:
 * import { getUserOutfits, saveOutfit, calculateOutfitRating } from '@/lib/outfits';
 */

// Re-export from core
export {
  type Outfit,
  type OutfitWithRating,
  searchOutfits,
  getPublicOutfits,
  getUserOutfits,
  getUserOutfitsWithOptions,
  getOutfit,
  getOutfitWithDetails,
  deleteOutfit,
} from './core';

// Re-export from items
export {
  type OutfitItem,
  saveOutfit,
  addItemToOutfit,
  removeItemFromOutfit,
  updateOutfitItemPosition,
  reorderOutfitItems,
} from './items';

// Re-export from ratings
export {
  calculateOutfitRating,
  calculateOutfitRatings,
  getOutfitEngagement,
  getTopRatedOutfits,
} from './ratings';
