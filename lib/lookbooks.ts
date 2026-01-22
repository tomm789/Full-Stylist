import { supabase } from './supabase';
import { calculateOutfitRatings } from './outfits';

export interface Lookbook {
  id: string;
  owner_user_id: string;
  title: string;
  description?: string;
  visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  share_slug?: string;
  type: 'custom_manual' | 'custom_filter' | 'system_all' | 'system_favorites' | 'system_recent' | 'system_top';
  filter_definition?: any;
  cover_image_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LookbookOutfit {
  id: string;
  lookbook_id: string;
  outfit_id: string;
  position: number;
  created_at: string;
}

/**
 * Search for lookbooks by title or description
 */
export async function searchLookbooks(query: string, limit: number = 20): Promise<{
  data: Array<{
    id: string;
    owner_user_id: string;
    title: string;
    description?: string;
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
      .from('lookbooks')
      .select('id, owner_user_id, title, description, visibility, created_at, owner:users!owner_user_id(handle, display_name)')
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
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
 * Get system lookbook outfits (computed based on type)
 */
export async function getSystemLookbookOutfits(
  userId: string,
  type: 'system_all' | 'system_favorites' | 'system_recent' | 'system_top',
  viewerId?: string
): Promise<{
  data: Array<{ outfit_id: string; outfit?: any }>;
  error: any;
}> {
  try {
    let query = supabase
      .from('outfits')
      .select('id')
      .eq('owner_user_id', userId)
      .is('archived_at', null);

    switch (type) {
      case 'system_favorites':
        query = query.eq('is_favorite', true);
        break;
      case 'system_recent':
        // Already sorted by created_at desc below
        break;
      case 'system_top':
        // Top Rated: will be sorted by rating after fetching
        break;
      case 'system_all':
      default:
        // All outfits visible to viewer
        break;
    }

    // Apply default ordering (for non-top-rated types)
    if (type !== 'system_top') {
      query = query.order('created_at', { ascending: false });
    }

    const { data: outfits, error } = await query;

    if (error) {
      return { data: [], error };
    }

    // For Top Rated, calculate ratings and sort by rating
    if (type === 'system_top') {
      const outfitIds = (outfits || []).map((o) => o.id);
      if (outfitIds.length === 0) {
        return { data: [], error: null };
      }

      const ratingMap = await calculateOutfitRatings(outfitIds);
      
      // Sort outfits by rating (descending)
      const outfitsWithRatings = (outfits || []).map((outfit) => ({
        outfit,
        rating: ratingMap.get(outfit.id) || 0,
      }));

      outfitsWithRatings.sort((a, b) => b.rating - a.rating);

      // Only return outfits with engagement (rating > 0)
      const result = outfitsWithRatings
        .filter((item) => item.rating > 0)
        .map((item) => ({
          outfit_id: item.outfit.id,
        }));

      return { data: result, error: null };
    }

    // For other types, return as-is
    const result = (outfits || []).map((outfit) => ({
      outfit_id: outfit.id,
    }));

    return { data: result, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get user's lookbooks
 */
export async function getUserLookbooks(userId: string): Promise<{
  data: Lookbook[];
  error: any;
}> {
  const { data, error } = await supabase
    .from('lookbooks')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Get lookbook by ID with outfits
 */
export async function getLookbook(lookbookId: string): Promise<{
  data: { lookbook: Lookbook; outfits: LookbookOutfit[] } | null;
  error: any;
}> {
  // Get lookbook
  const { data: lookbook, error: lookbookError } = await supabase
    .from('lookbooks')
    .select('*')
    .eq('id', lookbookId)
    .single();

  if (lookbookError || !lookbook) {
    return { data: null, error: lookbookError };
  }

  // Get lookbook outfits (if custom_manual)
  if (lookbook.type === 'custom_manual') {
    const { data: lookbookOutfits, error: outfitsError } = await supabase
      .from('lookbook_outfits')
      .select('*')
      .eq('lookbook_id', lookbookId)
      .order('position', { ascending: true });

    if (outfitsError) {
      return { data: null, error: outfitsError };
    }

    return { data: { lookbook, outfits: lookbookOutfits || [] }, error: null };
  }

  // For system and filter-based lookbooks, outfits are computed
  return { data: { lookbook, outfits: [] }, error: null };
}

/**
 * Create or update lookbook
 */
export async function saveLookbook(
  userId: string,
  lookbookData: {
    id?: string;
    title: string;
    description?: string;
    visibility?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
    type?: 'custom_manual' | 'custom_filter' | 'system_all' | 'system_favorites' | 'system_recent' | 'system_top';
    filter_definition?: any;
  },
  outfitIds?: string[]
): Promise<{
  data: Lookbook | null;
  error: any;
}> {
  try {
    let lookbook: Lookbook;

    if (lookbookData.id) {
      // Update existing lookbook
      const { data: updatedLookbook, error: updateError } = await supabase
        .from('lookbooks')
        .update({
          ...lookbookData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lookbookData.id)
        .eq('owner_user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      lookbook = updatedLookbook;

      // Update outfits if custom_manual
      if (lookbookData.type === 'custom_manual' && outfitIds) {
        // Delete existing outfits
        await supabase.from('lookbook_outfits').delete().eq('lookbook_id', lookbook.id);

        // Insert new outfits
        const lookbookOutfitsData = outfitIds.map((outfitId, index) => ({
          lookbook_id: lookbook.id,
          outfit_id: outfitId,
          position: index,
        }));

        await supabase.from('lookbook_outfits').insert(lookbookOutfitsData);
      }
    } else {
      // Create new lookbook
      const { data: newLookbook, error: createError } = await supabase
        .from('lookbooks')
        .insert({
          owner_user_id: userId,
          title: lookbookData.title,
          description: lookbookData.description,
          visibility: lookbookData.visibility || 'followers',
          type: lookbookData.type || 'custom_manual',
          filter_definition: lookbookData.filter_definition,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      lookbook = newLookbook;

      // Add outfits if custom_manual
      if (lookbookData.type === 'custom_manual' && outfitIds && outfitIds.length > 0) {
        const lookbookOutfitsData = outfitIds.map((outfitId, index) => ({
          lookbook_id: lookbook.id,
          outfit_id: outfitId,
          position: index,
        }));

        await supabase.from('lookbook_outfits').insert(lookbookOutfitsData);
      }
    }

    return { data: lookbook, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Publish lookbook to feed (creates post)
 */
export async function publishLookbook(
  userId: string,
  lookbookId: string,
  caption?: string,
  visibility?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit'
): Promise<{
  data: any | null;
  error: any;
}> {
  try {
    // Get lookbook
    const { data: lookbook } = await getLookbook(lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        owner_user_id: userId,
        entity_type: 'lookbook',
        entity_id: lookbookId,
        caption: caption,
        visibility: visibility || lookbook.lookbook.visibility || 'public',
      })
      .select()
      .single();

    if (postError) {
      throw postError;
    }

    return { data: post, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete lookbook
 */
export async function deleteLookbook(
  userId: string,
  lookbookId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('lookbooks')
    .delete()
    .eq('id', lookbookId)
    .eq('owner_user_id', userId);

  return { error };
}