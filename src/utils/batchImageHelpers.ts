import { supabase } from '@/lib/supabase';

export interface OutfitWithCover {
  id: string;
  cover_image_id?: string | null;
}

/**
 * Batch-fetches cover image URLs for a list of outfits.
 * Queries the images table once for all cover_image_ids,
 * then generates public URLs via Supabase storage.
 *
 * @returns Map keyed by outfit ID -> public URL (or null if no cover)
 */
export async function batchGetOutfitCoverImages(
  outfits: OutfitWithCover[]
): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();

  const coverImageIds = outfits
    .map((outfit) => outfit.cover_image_id)
    .filter(Boolean) as string[];

  if (coverImageIds.length === 0) {
    outfits.forEach((outfit) => imageMap.set(outfit.id, null));
    return imageMap;
  }

  const { data: coverImages } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', coverImageIds);

  const coverImageLookup = new Map((coverImages || []).map((img) => [img.id, img]));

  outfits.forEach((outfit) => {
    if (outfit.cover_image_id) {
      const image = coverImageLookup.get(outfit.cover_image_id);
      if (image?.storage_key) {
        const { data } = supabase.storage
          .from(image.storage_bucket || 'media')
          .getPublicUrl(image.storage_key);
        imageMap.set(outfit.id, data.publicUrl);
        return;
      }
    }
    imageMap.set(outfit.id, null);
  });

  return imageMap;
}
