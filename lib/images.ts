import { supabase } from './supabase';
import { getOutfit } from './outfits';
import { getWardrobeItemImages } from './wardrobe';

/**
 * Get outfit cover image URL with fallback
 * 1. Try cover_image_id if exists
 * 2. Fallback to first image from first outfit item
 */
export async function getOutfitCoverImageUrl(outfit: { id: string; cover_image_id?: string }): Promise<string | null> {
  // Try cover_image_id first
  if (outfit.cover_image_id) {
    const { data: imageData } = await supabase
      .from('images')
      .select('*')
      .eq('id', outfit.cover_image_id)
      .single();

    if (imageData) {
      const { data: urlData } = supabase.storage
        .from(imageData.storage_bucket || 'media')
        .getPublicUrl(imageData.storage_key);
      return urlData.publicUrl;
    }
  }

  // Fallback: get first image from first outfit item
  if (outfit.id) {
    const { data: outfitData } = await getOutfit(outfit.id);
    if (outfitData?.items && outfitData.items.length > 0) {
      const firstItem = outfitData.items[0];
      const { data: images } = await getWardrobeItemImages(firstItem.wardrobe_item_id);
      if (images && images.length > 0) {
        const imageData = images[0].image;
        if (imageData) {
          const { data: urlData } = supabase.storage
            .from(imageData.storage_bucket || 'media')
            .getPublicUrl(imageData.storage_key);
          return urlData.publicUrl;
        }
      }
    }
  }

  return null;
}
