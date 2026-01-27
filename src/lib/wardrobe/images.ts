import { supabase } from '../supabase';
import { QueryListResult } from '../utils/supabase-helpers';

/**
 * Get images for a wardrobe item
 */
export async function getWardrobeItemImages(itemId: string): Promise<{
  data: Array<{
    id: string;
    image_id: string;
    type: string;
    sort_order: number;
    image: any;
  }>;
  error: any;
}> {
  try {
    // Fetch wardrobe_item_images links first
    const { data: links, error: linksError } = await supabase
      .from('wardrobe_item_images')
      .select('*')
      .eq('wardrobe_item_id', itemId)
      .order('sort_order', { ascending: true });

    if (linksError) {
      return { data: [], error: linksError };
    }

    if (!links || links.length === 0) {
      return { data: [], error: null };
    }

    // Fetch images directly using the image IDs
    const linkImageIds = links.map((link) => link.image_id);
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .in('id', linkImageIds);

    if (imagesError) {
      return { data: [], error: imagesError };
    }

    // Manually join the data
    const imagesMap = new Map(images?.map((img) => [img.id, img]) || []);
    const data = links.map((link) => ({
      ...link,
      image: imagesMap.get(link.image_id) || null,
    }));

    return { data, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get images for multiple wardrobe items at once (batch query)
 */
export async function getWardrobeItemsImages(itemIds: string[]): Promise<{
  data: Map<
    string,
    Array<{
      id: string;
      image_id: string;
      type: string;
      sort_order: number;
      image: any;
    }>
  >;
  error: any;
}> {
  if (itemIds.length === 0) {
    return { data: new Map(), error: null };
  }

  try {
    // Fetch all links for all items at once
    const { data: links, error: linksError } = await supabase
      .from('wardrobe_item_images')
      .select('*')
      .in('wardrobe_item_id', itemIds)
      .order('sort_order', { ascending: true });

    if (linksError) {
      return { data: new Map(), error: linksError };
    }

    if (!links || links.length === 0) {
      return { data: new Map(), error: null };
    }

    // Get all unique image IDs
    const imageIds = [...new Set(links.map((link) => link.image_id))];

    // Fetch all images at once
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .in('id', imageIds);

    if (imagesError) {
      return { data: new Map(), error: imagesError };
    }

    // Create a map of image ID to image data
    const imagesMap = new Map(images?.map((img) => [img.id, img]) || []);

    // Group links by wardrobe_item_id and attach image data
    const itemImagesMap = new Map<string, Array<any>>();
    links.forEach((link) => {
      const itemImages = itemImagesMap.get(link.wardrobe_item_id) || [];
      itemImages.push({
        ...link,
        image: imagesMap.get(link.image_id) || null,
      });
      itemImagesMap.set(link.wardrobe_item_id, itemImages);
    });

    return { data: itemImagesMap, error: null };
  } catch (error: any) {
    return { data: new Map(), error };
  }
}

/**
 * Add image to wardrobe item
 */
export async function addImageToWardrobeItem(
  itemId: string,
  imageId: string,
  type: 'original' | 'product_shot' = 'original',
  sortOrder?: number
): Promise<{ error: any }> {
  try {
    // Get current max sort_order if not provided
    if (sortOrder === undefined) {
      const { data: existing } = await supabase
        .from('wardrobe_item_images')
        .select('sort_order')
        .eq('wardrobe_item_id', itemId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      sortOrder = existing ? existing.sort_order + 1 : 0;
    }

    const { error } = await supabase.from('wardrobe_item_images').insert({
      wardrobe_item_id: itemId,
      image_id: imageId,
      type,
      sort_order: sortOrder,
    });

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Remove image from wardrobe item
 */
export async function removeImageFromWardrobeItem(
  itemId: string,
  imageId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('wardrobe_item_images')
      .delete()
      .eq('wardrobe_item_id', itemId)
      .eq('image_id', imageId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Update image sort order
 */
export async function updateImageSortOrder(
  itemId: string,
  imageUpdates: Array<{ image_id: string; sort_order: number }>
): Promise<{ error: any }> {
  try {
    // Update each image's sort order
    for (const update of imageUpdates) {
      const { error } = await supabase
        .from('wardrobe_item_images')
        .update({ sort_order: update.sort_order })
        .eq('wardrobe_item_id', itemId)
        .eq('image_id', update.image_id);

      if (error) {
        return { error };
      }
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Set primary image for wardrobe item (moves to sort_order 0)
 */
export async function setPrimaryImage(
  itemId: string,
  imageId: string
): Promise<{ error: any }> {
  try {
    // Get all current images
    const { data: images } = await supabase
      .from('wardrobe_item_images')
      .select('image_id, sort_order')
      .eq('wardrobe_item_id', itemId)
      .order('sort_order', { ascending: true });

    if (!images) {
      return { error: new Error('No images found') };
    }

    // Build new sort orders
    const updates: Array<{ image_id: string; sort_order: number }> = [];
    let nextOrder = 1;

    for (const img of images) {
      if (img.image_id === imageId) {
        updates.push({ image_id: img.image_id, sort_order: 0 });
      } else {
        updates.push({ image_id: img.image_id, sort_order: nextOrder++ });
      }
    }

    return updateImageSortOrder(itemId, updates);
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get primary image for wardrobe item
 */
export async function getPrimaryImage(itemId: string): Promise<{
  data: { id: string; image_id: string; image: any } | null;
  error: any;
}> {
  try {
    const { data: link, error: linkError } = await supabase
      .from('wardrobe_item_images')
      .select('*')
      .eq('wardrobe_item_id', itemId)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (linkError || !link) {
      return { data: null, error: linkError };
    }

    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('*')
      .eq('id', link.image_id)
      .single();

    if (imageError) {
      return { data: null, error: imageError };
    }

    return {
      data: {
        ...link,
        image,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}
