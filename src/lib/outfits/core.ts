import { supabase } from '../supabase';
import { calculateOutfitRatings } from './ratings';

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

export interface OutfitWithRating extends Outfit {
  rating?: number;
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
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

  // Get outfit items
  const { data: items, error: itemsError } = await supabase
    .from('outfit_items')
    .select('*')
    .eq('outfit_id', outfitId)
    .order('position', { ascending: true });

  if (itemsError) {
    return { data: null, error: itemsError };
  }

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
  const { data, error } = await supabase
  .rpc('get_outfit_items_with_details', {
    p_outfit_id: outfitId,
    p_viewer_id: userId,
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
 * Delete outfit (soft delete via archiving)
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
