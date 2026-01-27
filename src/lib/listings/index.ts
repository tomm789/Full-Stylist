/**
 * Listings module - exports all marketplace listing functions
 * 
 * Usage:
 * import { createListing, getUserListings } from '@/lib/listings';
 */

// Re-export from core
export {
  type Listing,
  type ListingImage,
  type ListingWithImages,
  getUserListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getActiveListings,
} from './core';

// Re-export from validation
export {
  verifyOriginalImages,
  verifyListingItemOwnership,
  verifyListingOwnership,
} from './validation';
