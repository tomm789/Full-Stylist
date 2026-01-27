import { supabase } from '../supabase';
import { saveOutfit } from '../outfits';
import type { LocalStorageOutfit } from './reader';

export async function importOutfits(
  userId: string,
  outfits: LocalStorageOutfit[],
  itemIdMap: Map<number, string>,
  onProgress?: (current: number, total: number) => void
): Promise<{
  data: { imported: number; errors: any[] };
  error: any;
}> {
  try {
    const errors: any[] = [];
    let imported = 0;

    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i];
      
      try {
        const outfitItems: Array<{ category_id: string; wardrobe_item_id: string }> = [];
        
        if (outfit.items && outfit.items.length > 0) {
          for (const oldItemId of outfit.items) {
            const newItemId = itemIdMap.get(oldItemId);
            if (newItemId) {
              const { data: item } = await supabase
                .from('wardrobe_items')
                .select('category_id')
                .eq('id', newItemId)
                .single();
              
              if (item) {
                outfitItems.push({
                  category_id: item.category_id,
                  wardrobe_item_id: newItemId,
                });
              }
            }
          }
        }

        const { error: createError } = await saveOutfit(
          userId,
          {
            title: outfit.name || `Imported Outfit ${outfit.id}`,
          },
          outfitItems
        );

        if (createError) {
          errors.push({ outfit: outfit.name, error: createError });
        } else {
          imported++;
        }
      } catch (error: any) {
        errors.push({ outfit: outfit.name, error: error.message || error });
      }

      if (onProgress) {
        onProgress(i + 1, outfits.length);
      }
    }

    return { data: { imported, errors }, error: null };
  } catch (error: any) {
    return { data: { imported: 0, errors: [] }, error };
  }
}
