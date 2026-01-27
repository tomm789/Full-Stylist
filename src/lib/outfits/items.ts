import { supabase } from '../supabase';
import type { Outfit } from './core';

export interface OutfitItem {
  id: string;
  outfit_id: string;
  category_id: string;
  wardrobe_item_id: string;
  position: number;
  created_at: string;
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

/**
 * Update outfit item position
 */
export async function updateOutfitItemPosition(
  outfitItemId: string,
  position: number
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('outfit_items')
    .update({ position })
    .eq('id', outfitItemId);

  return { error };
}

/**
 * Reorder all outfit items
 */
export async function reorderOutfitItems(
  outfitId: string,
  itemPositions: Array<{ id: string; position: number }>
): Promise<{ error: any }> {
  try {
    // Update each item's position
    for (const item of itemPositions) {
      const { error } = await supabase
        .from('outfit_items')
        .update({ position: item.position })
        .eq('id', item.id)
        .eq('outfit_id', outfitId);

      if (error) {
        throw error;
      }
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}
