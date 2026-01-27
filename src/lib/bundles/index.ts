/**
 * Bundles module - exports all outfit bundle functions
 * 
 * Usage:
 * import { createOutfitBundle, getBundleGroup } from '@/lib/bundles';
 */

export {
  type OutfitBundle,
  getOutfitBundles,
  getUserOutfitBundles,
  getOutfitBundle,
  createOutfitBundle,
  updateOutfitBundle,
  deleteOutfitBundle,
} from './core';

export {
  type BundleGroup,
  type BundleGroupItem,
  createBundleGroup,
} from './groups';
