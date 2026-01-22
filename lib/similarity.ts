import { supabase } from './supabase';
import { getEntityAttributes, EntityAttribute } from './attributes';
import { WardrobeItem } from './wardrobe';
import { Outfit } from './outfits';

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
 * Calculate similarity score between two sets of attributes
 * Uses attribute overlap scoring
 */
function calculateSimilarityScore(
  sourceAttrs: EntityAttribute[],
  targetAttrs: EntityAttribute[]
): {
  score: number;
  matchingAttributes: Array<{
    key: string;
    value: string;
    confidence?: number;
  }>;
} {
  // Create maps of attributes by definition_id
  const sourceMap = new Map<string, EntityAttribute[]>();
  const targetMap = new Map<string, EntityAttribute[]>();

  for (const attr of sourceAttrs) {
    const key = attr.definition_id;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, []);
    }
    sourceMap.get(key)!.push(attr);
  }

  for (const attr of targetAttrs) {
    const key = attr.definition_id;
    if (!targetMap.has(key)) {
      targetMap.set(key, []);
    }
    targetMap.get(key)!.push(attr);
  }

  let matches = 0;
  let totalSource = sourceAttrs.length;
  let totalTarget = targetAttrs.length;

  const matchingAttributes: Array<{
    key: string;
    value: string;
    confidence?: number;
  }> = [];

  // Compare attributes
  for (const [defId, sourceAttrsList] of sourceMap.entries()) {
    const targetAttrsList = targetMap.get(defId);
    if (targetAttrsList) {
      // Check for value matches
      for (const sourceAttr of sourceAttrsList) {
        const sourceValue = sourceAttr.raw_value || (sourceAttr.value_id ? '' : '');
        for (const targetAttr of targetAttrsList) {
          const targetValue = targetAttr.raw_value || (targetAttr.value_id ? '' : '');
          
          // Compare normalized values if available, otherwise raw values
          if (
            sourceAttr.value_id === targetAttr.value_id ||
            sourceValue.toLowerCase().trim() === targetValue.toLowerCase().trim()
          ) {
            matches++;
            matchingAttributes.push({
              key: defId,
              value: sourceValue || targetValue,
              confidence: Math.max(
                sourceAttr.confidence || 0,
                targetAttr.confidence || 0
              ),
            });
            break; // Count each source attribute once
          }
        }
      }
    }
  }

  // Calculate score: matches / (average of source and target counts)
  // This gives a balanced score that accounts for both sets
  const avgCount = (totalSource + totalTarget) / 2;
  const score = avgCount > 0 ? (matches / avgCount) * 100 : 0;

  return { score, matchingAttributes };
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
    let sourceAttrs: EntityAttribute[] = [];
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
        const allAttrs: EntityAttribute[] = [];
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
