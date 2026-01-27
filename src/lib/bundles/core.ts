import { supabase } from '../supabase';

export interface OutfitBundle {
  id: string;
  outfit_id: string;
  seller_user_id: string;
  bundle_price?: number;
  currency: string;
  sale_mode: 'items_only' | 'bundle_only' | 'both';
  is_active: boolean;
  created_at: string;
}

export async function getOutfitBundles(outfitId: string): Promise<{
  data: any[];
  error: any;
}> {
  try {
    const { data: bundles, error } = await supabase
      .from('outfit_bundles')
      .select('*, bundle_groups(*, bundle_group_items(*))')
      .eq('outfit_id', outfitId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (bundles as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

export async function getUserOutfitBundles(userId: string): Promise<{
  data: any[];
  error: any;
}> {
  try {
    const { data: bundles, error } = await supabase
      .from('outfit_bundles')
      .select('*, bundle_groups(*, bundle_group_items(*)), outfit:outfits(id, title)')
      .eq('seller_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (bundles as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

export async function getOutfitBundle(bundleId: string): Promise<{
  data: any | null;
  error: any;
}> {
  try {
    const { data: bundle, error } = await supabase
      .from('outfit_bundles')
      .select('*, bundle_groups(*, bundle_group_items(*)), outfit:outfits(id, title)')
      .eq('id', bundleId)
      .single();

    if (error) throw error;
    return { data: bundle as any, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function createOutfitBundle(
  userId: string,
  outfitId: string,
  bundleData: {
    bundle_price?: number;
    currency?: string;
    sale_mode: 'items_only' | 'bundle_only' | 'both';
    groups: Array<{
      title: string;
      is_required: boolean;
      items: Array<{
        wardrobe_item_id: string;
        quantity?: number;
      }>;
    }>;
  }
): Promise<{ data: any | null; error: any }> {
  try {
    const { data: outfit, error: outfitError } = await supabase
      .from('outfits')
      .select('id, owner_user_id')
      .eq('id', outfitId)
      .eq('owner_user_id', userId)
      .single();

    if (outfitError || !outfit) {
      throw new Error('Outfit not found or access denied');
    }

    const { data: bundle, error: bundleError } = await supabase
      .from('outfit_bundles')
      .insert({
        outfit_id: outfitId,
        seller_user_id: userId,
        bundle_price: bundleData.bundle_price,
        currency: bundleData.currency || 'AUD',
        sale_mode: bundleData.sale_mode,
        is_active: true,
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    for (const groupData of bundleData.groups) {
      const { data: group, error: groupError } = await supabase
        .from('bundle_groups')
        .insert({
          bundle_id: bundle.id,
          title: groupData.title,
          is_required: groupData.is_required,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      if (groupData.items && groupData.items.length > 0) {
        const groupItemsData = groupData.items.map((item) => ({
          group_id: group.id,
          wardrobe_item_id: item.wardrobe_item_id,
          quantity: item.quantity || 1,
        }));

        const { error: itemsError } = await supabase
          .from('bundle_group_items')
          .insert(groupItemsData);

        if (itemsError) throw itemsError;
      }
    }

    const { data: fullBundle } = await getOutfitBundle(bundle.id);
    return { data: fullBundle, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function updateOutfitBundle(
  userId: string,
  bundleId: string,
  bundleData: {
    bundle_price?: number;
    currency?: string;
    sale_mode?: 'items_only' | 'bundle_only' | 'both';
    is_active?: boolean;
  }
): Promise<{ data: any | null; error: any }> {
  try {
    const { data: bundle, error } = await supabase
      .from('outfit_bundles')
      .update(bundleData)
      .eq('id', bundleId)
      .eq('seller_user_id', userId)
      .select()
      .single();

    if (error) throw error;
    const { data: fullBundle } = await getOutfitBundle(bundleId);
    return { data: fullBundle, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function deleteOutfitBundle(
  userId: string,
  bundleId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('outfit_bundles')
      .delete()
      .eq('id', bundleId)
      .eq('seller_user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}
