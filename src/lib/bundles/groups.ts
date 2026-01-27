import { supabase } from '../supabase';

export interface BundleGroup {
  id: string;
  bundle_id: string;
  title: string;
  is_required: boolean;
  created_at: string;
}

export interface BundleGroupItem {
  id: string;
  group_id: string;
  wardrobe_item_id: string;
  quantity: number;
}

/**
 * Create bundle group with items
 */
export async function createBundleGroup(
  bundleId: string,
  groupData: {
    title: string;
    is_required: boolean;
    items: Array<{
      wardrobe_item_id: string;
      quantity?: number;
    }>;
  }
): Promise<{
  data: BundleGroup | null;
  error: any;
}> {
  try {
    const { data: group, error: groupError } = await supabase
      .from('bundle_groups')
      .insert({
        bundle_id: bundleId,
        title: groupData.title,
        is_required: groupData.is_required,
      })
      .select()
      .single();

    if (groupError) {
      throw groupError;
    }

    if (groupData.items && groupData.items.length > 0) {
      const groupItemsData = groupData.items.map((item) => ({
        group_id: group.id,
        wardrobe_item_id: item.wardrobe_item_id,
        quantity: item.quantity || 1,
      }));

      const { error: itemsError } = await supabase
        .from('bundle_group_items')
        .insert(groupItemsData);

      if (itemsError) {
        throw itemsError;
      }
    }

    return { data: group, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
