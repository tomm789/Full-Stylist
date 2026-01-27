import { supabase } from '../supabase';

/**
 * Verify that all images are original (not AI-generated)
 * Listings can only use original images
 */
export async function verifyOriginalImages(
  wardrobeItemId: string,
  imageIds: string[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!imageIds || imageIds.length === 0) {
      return { valid: true };
    }

    // Get wardrobe item images with type
    const { data: itemImages, error } = await supabase
      .from('wardrobe_item_images')
      .select('image_id, type')
      .in('image_id', imageIds)
      .eq('wardrobe_item_id', wardrobeItemId);

    if (error) {
      return { valid: false, error: error.message };
    }

    // Check that all images are type='original'
    const nonOriginalImages = (itemImages || []).filter((img) => img.type !== 'original');
    
    if (nonOriginalImages.length > 0) {
      return {
        valid: false,
        error: 'Listings can only use original images. AI-generated images are not allowed.',
      };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Verify wardrobe item ownership
 */
export async function verifyListingItemOwnership(
  userId: string,
  wardrobeItemId: string
): Promise<{ owned: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id, owner_user_id')
      .eq('id', wardrobeItemId)
      .eq('owner_user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { owned: false, error: 'Wardrobe item not found' };
      }
      return { owned: false, error: error.message };
    }

    if (!data) {
      return { owned: false, error: 'Wardrobe item not found or access denied' };
    }

    return { owned: true };
  } catch (error: any) {
    return { owned: false, error: error.message };
  }
}

/**
 * Verify listing ownership
 */
export async function verifyListingOwnership(
  userId: string,
  listingId: string
): Promise<{ owned: boolean; listingData?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, seller_user_id, wardrobe_item_id')
      .eq('id', listingId)
      .eq('seller_user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { owned: false, error: 'Listing not found' };
      }
      return { owned: false, error: error.message };
    }

    if (!data) {
      return { owned: false, error: 'Listing not found or access denied' };
    }

    return { owned: true, listingData: data };
  } catch (error: any) {
    return { owned: false, error: error.message };
  }
}
