import { supabase } from '../supabase';
import { calculateOutfitRatings } from '../outfits/ratings';

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
      .is('archived_at', null)
      .is('deleted_at', null);

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
