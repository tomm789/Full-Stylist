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
  getUserArchivedOutfitsWithOptions,
  getUserOutfitsWithOptions,
  getOutfitsByIds,
  getOutfit,
  getOutfitWithDetails,
  deleteOutfit,
  archiveOutfit,
  restoreOutfit,
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

// Outfit description → modal messages (shared)
export {
  type OutfitDescription,
  type GenerationMessage,
  outfitDescriptionToGenerationMessages,
  runDescriptionMessageDrip,
} from './outfitDescriptionMessages';

// Generation sessions
export {
  type OutfitGenerationSession,
  type OutfitGenerationVariation,
  type OutfitVariationSnapshot,
  getActiveOutfitSession,
  createOutfitSession,
  updateOutfitSessionInput,
  endOutfitSession,
  listOutfitVariations,
  createOutfitVariation,
  updateOutfitVariation,
  getOutfitVariationByImageId,
  saveVariationAsOutfit,
  resolveImageUrls,
} from './sessions';
