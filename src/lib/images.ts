import { supabase } from './supabase';
import { getOutfit } from './outfits';
import { getWardrobeItemImages } from './wardrobe';

export function getPublicImageUrl(
  image?: { storage_bucket?: string | null; storage_key?: string | null } | null
): string | null {
  if (!image?.storage_key) return null;

  const { data: urlData } = supabase.storage
    .from(image.storage_bucket || 'media')
    .getPublicUrl(image.storage_key);

  return urlData.publicUrl;
}

/** Minimal outfit shape for batched cover image lookup */
export type OutfitCoverDescriptor = { id: string; cover_image_id?: string | null };

/**
 * Batched fetch of outfit cover image URLs (list use only).
 * One request to images; no per-outfit queries. Do not use for single-outfit views.
 *
 * State model:
 * - key missing => "loading/unknown" (allows list spinners)
 * - key => string => image loaded
 * - key => null => known no cover image
 */
export async function getOutfitCoverImages(
  outfits: Array<OutfitCoverDescriptor>
): Promise<Map<string, string | null>> {
  // Deduplicate by outfit id (first occurrence wins)
  const byId = new Map<string, OutfitCoverDescriptor>();
  for (const o of outfits) {
    if (o?.id && !byId.has(o.id)) byId.set(o.id, o);
  }
  const deduped = [...byId.values()];
  if (deduped.length === 0) return new Map();

  const coverImageIds = [
    ...new Set(deduped.map((o) => o.cover_image_id).filter(Boolean)),
  ] as string[];

  // If there are no cover_image_id values at all, we *know* there are no covers for this list.
  if (coverImageIds.length === 0) {
    const imageMap = new Map<string, string | null>();
    for (const o of deduped) imageMap.set(o.id, null);
    return imageMap;
  }

  const { data: images, error } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', coverImageIds);

  // On failure, return empty map (treat as "unknown/loading" rather than "no image")
  if (error || !images) {
    console.warn('getOutfitCoverImages: images fetch failed', error);
    return new Map();
  }

  const urlByImageId = new Map<string, string | null>();
  for (const img of images) {
    urlByImageId.set(img.id, getPublicImageUrl(img));
  }

  const imageMap = new Map<string, string | null>();
  for (const o of deduped) {
    const url = o.cover_image_id
      ? urlByImageId.get(o.cover_image_id) ?? null
      : null;
    imageMap.set(o.id, url);
  }

  return imageMap;
}

/**
 * Get outfit cover image URL with fallback
 * 1. Try cover_image_id if exists
 * 2. Fallback to first image from first outfit item
 * Use for single-outfit views only; do not use in list path.
 */
export async function getOutfitCoverImageUrl(outfit: {
  id: string;
  cover_image_id?: string;
}): Promise<string | null> {
  // Try cover_image_id first
  if (outfit.cover_image_id) {
    const { data: imageData } = await supabase
      .from('images')
      .select('*')
      .eq('id', outfit.cover_image_id)
      .single();

    const url = getPublicImageUrl(imageData);
    if (url) return url;
  }

  // Fallback: get first image from first outfit item
  if (outfit.id) {
    const { data: outfitData } = await getOutfit(outfit.id);
    if (outfitData?.items && outfitData.items.length > 0) {
      const firstItem = outfitData.items[0];
      const { data: images } = await getWardrobeItemImages(firstItem.wardrobe_item_id);
      if (images && images.length > 0) {
        const url = getPublicImageUrl(images[0].image);
        if (url) return url;
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