/**
 * Notifications Enrichment
 * Functions for enriching notifications with entity data
 */

import { supabase } from '../supabase';

/**
 * Enrich notifications with entity data (posts, outfits, lookbooks)
 */
export async function enrichNotificationsWithEntityData(notifications: any[]): Promise<void> {
  // Group by entity type
  const postIds = notifications
    .filter((n) => n.entity_type === 'post' && n.entity_id)
    .map((n) => n.entity_id!);
  const outfitIds = notifications
    .filter((n) => n.entity_type === 'outfit' && n.entity_id)
    .map((n) => n.entity_id!);
  const lookbookIds = notifications
    .filter((n) => n.entity_type === 'lookbook' && n.entity_id)
    .map((n) => n.entity_id!);

  // Batch fetch posts
  if (postIds.length > 0) {
    await enrichWithPosts(notifications, postIds);
  }

  // Batch fetch outfits
  if (outfitIds.length > 0) {
    await enrichWithOutfits(notifications, outfitIds);
  }

  // Batch fetch lookbooks
  if (lookbookIds.length > 0) {
    await enrichWithLookbooks(notifications, lookbookIds);
  }
}

/**
 * Enrich notifications with post data
 */
export async function enrichWithPosts(notifications: any[], postIds: string[]): Promise<void> {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, entity_type, entity_id')
    .in('id', postIds);

  if (!posts) return;

  // Get all outfit and lookbook IDs from posts
  const postOutfitIds = posts.filter((p) => p.entity_type === 'outfit').map((p) => p.entity_id);
  const postLookbookIds = posts.filter((p) => p.entity_type === 'lookbook').map((p) => p.entity_id);

  // Fetch outfits for posts
  if (postOutfitIds.length > 0) {
    const { data: outfits } = await supabase
      .from('outfits')
      .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
      .in('id', postOutfitIds);

    if (outfits) {
      posts.forEach((post) => {
        const outfit = outfits.find((o) => o.id === post.entity_id);
        if (outfit) {
          (post as any).outfit = outfit;
        }
      });
    }
  }

  // Fetch lookbooks for posts
  if (postLookbookIds.length > 0) {
    const { data: lookbooks } = await supabase
      .from('lookbooks')
      .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
      .in('id', postLookbookIds);

    if (lookbooks) {
      // For lookbooks without cover images, fetch first outfit's image
      const lookbooksNeedingFallback = lookbooks.filter((lb) => !lb.cover_image_id);
      if (lookbooksNeedingFallback.length > 0) {
        const { data: lookbookOutfits } = await supabase
          .from('lookbook_outfits')
          .select(`
            lookbook_id,
            outfit:outfit_id(
              id,
              cover_image_id,
              cover_image:cover_image_id(storage_bucket, storage_key)
            )
          `)
          .in('lookbook_id', lookbooksNeedingFallback.map((lb) => lb.id))
          .order('position', { ascending: true });

        if (lookbookOutfits) {
          lookbooksNeedingFallback.forEach((lookbook) => {
            const firstOutfit = lookbookOutfits.find((lo) => lo.lookbook_id === lookbook.id);
            if (firstOutfit?.outfit?.cover_image) {
              (lookbook as any).cover_image = firstOutfit.outfit.cover_image;
            }
          });
        }
      }

      posts.forEach((post) => {
        const lookbook = lookbooks.find((l) => l.id === post.entity_id);
        if (lookbook) {
          (post as any).lookbook = lookbook;
        }
      });
    }
  }

  // Attach posts to notifications
  notifications.forEach((notif) => {
    if (notif.entity_type === 'post') {
      const post = posts.find((p) => p.id === notif.entity_id);
      if (post) {
        notif.entity = { post };
      }
    }
  });
}

/**
 * Enrich notifications with outfit data
 */
export async function enrichWithOutfits(notifications: any[], outfitIds: string[]): Promise<void> {
  const { data: outfits } = await supabase
    .from('outfits')
    .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
    .in('id', outfitIds);

  if (outfits) {
    notifications.forEach((notif) => {
      if (notif.entity_type === 'outfit') {
        const outfit = outfits.find((o) => o.id === notif.entity_id);
        if (outfit) {
          notif.entity = { outfit };
        }
      }
    });
  }
}

/**
 * Enrich notifications with lookbook data
 */
export async function enrichWithLookbooks(
  notifications: any[],
  lookbookIds: string[]
): Promise<void> {
  const { data: lookbooks } = await supabase
    .from('lookbooks')
    .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
    .in('id', lookbookIds);

  if (!lookbooks) return;

  // For lookbooks without cover images, fetch first outfit's image
  const lookbooksNeedingFallback = lookbooks.filter((lb) => !lb.cover_image_id);
  if (lookbooksNeedingFallback.length > 0) {
    const { data: lookbookOutfits } = await supabase
      .from('lookbook_outfits')
      .select(`
        lookbook_id,
        outfit:outfit_id(
          id,
          cover_image_id,
          cover_image:cover_image_id(storage_bucket, storage_key)
        )
      `)
      .in('lookbook_id', lookbooksNeedingFallback.map((lb) => lb.id))
      .order('position', { ascending: true });

    if (lookbookOutfits) {
      lookbooksNeedingFallback.forEach((lookbook) => {
        const firstOutfit = lookbookOutfits.find((lo) => lo.lookbook_id === lookbook.id);
        if (firstOutfit?.outfit?.cover_image) {
          (lookbook as any).cover_image = firstOutfit.outfit.cover_image;
        }
      });
    }
  }

  notifications.forEach((notif) => {
    if (notif.entity_type === 'lookbook') {
      const lookbook = lookbooks.find((l) => l.id === notif.entity_id);
      if (lookbook) {
        notif.entity = { lookbook };
      }
    }
  });
}
