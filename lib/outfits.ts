import { supabase } from './supabase';
import { getLikeCount, getCommentCount, getSaveCount } from './engagement';

export interface Outfit {
  id: string;
  owner_user_id: string;
  title?: string;
  notes?: string;
  visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  share_slug?: string;
  is_favorite: boolean;
  cover_image_id?: string;
  attribute_cache?: any;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  category_id: string;
  wardrobe_item_id: string;
  position: number;
  created_at: string;
}

export interface OutfitWithRating extends Outfit {
  rating?: number;
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
}

/**
 * Rating calculation weights
 * These weights determine how much each engagement type contributes to the rating
 */
const RATING_WEIGHTS = {
  likes: 1,
  comments: 2,
  saves: 3,
};

/**
 * Calculate rating for an outfit based on engagement metrics
 */
export async function calculateOutfitRating(outfitId: string): Promise<number> {
  const [likes, comments, saves] = await Promise.all([
    getLikeCount('outfit', outfitId),
    getCommentCount('outfit', outfitId),
    getSaveCount('outfit', outfitId),
  ]);

  const rating =
    likes * RATING_WEIGHTS.likes +
    comments * RATING_WEIGHTS.comments +
    saves * RATING_WEIGHTS.saves;

  return rating;
}

/**
 * Calculate ratings for multiple outfits in parallel
 */
export async function calculateOutfitRatings(outfitIds: string[]): Promise<Map<string, number>> {
  const ratingMap = new Map<string, number>();
  
  // Calculate all ratings in parallel
  const ratingPromises = outfitIds.map(async (id) => {
    const rating = await calculateOutfitRating(id);
    return { id, rating };
  });
  
  const results = await Promise.all(ratingPromises);
  results.forEach(({ id, rating }) => {
    ratingMap.set(id, rating);
  });
  
  return ratingMap;
}

/**
 * Search for outfits by title or notes
 */
export async function searchOutfits(query: string, limit: number = 20): Promise<{
  data: Array<{
    id: string;
    owner_user_id: string;
    title?: string;
    visibility: string;
    created_at: string;
    owner?: { handle: string; display_name: string };
  }>;
  error: any;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return { data: [], error: null };
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('outfits')
      .select('id, owner_user_id, title, visibility, created_at, owner:users!owner_user_id(handle, display_name)')
      .or(`title.ilike.${searchTerm},notes.ilike.${searchTerm}`)
      .is('archived_at', null)
      .in('visibility', ['public', 'followers'])
      .limit(limit);

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get user's outfits (backward compatible - returns Outfit[])
 */
export async function getUserOutfits(userId: string): Promise<{
  data: Outfit[];
  error: any;
}> {
  const { data, error } = await supabase
    .from('outfits')
    .select('*')
    .eq('owner_user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Get user's outfits with optional filters and sorting
 */
export async function getUserOutfitsWithOptions(
  userId: string,
  options?: {
    search?: string;
    favorites?: boolean;
    sortBy?: 'date' | 'rating' | 'title';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{
  data: OutfitWithRating[];
  error: any;
}> {
  let query = supabase
    .from('outfits')
    .select('*')
    .eq('owner_user_id', userId)
    .is('archived_at', null);

  // Apply filters
  if (options?.favorites !== undefined) {
    query = query.eq('is_favorite', options.favorites);
  }

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,notes.ilike.%${options.search}%`);
  }

  // Apply sorting
  if (options?.sortBy === 'date') {
    query = query.order('created_at', { ascending: options.sortOrder === 'asc' });
  } else if (options?.sortBy === 'title') {
    query = query.order('title', { ascending: options.sortOrder !== 'desc' });
  } else {
    // Default to date desc
    query = query.order('created_at', { ascending: false });
  }

  const { data: outfits, error } = await query;

  if (error) {
    return { data: [], error };
  }

  const outfitsList = (outfits || []) as Outfit[];

  // If sorting by rating, calculate ratings and sort
  if (options?.sortBy === 'rating') {
    const outfitIds = outfitsList.map((o) => o.id);
    const ratingMap = await calculateOutfitRatings(outfitIds);
    
    const outfitsWithRatings: OutfitWithRating[] = outfitsList.map((outfit) => ({
      ...outfit,
      rating: ratingMap.get(outfit.id) || 0,
    }));

    outfitsWithRatings.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return options.sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA;
    });

    return { data: outfitsWithRatings, error: null };
  }

  return { data: outfitsList, error: null };
}


/**
 * Get outfit by ID with items (legacy - for own outfits)
 */
export async function getOutfit(outfitId: string): Promise<{
  data: { outfit: Outfit; items: OutfitItem[]; coverImage?: any } | null;
  error: any;
}> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'outfits.ts:getOutfit',message:'getOutfit entry',data:{outfitId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  // Get outfit with cover_image
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .select('*, cover_image:images!cover_image_id(*)')
    .eq('id', outfitId)
    .single();

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'outfits.ts:getOutfit',message:'after outfit query',data:{outfitId,hasError:!!outfitError,errorMsg:outfitError?.message,hasOutfit:!!outfit,coverImageId:outfit?.cover_image_id,hasCoverImage:!!outfit?.cover_image,coverImageIdFromJoin:outfit?.cover_image?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion

  if (outfitError || !outfit) {
    return { data: null, error: outfitError };
  }

  // Get outfit items
  const { data: items, error: itemsError } = await supabase
    .from('outfit_items')
    .select('*')
    .eq('outfit_id', outfitId)
    .order('position', { ascending: true });

  if (itemsError) {
    return { data: null, error: itemsError };
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'outfits.ts:getOutfit',message:'getOutfit return',data:{outfitId,hasOutfit:!!outfit,hasCoverImage:!!outfit.cover_image,coverImageId:outfit.cover_image_id,coverImageStorageKey:outfit.cover_image?.storage_key,coverImageStorageBucket:outfit.cover_image?.storage_bucket},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion

  return { 
    data: { 
      outfit, 
      items: items || [], 
      coverImage: outfit.cover_image 
    }, 
    error: null 
  };
}

/**
 * Get outfit by ID with items and wardrobe item details
 * Uses a performant database function that works across users
 */
export async function getOutfitWithDetails(outfitId: string, userId: string): Promise<{
  data: { outfit: Outfit; items: any[]; coverImage?: any } | null;
  error: any;
}> {
  // Get outfit with cover_image
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .select('*, cover_image:images!cover_image_id(*)')
    .eq('id', outfitId)
    .single();

  if (outfitError || !outfit) {
    return { data: null, error: outfitError };
  }

  // Use the performant database function to get items with wardrobe details
  const { data: itemsWithDetails, error: itemsError } = await supabase
    .rpc('get_outfit_items_with_details', {
      outfit_id: outfitId,
      viewer_id: userId
    });

  if (itemsError) {
    return { data: null, error: itemsError };
  }

  return { 
    data: { 
      outfit, 
      items: itemsWithDetails || [], 
      coverImage: outfit.cover_image 
    }, 
    error: null 
  };
}

/**
 * Create or update outfit
 */
export async function saveOutfit(
  userId: string,
  outfitData: {
    id?: string;
    title?: string;
    notes?: string;
    visibility?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  },
  items: Array<{ category_id: string | null; wardrobe_item_id: string; position?: number }>
): Promise<{
  data: { outfit: Outfit; items: OutfitItem[] } | null;
  error: any;
}> {
  try {
    let outfitId: string;

    if (outfitData.id) {
      // Update existing outfit
      const { data: updatedOutfit, error: updateError } = await supabase
        .from('outfits')
        .update({
          ...outfitData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', outfitData.id)
        .eq('owner_user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      outfitId = outfitData.id;

      // Delete existing items
      await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);
    } else {
      // Create new outfit
      const { data: newOutfit, error: createError } = await supabase
        .from('outfits')
        .insert({
          owner_user_id: userId,
          title: outfitData.title,
          notes: outfitData.notes,
          visibility: outfitData.visibility || 'followers',
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      outfitId = newOutfit.id;
    }

    // Create outfit items (enforced unique constraint at DB level)
    // Allow null category_id for items that don't have categories yet
    const outfitItemsData = items.map((item, index) => ({
      outfit_id: outfitId,
      category_id: item.category_id || null,
      wardrobe_item_id: item.wardrobe_item_id,
      position: item.position ?? index,
    }));

    const { data: outfitItems, error: itemsError } = await supabase
      .from('outfit_items')
      .insert(outfitItemsData)
      .select();

    if (itemsError) {
      throw itemsError;
    }

    // Get full outfit
    const { data: fullOutfit } = await supabase
      .from('outfits')
      .select('*')
      .eq('id', outfitId)
      .single();

    return {
      data: { outfit: fullOutfit, items: outfitItems || [] },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete outfit
 */
export async function deleteOutfit(
  userId: string,
  outfitId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('outfits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', outfitId)
    .eq('owner_user_id', userId);

  return { error };
}

/**
 * Add item to outfit (replaces existing item in category if present)
 */
export async function addItemToOutfit(
  outfitId: string,
  categoryId: string,
  wardrobeItemId: string,
  position?: number
): Promise<{
  data: OutfitItem | null;
  error: any;
}> {
  try {
    // Delete existing item in category if present (unique constraint)
    await supabase
      .from('outfit_items')
      .delete()
      .eq('outfit_id', outfitId)
      .eq('category_id', categoryId);

    // Insert new item
    const { data, error } = await supabase
      .from('outfit_items')
      .insert({
        outfit_id: outfitId,
        category_id: categoryId,
        wardrobe_item_id: wardrobeItemId,
        position: position ?? 0,
      })
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Remove item from outfit
 */
export async function removeItemFromOutfit(
  outfitId: string,
  categoryId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('outfit_items')
    .delete()
    .eq('outfit_id', outfitId)
    .eq('category_id', categoryId);

  return { error };
}
