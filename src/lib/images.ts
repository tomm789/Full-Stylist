import { supabase } from './supabase';
import { getOutfit } from './outfits';
import { getWardrobeItemImages } from './wardrobe';

export function getPublicImageUrl(image?: { storage_bucket?: string | null; storage_key?: string | null } | null): string | null {
  if (!image?.storage_key) {
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(image.storage_bucket || 'media')
    .getPublicUrl(image.storage_key);
  return urlData.publicUrl;
}

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

    const url = getPublicImageUrl(imageData);
    if (url) {
      return url;
    }
  }

  // Fallback: get first image from first outfit item
  if (outfit.id) {
    const { data: outfitData } = await getOutfit(outfit.id);
    if (outfitData?.items && outfitData.items.length > 0) {
      const firstItem = outfitData.items[0];
      const { data: images } = await getWardrobeItemImages(firstItem.wardrobe_item_id);
      if (images && images.length > 0) {
        const url = getPublicImageUrl(images[0].image);
        if (url) {
          return url;
        }
      }
    }
  }

  return null;
}

export async function getUserGeneratedImages(userId: string): Promise<{
  headshots: Array<{ id: string; url: string | null; created_at: string }>;
  bodyShots: Array<{ id: string; url: string | null; created_at: string }>;
}> {
  const { data: allImages, error } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key, created_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !allImages) {
    return { headshots: [], bodyShots: [] };
  }

  const headshots = allImages
    .filter((img) => img.storage_key?.includes('/ai/headshots/'))
    .map((img) => ({
      id: img.id,
      url: getPublicImageUrl(img),
      created_at: img.created_at,
    }));

  const bodyShots = allImages
    .filter((img) => img.storage_key?.includes('/ai/body_shots/'))
    .map((img) => ({
      id: img.id,
      url: getPublicImageUrl(img),
      created_at: img.created_at,
    }));

  return { headshots, bodyShots };
}
