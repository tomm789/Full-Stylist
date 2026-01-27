import { supabase } from '../supabase';
import { getEntityAttributes } from '../attributes';
import type { WardrobeItem } from '../wardrobe';
import type { Outfit } from '../outfits';
import { calculateSimilarityScore } from './scoring';

export interface SimilarityResult {
  item: WardrobeItem | Outfit;
  score: number;
  matchingAttributes: Array<{
    key: string;
    value: string;
    confidence?: number;
  }>;
}

/**
 * Find similar items in user's wardrobe by attributes
 * Uses entity_attributes + attribute_cache for similarity (no image reprocessing)
 */
export async function findSimilarInWardrobe(
  userId: string,
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
    // For outfits, we need to aggregate attributes from the wardrobe items that make up the outfit
    let sourceAttrs: any[] = [];
    let attrsError: any = null;
    
    if (sourceEntityType === 'outfit') {
      // Get outfit items and collect attributes from each wardrobe item
      const { data: outfitItems, error: outfitItemsError } = await supabase
        .from('outfit_items')
        .select('wardrobe_item_id')
        .eq('outfit_id', sourceEntityId);
      
      if (outfitItemsError) {
        attrsError = outfitItemsError;
      } else if (outfitItems && outfitItems.length > 0) {
        // Collect attributes from all wardrobe items in the outfit
        const allAttrs: any[] = [];
        for (const item of outfitItems) {
          const { data: itemAttrs } = await getEntityAttributes('wardrobe_item', item.wardrobe_item_id);
          if (itemAttrs && itemAttrs.length > 0) {
            allAttrs.push(...itemAttrs);
          }
        }
        sourceAttrs = allAttrs;
      }
    } else {
      // For wardrobe items, get attributes directly
      const result = await getEntityAttributes(sourceEntityType, sourceEntityId);
      sourceAttrs = result.data || [];
      attrsError = result.error;
    }

    if (attrsError) {
      throw attrsError;
    }

    if (!sourceAttrs || sourceAttrs.length === 0) {
      // No attributes to compare, return empty
      return { data: [], error: null };
    }

    // Get all wardrobe items for user (with category filter if provided)
    let wardrobeQuery = supabase
      .from('wardrobe_items')
      .select('*')
      .eq('owner_user_id', userId);

    // Exclude source item only if it's a wardrobe item (not an outfit)
    if (sourceEntityType === 'wardrobe_item') {
      wardrobeQuery = wardrobeQuery.neq('id', sourceEntityId);
    }

    if (categoryId) {
      wardrobeQuery = wardrobeQuery.eq('category_id', categoryId);
    }

    const { data: wardrobeItems, error: itemsError } = await wardrobeQuery;

    if (itemsError) {
      throw itemsError;
    }

    if (!wardrobeItems || wardrobeItems.length === 0) {
      return { data: [], error: null };
    }

    // Get attributes for all items and calculate similarity
    const results: SimilarityResult[] = [];

    for (const item of wardrobeItems) {
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
