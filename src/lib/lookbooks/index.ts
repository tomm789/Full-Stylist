/**
 * Lookbooks module - exports all lookbook-related functions
 * 
 * Usage:
 * import { getUserLookbooks, saveLookbook, getSystemLookbookOutfits } from '@/lib/lookbooks';
 */

// Re-export from core
export {
  type Lookbook,
  type LookbookOutfit,
  searchLookbooks,
  getUserLookbooks,
  getUserArchivedLookbooks,
  getLookbook,
  saveLookbook,
  publishLookbook,
  deleteLookbook,
  archiveLookbook,
  restoreLookbook,
} from './core';

// Re-export from system
export {
  getSystemLookbookOutfits,
} from './system';
