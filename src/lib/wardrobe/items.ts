import { supabase } from '../supabase';
import { fetchList, fetchSingle, QueryListResult, QueryResult, searchRecords } from '../utils/supabase-helpers';
import { batchUploadImages } from '../utils/image-helpers';

export interface WardrobeItem {
  id: string;
  wardrobe_id: string;
  owner_user_id: string;
  title: string;
  description?: string;
  category_id: string;
  subcategory_id?: string;
  brand?: string;
  color_primary?: string;
  color_palette?: any;
  size?: any;
  material?: any;
  seasonality?: any;
  is_favorite: boolean;
  visibility_override: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  condition?: string;
  is_sellable: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's default wardrobe ID
 */
export async function getDefaultWardrobeId(userId: string): Promise<{
  data: string | null;
  error: any;
}> {
  const result = await fetchSingle<{ id: string }>(
    'wardrobes',
    'id',
    { owner_user_id: userId }
  );
  
  return { data: result.data?.id || null, error: result.error };
}

/**
 * Get wardrobe items for a user
 */
export async function getWardrobeItems(
  wardrobeId: string,
  filters?: {
    category_id?: string;
    search?: string;
    is_favorite?: boolean;
  }
): Promise<QueryListResult<WardrobeItem>> {
  const queryFilters: Record<string, any> = {
    wardrobe_id: wardrobeId,
    archived_at: null,
  };

  if (filters?.category_id) {
    queryFilters.category_id = filters.category_id;
  }

  if (filters?.is_favorite !== undefined) {
    queryFilters.is_favorite = filters.is_favorite;
  }

  let result = await fetchList<WardrobeItem>('wardrobe_items', '*', {
    filters: queryFilters,
    orderBy: { column: 'created_at', ascending: false },
  });

  // Apply search filter if provided (client-side for now)
  if (filters?.search && result.data) {
    const searchLower = filters.search.toLowerCase();
    result.data = result.data.filter((item) =>
      item.title.toLowerCase().includes(searchLower)
    );
  }

  return result;
}

/**
 * Search for wardrobe items by title, brand, or description
 */
export async function searchWardrobeItems(
  query: string,
  limit: number = 20
): Promise<QueryListResult<any>> {
  return searchRecords(
    'wardrobe_items',
    'id, owner_user_id, title, brand, category_id, visibility_override, created_at, users!owner_user_id(handle, display_name)',
    ['title', 'brand', 'description'],
    query,
    {
      additionalFilters: {
        archived_at: null,
        visibility_override: ['public', 'followers', 'inherit'],
      },
      limit,
    }
  );
}

/**
 * Get a single wardrobe item by ID
 */
export async function getWardrobeItem(
  itemId: string
): Promise<QueryResult<WardrobeItem>> {
  return fetchSingle<WardrobeItem>('wardrobe_items', '*', {
    id: itemId,
    archived_at: null,
  });
}

/**
 * Get multiple wardrobe items by IDs (batch query)
 */
export async function getWardrobeItemsByIds(
  itemIds: string[]
): Promise<QueryListResult<WardrobeItem>> {
  if (itemIds.length === 0) {
    return { data: [], error: null };
  }

  return fetchList<WardrobeItem>('wardrobe_items', '*', {
    filters: {
      id: itemIds,
      archived_at: null,
    },
  });
}

/**
 * Create wardrobe item with images
 */
export async function createWardrobeItem(
  userId: string,
  wardrobeId: string,
  itemData: {
    title: string;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    brand?: string;
    visibility_override?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  },
  imageFiles: Array<{ uri: string; type: string; name: string }>
): Promise<{
  data: { item: WardrobeItem; images: any[] } | null;
  error: any;
}> {
  try {
    // Upload images first
    const { data: imageIds, errors: uploadErrors } = await batchUploadImages(
      userId,
      imageFiles,
      'upload'
    );

    if (uploadErrors.length > 0) {
      console.warn('Some images failed to upload:', uploadErrors);
    }

    if (imageIds.length === 0) {
      return {
        data: null,
        error: new Error('Failed to upload any images'),
      };
    }

    // Create wardrobe item
    const { data: item, error: itemError } = await supabase
      .from('wardrobe_items')
      .insert({
        wardrobe_id: wardrobeId,
        owner_user_id: userId,
        ...itemData,
      })
      .select()
      .single();

    if (itemError) {
      throw itemError;
    }

    // Link images to wardrobe item
    const imageLinks = imageIds.map((imageId, index) => ({
      wardrobe_item_id: item.id,
      image_id: imageId,
      type: 'original' as const,
      sort_order: index,
    }));

    const { data: itemImages, error: linkError } = await supabase
      .from('wardrobe_item_images')
      .insert(imageLinks)
      .select();

    if (linkError) {
      console.error('Failed to create image links:', linkError);
      
      // Try to verify if links exist despite error
      const { data: existingLinks } = await supabase
        .from('wardrobe_item_images')
        .select('*, images(*)')
        .eq('wardrobe_item_id', item.id)
        .order('sort_order', { ascending: true });

      if (existingLinks && existingLinks.length > 0) {
        return { data: { item, images: existingLinks }, error: null };
      }

      return {
        data: { item, images: [] },
        error: {
          ...linkError,
          message: `Item created but image links failed: ${linkError.message}`,
          partialSuccess: true,
        } as any,
      };
    }

    return { data: { item, images: itemImages || [] }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update wardrobe item
 */
export async function updateWardrobeItem(
  itemId: string,
  userId: string,
  updates: Partial<Omit<WardrobeItem, 'id' | 'owner_user_id' | 'created_at'>>
): Promise<QueryResult<WardrobeItem>> {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('owner_user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete wardrobe item (soft delete)
 */
export async function deleteWardrobeItem(
  itemId: string,
  userId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('wardrobe_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('owner_user_id', userId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get wardrobe items for another user (for viewing their wardrobe)
 */
export async function getUserWardrobeItems(
  userId: string,
  filters?: {
    category_id?: string;
    search?: string;
  }
): Promise<QueryListResult<WardrobeItem>> {
  try {
    const { data: wardrobeId, error: wardrobeError } =
      await getDefaultWardrobeId(userId);
    
    if (wardrobeError || !wardrobeId) {
      return { data: [], error: wardrobeError };
    }

    return getWardrobeItems(wardrobeId, filters);
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Save a wardrobe item from another user to your saved items
 */
export async function saveWardrobeItem(
  userId: string,
  wardrobeItemId: string
): Promise<QueryResult<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('saved_wardrobe_items')
      .insert({
        user_id: userId,
        wardrobe_item_id: wardrobeItemId,
      })
      .select('id')
      .single();

    // Already saved is OK
    if (error?.code === '23505') {
      return { data: null, error: null };
    }

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unsave a wardrobe item
 */
export async function unsaveWardrobeItem(
  userId: string,
  wardrobeItemId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('saved_wardrobe_items')
      .delete()
      .eq('user_id', userId)
      .eq('wardrobe_item_id', wardrobeItemId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if a wardrobe item is saved by the user
 */
export async function isWardrobeItemSaved(
  userId: string,
  wardrobeItemId: string
): Promise<{ data: boolean; error: any }> {
  try {
    const { data, error } = await supabase
      .from('saved_wardrobe_items')
      .select('id')
      .eq('user_id', userId)
      .eq('wardrobe_item_id', wardrobeItemId)
      .maybeSingle();

    return { data: !!data, error };
  } catch (error: any) {
    return { data: false, error };
  }
}

/**
 * Get all saved wardrobe items for a user
 */
export async function getSavedWardrobeItems(
  userId: string,
  filters?: {
    category_id?: string;
    search?: string;
  }
): Promise<QueryListResult<WardrobeItem>> {
  try {
    // Get saved item IDs
    const { data: savedItems, error: savedError } = await supabase
      .from('saved_wardrobe_items')
      .select('wardrobe_item_id')
      .eq('user_id', userId);

    if (savedError || !savedItems || savedItems.length === 0) {
      return { data: [], error: savedError };
    }

    const itemIds = savedItems.map((item) => item.wardrobe_item_id);

    // Get the actual wardrobe items
    const queryFilters: Record<string, any> = {
      id: itemIds,
      archived_at: null,
    };

    if (filters?.category_id) {
      queryFilters.category_id = filters.category_id;
    }

    let result = await fetchList<WardrobeItem>('wardrobe_items', '*', {
      filters: queryFilters,
      orderBy: { column: 'created_at', ascending: false },
    });

    // Apply search filter if provided
    if (filters?.search && result.data) {
      const searchLower = filters.search.toLowerCase();
      result.data = result.data.filter((item) =>
        item.title.toLowerCase().includes(searchLower)
      );
    }

    return result;
  } catch (error: any) {
    return { data: [], error };
  }
}
