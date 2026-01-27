/**
 * Similarity module - exports all similarity search functions
 * 
 * Usage:
 * import { findSimilarInWardrobe, findSimilarSellable } from '@/lib/similarity';
 */

// Re-export from scoring
export {
  calculateSimilarityScore,
} from './scoring';

// Re-export from wardrobe-search
export {
  type SimilarityResult,
  findSimilarInWardrobe,
} from './wardrobe-search';

// Re-export from sellable-search
export {
  findSimilarSellable,
  searchOnlineSimilar,
} from './sellable-search';
