import { supabase } from '../supabase';

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

    // PostgREST returns FK relation as array; normalize to single object
    const normalized = (data || []).map((row: any) => ({
      ...row,
      owner: Array.isArray(row.owner) ? row.owner[0] : row.owner,
    }));
    return { data: normalized, error: null };
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
