/**
 * Wardrobe Items Queries
 * All get/search/fetch-style functions for wardrobe items
 */

import { supabase } from '../supabase';
import { fetchList, fetchSingle, QueryListResult, QueryResult, searchRecords } from '../utils/supabase-helpers';
import { WardrobeItem } from './items-types';

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
    deleted_at: null,
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
        deleted_at: null,
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
    deleted_at: null,
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
      deleted_at: null,
    },
  });
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
 * Get archived wardrobe items for a user
 */
export async function getArchivedWardrobeItems(
  wardrobeId: string,
  filters?: {
    category_id?: string;
    search?: string;
    is_favorite?: boolean;
  }
): Promise<QueryListResult<WardrobeItem>> {
  try {
    let query = supabase
      .from('wardrobe_items')
      .select('*')
      .eq('wardrobe_id', wardrobeId)
      .not('archived_at', 'is', null)
      .is('deleted_at', null);

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }

    query = query.order('archived_at', { ascending: false });

    const { data, error } = await query;
    if (error) return { data: [], error };

    let results = (data || []) as WardrobeItem[];

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter((item) =>
        item.title.toLowerCase().includes(searchLower)
      );
    }

    return { data: results, error: null };
  } catch (error: any) {
    return { data: [], error };
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
      deleted_at: null,
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
