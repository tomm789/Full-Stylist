import { supabase } from '../supabase';

/**
 * Find orphaned images (images not linked to any wardrobe item)
 */
export async function findOrphanedImages(userId: string): Promise<{
  data: {
    orphanedImages: Array<{ id: string; storage_key: string; created_at: string }>;
    itemsWithoutImages: Array<{ id: string; title: string; created_at: string }>;
  } | null;
  error: any;
}> {
  try {
    // Get all images owned by user
    const { data: allImages, error: imagesError } = await supabase
      .from('images')
      .select('id, storage_key, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    if (imagesError) {
      throw imagesError;
    }

    // Get all image links
    const imageIds = allImages?.map((img) => img.id) || [];
    const { data: allLinks, error: linksError } = await supabase
      .from('wardrobe_item_images')
      .select('image_id')
      .in(
        'image_id',
        imageIds.length > 0 ? imageIds : ['00000000-0000-0000-0000-000000000000']
      );

    if (linksError) {
      throw linksError;
    }

    const linkedImageIds = new Set((allLinks || []).map((link) => link.image_id));
    const orphanedImages = (allImages || []).filter(
      (img) => !linkedImageIds.has(img.id)
    );

    // Get all wardrobe items owned by user
    const { data: allItems, error: itemsError } = await supabase
      .from('wardrobe_items')
      .select('id, title, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .is('archived_at', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    // Get all item links to find items without images
    const itemIds = allItems?.map((item) => item.id) || [];
    const { data: itemLinks, error: itemLinksError } = await supabase
      .from('wardrobe_item_images')
      .select('wardrobe_item_id')
      .in(
        'wardrobe_item_id',
        itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000']
      );

    if (itemLinksError) {
      throw itemLinksError;
    }

    const linkedItemIds = new Set(
      (itemLinks || []).map((link) => link.wardrobe_item_id)
    );
    const itemsWithoutImages = (allItems || []).filter(
      (item) => !linkedItemIds.has(item.id)
    );

    return {
      data: {
        orphanedImages: orphanedImages.map((img) => ({
          id: img.id,
          storage_key: img.storage_key,
          created_at: img.created_at,
        })),
        itemsWithoutImages: itemsWithoutImages.map((item) => ({
          id: item.id,
          title: item.title,
          created_at: item.created_at,
        })),
      },
      error: null,
    };
  } catch (error: any) {
    console.error('[findOrphanedImages] Error:', error);
    return { data: null, error };
  }
}

/**
 * Repair wardrobe item image links by matching orphaned images to items
 * This attempts to link images to items based on creation time proximity
 */
export async function repairWardrobeItemImageLinks(
  userId: string,
  itemId?: string
): Promise<{
  data: {
    repaired: number;
    linked: Array<{ itemId: string; imageId: string }>;
  } | null;
  error: any;
}> {
  try {
    // Find orphaned images and items without images
    const { data: diagnostic, error: diagnosticError } =
      await findOrphanedImages(userId);
    
    if (diagnosticError || !diagnostic) {
      throw diagnosticError || new Error('Failed to find orphaned images');
    }

    const { orphanedImages, itemsWithoutImages } = diagnostic;

    if (orphanedImages.length === 0 || itemsWithoutImages.length === 0) {
      return { data: { repaired: 0, linked: [] }, error: null };
    }

    // Filter to specific item if provided
    const itemsToRepair = itemId
      ? itemsWithoutImages.filter((item) => item.id === itemId)
      : itemsWithoutImages;

    if (itemsToRepair.length === 0) {
      return { data: { repaired: 0, linked: [] }, error: null };
    }

    const linked: Array<{ itemId: string; imageId: string }> = [];
    let repaired = 0;
    const linkedImageIds = new Set<string>();

    // Match images to items based on creation time proximity (within 5 minutes)
    for (const item of itemsToRepair) {
      const itemCreatedAt = new Date(item.created_at).getTime();

      // Find images created within 5 minutes of item creation
      const matchingImages = orphanedImages
        .filter((img) => !linkedImageIds.has(img.id))
        .filter((img) => {
          const imageCreatedAt = new Date(img.created_at).getTime();
          const timeDiff = Math.abs(imageCreatedAt - itemCreatedAt);
          return timeDiff <= 5 * 60 * 1000; // 5 minutes
        });

      if (matchingImages.length > 0) {
        // Check if this item already has links
        const { data: existingLinks } = await supabase
          .from('wardrobe_item_images')
          .select('image_id')
          .eq('wardrobe_item_id', item.id);

        if (existingLinks && existingLinks.length > 0) {
          existingLinks.forEach((link) => linkedImageIds.add(link.image_id));
          continue;
        }

        // Link up to 3 matching images
        const imagesToLink = matchingImages.slice(0, 3);

        const imageLinks = imagesToLink.map((img, index) => ({
          wardrobe_item_id: item.id,
          image_id: img.id,
          type: 'original' as const,
          sort_order: index,
        }));

        const { data: insertedLinks, error: insertError } = await supabase
          .from('wardrobe_item_images')
          .insert(imageLinks)
          .select();

        if (insertError) {
          // Check if it's a duplicate key error
          if (insertError.code === '23505') {
            imagesToLink.forEach((img) => linkedImageIds.add(img.id));
            const { data: verifiedLinks } = await supabase
              .from('wardrobe_item_images')
              .select('image_id')
              .eq('wardrobe_item_id', item.id);
            if (verifiedLinks && verifiedLinks.length > 0) {
              repaired++;
            }
          }
          continue;
        }

        // Mark images as linked
        imagesToLink.forEach((img) => {
          linkedImageIds.add(img.id);
          linked.push({ itemId: item.id, imageId: img.id });
        });

        // Verify links were created
        if (!insertedLinks || insertedLinks.length === 0) {
          const { data: verifiedLinks } = await supabase
            .from('wardrobe_item_images')
            .select('image_id')
            .eq('wardrobe_item_id', item.id);
          if (!verifiedLinks || verifiedLinks.length === 0) {
            continue;
          }
        }

        repaired++;
      }
    }

    return { data: { repaired, linked }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Diagnostic function to check wardrobe item images and diagnose RLS issues
 */
export async function diagnoseWardrobeItemImages(itemId: string): Promise<{
  data: {
    hasLinks: boolean;
    linkCount: number;
    accessibleImages: number;
    blockedImages: number;
  } | null;
  error: any;
}> {
  try {
    // Check if wardrobe_item_images records exist
    const { data: linkData, error: linkError } = await supabase
      .from('wardrobe_item_images')
      .select('id, image_id, wardrobe_item_id, type, sort_order')
      .eq('wardrobe_item_id', itemId);

    if (linkError) {
      return {
        data: {
          hasLinks: false,
          linkCount: 0,
          accessibleImages: 0,
          blockedImages: 0,
        },
        error: linkError,
      };
    }

    if (!linkData || linkData.length === 0) {
      return {
        data: {
          hasLinks: false,
          linkCount: 0,
          accessibleImages: 0,
          blockedImages: 0,
        },
        error: null,
      };
    }

    // Check if we can access the image records directly
    const imageIds = linkData.map((link) => link.image_id);
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key, owner_user_id')
      .in('id', imageIds);

    const accessibleCount = imageData?.length || 0;
    const blockedCount = imageIds.length - accessibleCount;

    return {
      data: {
        hasLinks: true,
        linkCount: linkData.length,
        accessibleImages: accessibleCount,
        blockedImages: blockedCount,
      },
      error: imageError || null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Check if the images RLS migration has been applied
 */
export async function checkImagesRLSMigration(): Promise<{
  data: { applied: boolean } | null;
  error: any;
}> {
  try {
    // Try to query the policy information
    const { data: testData, error: testError } = await supabase
      .from('wardrobe_item_images')
      .select('id')
      .limit(1);

    if (testError) {
      console.warn('[checkImagesRLSMigration] Could not query:', testError);
      return { data: { applied: false }, error: testError };
    }

    return { data: { applied: true }, error: null };
  } catch (error: any) {
    console.error('[checkImagesRLSMigration] Error:', error);
    return { data: { applied: false }, error };
  }
}
