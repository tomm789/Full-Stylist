/**
 * Hooks Index
 * Master export for all custom hooks
 */

// Wardrobe hooks
export * from './wardrobe/useCategories';
export * from './wardrobe/useFilters';
export * from './wardrobe/useWardrobe';
export * from './wardrobe/useWardrobeItems';

// AI hooks
export * from './ai';

export { useOutfits } from './outfits/useOutfits';
export { useOutfitFilters } from './outfits/useOutfitFilters';
export { useSocialEngagement } from './outfits/useSocialEngagement';
export { useOutfitGeneration } from './outfits/useOutfitGeneration';

export type { SortOption, SortOrder } from './outfits/useOutfitFilters';

// Search
export { useSearch } from './useSearch';
export type { SearchResult, SearchResultType } from './useSearch';

// PWA
export { useAddToHomeScreenDetection } from './useAddToHomeScreenDetection';

// Find Similar
export { useFindSimilar } from './useFindSimilar';
export { useHideHeaderOnScroll } from './useHideHeaderOnScroll';
export { useLookbookSelection } from './lookbooks/useLookbookSelection';
