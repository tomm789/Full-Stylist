import { supabase } from './supabase';

export interface Listing {
  id: string;
  seller_user_id: string;
  wardrobe_item_id: string;
  price: number;
  currency: string;
  condition: 'new' | 'like_new' | 'good' | 'worn';
  status: 'active' | 'sold' | 'withdrawn';
  created_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_id: string;
  sort_order: number;
}

export interface ListingWithImages extends Listing {
  images?: Array<{
    id: string;
    image_id: string;
    sort_order: number;
    image?: {
      id: string;
      storage_bucket: string;
      storage_key: string;
      mime_type: string;
    };
  }>;
  wardrobe_item?: {
    id: string;
    title: string;
    category_id: string;
  };
}

/**
 * Get user's listings
 */
export async function getUserListings(userId: string): Promise<{
  data: ListingWithImages[];
  error: any;
}> {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_images(*, images(*)),
        wardrobe_items(id, title, category_id)
      `
      )
      .eq('seller_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data: (listings as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get listing by ID
 */
export async function getListing(listingId: string): Promise<{
  data: ListingWithImages | null;
  error: any;
}> {
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_images(*, images(*)),
        wardrobe_items(id, title, category_id)
      `
      )
      .eq('id', listingId)
      .single();

    if (error) {
      throw error;
    }

    return { data: listing as any, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Create listing from wardrobe item
 * Enforces that only original images can be attached
 */
export async function createListing(
  userId: string,
  wardrobeItemId: string,
  listingData: {
    price: number;
    currency?: string;
    condition: 'new' | 'like_new' | 'good' | 'worn';
    imageIds?: string[]; // Must be original images only
  }
): Promise<{
  data: ListingWithImages | null;
  error: any;
}> {
  try {
    // Verify wardrobe item belongs to user
    const { data: wardrobeItem, error: itemError } = await supabase
      .from('wardrobe_items')
      .select('id, owner_user_id')
      .eq('id', wardrobeItemId)
      .eq('owner_user_id', userId)
      .single();

    if (itemError || !wardrobeItem) {
      throw new Error('Wardrobe item not found or access denied');
    }

    // If imageIds provided, verify they are all original images
    if (listingData.imageIds && listingData.imageIds.length > 0) {
      const { data: images, error: imagesError } = await supabase
        .from('wardrobe_item_images')
        .select('image_id, images(id, source), wardrobe_item_images(type)')
        .in('image_id', listingData.imageIds)
        .eq('wardrobe_item_id', wardrobeItemId);

      if (imagesError) {
        throw imagesError;
      }

      // Check that all images are type='original'
      // Note: We need to check the wardrobe_item_images.type, not images.source
      const { data: itemImages, error: itemImagesError } = await supabase
        .from('wardrobe_item_images')
        .select('image_id, type')
        .in('image_id', listingData.imageIds)
        .eq('wardrobe_item_id', wardrobeItemId);

      if (itemImagesError) {
        throw itemImagesError;
      }

      const nonOriginalImages = (itemImages || []).filter((img) => img.type !== 'original');
      if (nonOriginalImages.length > 0) {
        throw new Error('Listings can only use original images. AI-generated images are not allowed.');
      }
    }

    // Create listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        seller_user_id: userId,
        wardrobe_item_id: wardrobeItemId,
        price: listingData.price,
        currency: listingData.currency || 'AUD',
        condition: listingData.condition,
        status: 'active',
      })
      .select()
      .single();

    if (listingError) {
      throw listingError;
    }

    // Attach images if provided
    if (listingData.imageIds && listingData.imageIds.length > 0) {
      const listingImagesData = listingData.imageIds.map((imageId, index) => ({
        listing_id: listing.id,
        image_id: imageId,
        sort_order: index,
      }));

      const { error: imagesError } = await supabase
        .from('listing_images')
        .insert(listingImagesData);

      if (imagesError) {
        // Rollback listing creation?
        throw imagesError;
      }
    }

    // Get full listing with images
    const { data: fullListing } = await getListing(listing.id);

    return { data: fullListing, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update listing
 */
export async function updateListing(
  userId: string,
  listingId: string,
  listingData: {
    price?: number;
    currency?: string;
    condition?: 'new' | 'like_new' | 'good' | 'worn';
    status?: 'active' | 'sold' | 'withdrawn';
    imageIds?: string[]; // Must be original images only
  }
): Promise<{
  data: ListingWithImages | null;
  error: any;
}> {
  try {
    // Verify listing belongs to user
    const { data: existingListing, error: checkError } = await supabase
      .from('listings')
      .select('id, seller_user_id, wardrobe_item_id')
      .eq('id', listingId)
      .eq('seller_user_id', userId)
      .single();

    if (checkError || !existingListing) {
      throw new Error('Listing not found or access denied');
    }

    // If imageIds provided, verify they are all original images
    if (listingData.imageIds && listingData.imageIds.length > 0) {
      const { data: itemImages, error: itemImagesError } = await supabase
        .from('wardrobe_item_images')
        .select('image_id, type')
        .in('image_id', listingData.imageIds)
        .eq('wardrobe_item_id', existingListing.wardrobe_item_id);

      if (itemImagesError) {
        throw itemImagesError;
      }

      const nonOriginalImages = (itemImages || []).filter((img) => img.type !== 'original');
      if (nonOriginalImages.length > 0) {
        throw new Error('Listings can only use original images. AI-generated images are not allowed.');
      }
    }

    // Update listing
    const updateData: any = {};
    if (listingData.price !== undefined) updateData.price = listingData.price;
    if (listingData.currency !== undefined) updateData.currency = listingData.currency;
    if (listingData.condition !== undefined) updateData.condition = listingData.condition;
    if (listingData.status !== undefined) updateData.status = listingData.status;

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', listingId)
      .eq('seller_user_id', userId)
      .select()
      .single();

    if (listingError) {
      throw listingError;
    }

    // Update images if provided
    if (listingData.imageIds !== undefined) {
      // Delete existing listing images
      await supabase.from('listing_images').delete().eq('listing_id', listingId);

      // Insert new listing images
      if (listingData.imageIds.length > 0) {
        const listingImagesData = listingData.imageIds.map((imageId, index) => ({
          listing_id: listingId,
          image_id: imageId,
          sort_order: index,
        }));

        const { error: imagesError } = await supabase
          .from('listing_images')
          .insert(listingImagesData);

        if (imagesError) {
          throw imagesError;
        }
      }
    }

    // Get full listing with images
    const { data: fullListing } = await getListing(listingId);

    return { data: fullListing, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete listing
 */
export async function deleteListing(
  userId: string,
  listingId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('seller_user_id', userId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get all active listings (marketplace view)
 */
export async function getActiveListings(
  limit: number = 50,
  offset: number = 0
): Promise<{
  data: ListingWithImages[];
  error: any;
}> {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_images(*, images(*)),
        wardrobe_items(id, title, category_id),
        seller:users(id, handle, display_name)
      `
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return { data: (listings as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}
