import { supabase } from '../supabase';
import { getEntityAttributes } from '../attributes';
import type { WardrobeItem } from '../wardrobe';
import { calculateSimilarityScore } from './scoring';
import type { SimilarityResult } from './wardrobe-search';

/**
 * Find similar sellable items in the app
 * Filters wardrobe_items with is_sellable=true
 */
export async function findSimilarSellable(
  sourceEntityType: 'wardrobe_item' | 'outfit',
  sourceEntityId: string,
  categoryId?: string,
  limit: number = 20
): Promise<{
  data: SimilarityResult[];
  error: any;
}> {
  try {
    // Get source entity attributes
    const { data: sourceAttrs, error: attrsError } = await getEntityAttributes(
      sourceEntityType,
      sourceEntityId
    );

    if (attrsError) {
      throw attrsError;
    }

    if (!sourceAttrs || sourceAttrs.length === 0) {
      return { data: [], error: null };
    }

    // Get all sellable wardrobe items (with category filter if provided)
    let sellableQuery = supabase
      .from('wardrobe_items')
      .select('*')
      .eq('is_sellable', true);

    if (categoryId) {
      sellableQuery = sellableQuery.eq('category_id', categoryId);
    }

    const { data: sellableItems, error: itemsError } = await sellableQuery;

    if (itemsError) {
      throw itemsError;
    }

    if (!sellableItems || sellableItems.length === 0) {
      return { data: [], error: null };
    }

    // Get attributes for all items and calculate similarity
    const results: SimilarityResult[] = [];

    for (const item of sellableItems) {
      const { data: itemAttrs } = await getEntityAttributes('wardrobe_item', item.id);

      if (itemAttrs && itemAttrs.length > 0) {
        const { score, matchingAttributes } = calculateSimilarityScore(
          sourceAttrs,
          itemAttrs
        );

        if (score > 0) {
          results.push({
            item: item as WardrobeItem,
            score,
            matchingAttributes,
          });
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Return top results
    return { data: results.slice(0, limit), error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Search online for similar items (placeholder - external API integration)
 * Only called when user explicitly taps "Search Online"
 */
export async function searchOnlineSimilar(
  sourceEntityType: 'wardrobe_item' | 'outfit',
  sourceEntityId: string,
  categoryId?: string
): Promise<{
  data: Array<{
    title: string;
    url: string;
    imageUrl?: string;
    price?: string;
  }>;
  error: any;
}> {
  // TODO: Integrate with external shopping API (Google Shopping, etc.)
  // For MVP, return empty or mock data
  return { data: [], error: null };
}
