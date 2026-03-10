import { supabase } from './supabase';

export type EntityType = 'outfit' | 'lookbook' | 'headshot' | 'wardrobe';
export type Visibility = 'public' | 'followers' | 'private_link' | 'private' | 'inherit';

export interface Post {
  id: string;
  owner_user_id: string;
  entity_type: EntityType;
  entity_id: string;
  caption?: string;
  visibility: Visibility;
  share_slug?: string;
  is_aggregate?: boolean;
  created_at: string;
}

export interface FeedItem {
  id: string;
  type: 'post' | 'repost';
  post?: Post;
  repost?: {
    id: string;
    user_id: string;
    original_post_id: string;
    caption?: string;
    created_at: string;
    original_post?: Post;
  };
  owner?: {
    id: string;
    handle: string;
    display_name?: string;
    avatar_url?: string | null;
  };
  entity?: {
    outfit?: any;
    lookbook?: any;
    headshot?: {
      id: string;
      storage_bucket: string;
      storage_key: string;
      width?: number;
      height?: number;
      prompt_text?: string;
      input_snapshot_json?: any;
      variation_id?: string;
    };
    wardrobeItems?: Array<{
      id: string;
      title: string;
      image_url?: string | null;
    }>;
  };
}

/**
 * Create a post for an outfit, lookbook, or headshot
 */
export async function createPost(
  userId: string,
  entityType: EntityType,
  entityId: string,
  caption?: string,
  visibility?: Visibility
): Promise<{
  data: Post | null;
  error: any;
}> {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        owner_user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        caption: caption,
        visibility: visibility || 'public',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: post, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get post by ID
 */
export async function getPost(postId: string): Promise<{
  data: Post | null;
  error: any;
}> {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      throw error;
    }

    return { data: post, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete a post (only by owner)
 */
export async function deletePost(
  postId: string,
  userId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('owner_user_id', userId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Create a post for a headshot image
 * @deprecated Use upsertEntityPost instead for auto-post flow
 */
export async function createHeadshotPost(
  userId: string,
  imageId: string,
  caption?: string,
  visibility?: Visibility
): Promise<{
  data: Post | null;
  error: any;
}> {
  return createPost(userId, 'headshot', imageId, caption, visibility);
}

/**
 * Resolve visibility for a post using the cascade:
 * entity override → per-type default → account default → fallback
 */
export function resolveVisibility(
  entityVisibility: Visibility | undefined,
  settings: {
    default_visibility?: Visibility;
    default_visibility_outfit?: Visibility;
    default_visibility_lookbook?: Visibility;
    default_visibility_headshot?: Visibility;
    default_visibility_wardrobe?: Visibility;
  } | null,
  entityType: EntityType,
  fallback: Visibility = 'followers'
): Visibility {
  // 1. Use entity-level override if set and not 'inherit'
  if (entityVisibility && entityVisibility !== 'inherit') {
    return entityVisibility;
  }

  // 2. Use per-entity-type default if set and not 'inherit'
  const typeKey = `default_visibility_${entityType}` as keyof typeof settings;
  const typeDefault = settings?.[typeKey] as Visibility | undefined;
  if (typeDefault && typeDefault !== 'inherit') {
    return typeDefault;
  }

  // 3. Use account-level default if set and not 'inherit'
  const accountDefault = settings?.default_visibility;
  if (accountDefault && accountDefault !== 'inherit') {
    return accountDefault;
  }

  // 4. Hardcoded fallback
  return fallback;
}

/**
 * Upsert a post for any entity type.
 * Creates post on first call, updates visibility on subsequent calls.
 */
export async function upsertEntityPost(
  userId: string,
  entityType: EntityType,
  entityId: string,
  visibility: Visibility
): Promise<{ data: Post | null; error: any; isFirstPost: boolean }> {
  try {
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();

    if (existingPost?.id) {
      const { data, error } = await supabase
        .from('posts')
        .update({ visibility })
        .eq('id', existingPost.id)
        .eq('owner_user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null, isFirstPost: false };
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        owner_user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        visibility,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null, isFirstPost: true };
  } catch (error: any) {
    return { data: null, error, isFirstPost: false };
  }
}

/**
 * Upsert a daily wardrobe aggregate post.
 * Creates one aggregate post per user per day, appends items to it.
 */
export async function upsertDailyWardrobePost(
  userId: string,
  wardrobeItemId: string,
  visibility: Visibility
): Promise<{ data: Post | null; error: any; isFirstPost: boolean }> {
  try {
    // Find aggregate post from the last 24 hours (avoids timezone issues)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('entity_type', 'wardrobe')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let postId: string;
    let isFirstPost = false;

    if (existingPost?.id) {
      postId = existingPost.id;
    } else {
      // Create new aggregate post
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          owner_user_id: userId,
          entity_type: 'wardrobe',
          entity_id: userId, // Use userId as entity_id for aggregate posts
          visibility,
          caption: 'Added a new item to their wardrobe',
        })
        .select()
        .single();

      if (postError) throw postError;
      postId = newPost.id;
      isFirstPost = true;
    }

    // Add wardrobe item to the aggregate post
    const { error: linkError } = await supabase
      .from('post_wardrobe_items')
      .insert({
        post_id: postId,
        wardrobe_item_id: wardrobeItemId,
      });

    // Ignore duplicate (item already in this post)
    if (linkError && linkError.code !== '23505') {
      throw linkError;
    }

    // Update caption with item count
    const { count } = await supabase
      .from('post_wardrobe_items')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (count && count > 1) {
      await supabase
        .from('posts')
        .update({ caption: `Added ${count} new items to their wardrobe` })
        .eq('id', postId);
    }

    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    return { data: post, error: null, isFirstPost };
  } catch (error: any) {
    return { data: null, error, isFirstPost: false };
  }
}

/**
 * Update post visibility
 */
export async function updatePostVisibility(
  postId: string,
  userId: string,
  visibility: Visibility
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('posts')
      .update({ visibility })
      .eq('id', postId)
      .eq('owner_user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get post for an entity (used by VisibilityToggle to find the post)
 */
export async function getPostForEntity(
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<{ data: Post | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get social feed (posts + reposts) - OPTIMIZED
 * Returns posts and reposts from users the current user follows (and own posts)
 */
export async function getFeed(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  data: FeedItem[];
  error: any;
}> {
  try {
    // Get list of followed user IDs
    const { data: follows } = await supabase
      .from('follows')
      .select('followed_user_id, status')
      .eq('follower_user_id', userId);
    
    const acceptedFollows = follows?.filter(f => f.status === 'accepted') || [];
    const followedUserIds = acceptedFollows.map((f) => f.followed_user_id);
    
    // Build posts query
    let postsQuery = supabase
      .from('posts')
      .select('*, owner:users(id, handle, display_name, avatar_url)');

    // Filter posts
    let filterString = '';
    if (followedUserIds.length > 0) {
      const userFilters = [userId, ...followedUserIds].map(id => `owner_user_id.eq.${id}`).join(',');
      filterString = `${userFilters},visibility.eq.public`;
      postsQuery = postsQuery.or(filterString);
    } else {
      filterString = `owner_user_id.eq.${userId},visibility.eq.public`;
      postsQuery = postsQuery.or(filterString);
    }

    const { data: posts, error: postsError } = await postsQuery
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (postsError) throw postsError;

    // Get reposts
    const { data: allReposts, error: repostsError } = await supabase
      .from('reposts')
      .select(`
        *,
        user:users!reposts_user_id_fkey(id, handle, display_name, avatar_url),
        original_post:posts!reposts_original_post_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (repostsError) throw repostsError;

    // Filter reposts to only public posts
    const reposts = (allReposts || []).filter(
      (r: any) => r.original_post && r.original_post.visibility === 'public'
    );

    // Combine and build feed items
    const feedItems: FeedItem[] = [];

    if (posts) {
      for (const post of posts) {
        feedItems.push({
          id: post.id,
          type: 'post',
          post: post,
          owner: post.owner as any,
        });
      }
    }

    if (reposts) {
      for (const repost of reposts) {
        feedItems.push({
          id: repost.id,
          type: 'repost',
          repost: {
            id: repost.id,
            user_id: repost.user_id,
            original_post_id: repost.original_post_id,
            caption: repost.caption,
            created_at: repost.created_at,
            original_post: repost.original_post as any,
          },
          owner: repost.user as any,
        });
      }
    }

    // Sort by created_at
    feedItems.sort((a, b) => {
      const aDate = a.type === 'post' ? a.post!.created_at : a.repost!.created_at;
      const bDate = b.type === 'post' ? b.post!.created_at : b.repost!.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    // Slice to requested limit
    const limitedItems = feedItems.slice(offset, offset + limit);

    // 🔥 OPTIMIZATION: Batch fetch all entities in TWO queries instead of N queries
    const outfitIds = new Set<string>();
    const lookbookIds = new Set<string>();
    const headshotIds = new Set<string>();
    const wardrobePostIds = new Set<string>();

    limitedItems.forEach(item => {
      const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
      if (post) {
        if (post.entity_type === 'outfit') {
          outfitIds.add(post.entity_id);
        } else if (post.entity_type === 'lookbook') {
          lookbookIds.add(post.entity_id);
        } else if (post.entity_type === 'headshot') {
          headshotIds.add(post.entity_id);
        } else if (post.entity_type === 'wardrobe') {
          wardrobePostIds.add(post.id);
        }
      }
    });

    // Fetch all outfits in ONE query
    let outfitsMap = new Map<string, any>();
    if (outfitIds.size > 0) {
      const { data: outfits } = await supabase
        .from('outfits')
        .select('*')
        .in('id', Array.from(outfitIds));

      if (outfits) {
        outfits.forEach(outfit => outfitsMap.set(outfit.id, outfit));
      }
    }

    // Fetch all lookbooks in ONE query
    let lookbooksMap = new Map<string, any>();
    if (lookbookIds.size > 0) {
      const { data: lookbooks } = await supabase
        .from('lookbooks')
        .select('*')
        .in('id', Array.from(lookbookIds));

      if (lookbooks) {
        lookbooks.forEach(lookbook => lookbooksMap.set(lookbook.id, lookbook));
      }
    }

    // Fetch headshot images + variation prompts in TWO queries
    let headshotsMap = new Map<string, any>();
    if (headshotIds.size > 0) {
      const [{ data: headshotImages }, { data: headshotVariations }] = await Promise.all([
        supabase
          .from('images')
          .select('id, storage_bucket, storage_key, width, height')
          .in('id', Array.from(headshotIds)),
        supabase
          .from('headshot_generation_variations')
          .select('id, image_id, prompt_text, input_snapshot_json')
          .in('image_id', Array.from(headshotIds)),
      ]);

      headshotImages?.forEach(img => {
        headshotsMap.set(img.id, { ...img });
      });
      headshotVariations?.forEach(v => {
        const existing = headshotsMap.get(v.image_id);
        if (existing) {
          headshotsMap.set(v.image_id, {
            ...existing,
            prompt_text: v.prompt_text,
            input_snapshot_json: v.input_snapshot_json,
            variation_id: v.id,
          });
        }
      });
    }

    // Fetch wardrobe items for aggregate posts
    const wardrobeItemsMap = new Map<string, Array<{ id: string; title: string; image_url?: string | null }>>();
    if (wardrobePostIds.size > 0) {
      const { data: postItems } = await supabase
        .from('post_wardrobe_items')
        .select('post_id, wardrobe_item_id, wardrobe_item:wardrobe_items(id, title)')
        .in('post_id', Array.from(wardrobePostIds));

      if (postItems) {
        // Group items by post_id
        for (const pi of postItems as any[]) {
          const items = wardrobeItemsMap.get(pi.post_id) || [];
          if (pi.wardrobe_item) {
            items.push({
              id: pi.wardrobe_item.id,
              title: pi.wardrobe_item.title,
            });
          }
          wardrobeItemsMap.set(pi.post_id, items);
        }
      }
    }

    // Attach entities to feed items (instant lookup)
    limitedItems.forEach(item => {
      const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
      if (post) {
        if (post.entity_type === 'outfit') {
          const outfit = outfitsMap.get(post.entity_id);
          if (outfit) {
            item.entity = { outfit };
          }
        } else if (post.entity_type === 'lookbook') {
          const lookbook = lookbooksMap.get(post.entity_id);
          if (lookbook) {
            item.entity = { lookbook };
          }
        } else if (post.entity_type === 'headshot') {
          const headshot = headshotsMap.get(post.entity_id);
          if (headshot) {
            item.entity = { headshot };
          }
        } else if (post.entity_type === 'wardrobe') {
          const wardrobeItems = wardrobeItemsMap.get(post.id);
          if (wardrobeItems) {
            item.entity = { wardrobeItems };
          }
        }
      }
    });

    return { data: limitedItems, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get discover feed - public posts from all users.
 * By default excludes current user, with an option to include them.
 */
export async function getDiscoverFeed(
  userId: string,
  limit: number = 60,
  offset: number = 0,
  options?: {
    includeCurrentUser?: boolean;
  }
): Promise<{
  data: FeedItem[];
  error: any;
}> {
  try {
    const includeCurrentUser = options?.includeCurrentUser === true;

    // Query public posts from all users (optionally excluding current user).
    let postsQuery = supabase
      .from('posts')
      .select('*, owner:users(id, handle, display_name, avatar_url)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeCurrentUser) {
      postsQuery = postsQuery.neq('owner_user_id', userId);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) throw postsError;

    const feedItems: FeedItem[] = (posts || []).map((post) => ({
      id: post.id,
      type: 'post' as const,
      post: post,
      owner: post.owner as any,
    }));

    // Batch fetch entities (same optimization as getFeed)
    const outfitIds = new Set<string>();
    const lookbookIds = new Set<string>();
    const headshotIds = new Set<string>();
    const wardrobePostIds = new Set<string>();

    feedItems.forEach(item => {
      const post = item.post!;
      if (post.entity_type === 'outfit') {
        outfitIds.add(post.entity_id);
      } else if (post.entity_type === 'lookbook') {
        lookbookIds.add(post.entity_id);
      } else if (post.entity_type === 'headshot') {
        headshotIds.add(post.entity_id);
      } else if (post.entity_type === 'wardrobe') {
        wardrobePostIds.add(post.id);
      }
    });

    // Fetch all outfits in ONE query
    let outfitsMap = new Map<string, any>();
    if (outfitIds.size > 0) {
      const { data: outfits } = await supabase
        .from('outfits')
        .select('*')
        .in('id', Array.from(outfitIds));

      if (outfits) {
        outfits.forEach(outfit => outfitsMap.set(outfit.id, outfit));
      }
    }

    // Fetch all lookbooks in ONE query
    let lookbooksMap = new Map<string, any>();
    if (lookbookIds.size > 0) {
      const { data: lookbooks } = await supabase
        .from('lookbooks')
        .select('*')
        .in('id', Array.from(lookbookIds));

      if (lookbooks) {
        lookbooks.forEach(lookbook => lookbooksMap.set(lookbook.id, lookbook));
      }
    }

    // Fetch headshot images + variation prompts
    let headshotsMap = new Map<string, any>();
    if (headshotIds.size > 0) {
      const [{ data: headshotImages }, { data: headshotVariations }] = await Promise.all([
        supabase
          .from('images')
          .select('id, storage_bucket, storage_key, width, height')
          .in('id', Array.from(headshotIds)),
        supabase
          .from('headshot_generation_variations')
          .select('id, image_id, prompt_text, input_snapshot_json')
          .in('image_id', Array.from(headshotIds)),
      ]);

      headshotImages?.forEach(img => {
        headshotsMap.set(img.id, { ...img });
      });
      headshotVariations?.forEach(v => {
        const existing = headshotsMap.get(v.image_id);
        if (existing) {
          headshotsMap.set(v.image_id, {
            ...existing,
            prompt_text: v.prompt_text,
            input_snapshot_json: v.input_snapshot_json,
            variation_id: v.id,
          });
        }
      });
    }

    // Fetch wardrobe items for aggregate posts
    const wardrobeItemsMap = new Map<string, Array<{ id: string; title: string; image_url?: string | null }>>();
    if (wardrobePostIds.size > 0) {
      const { data: postItems } = await supabase
        .from('post_wardrobe_items')
        .select('post_id, wardrobe_item_id, wardrobe_item:wardrobe_items(id, title)')
        .in('post_id', Array.from(wardrobePostIds));

      if (postItems) {
        for (const pi of postItems as any[]) {
          const items = wardrobeItemsMap.get(pi.post_id) || [];
          if (pi.wardrobe_item) {
            items.push({
              id: pi.wardrobe_item.id,
              title: pi.wardrobe_item.title,
            });
          }
          wardrobeItemsMap.set(pi.post_id, items);
        }
      }
    }

    // Attach entities
    feedItems.forEach(item => {
      const post = item.post!;
      if (post.entity_type === 'outfit') {
        const outfit = outfitsMap.get(post.entity_id);
        if (outfit) {
          item.entity = { outfit };
        }
      } else if (post.entity_type === 'lookbook') {
        const lookbook = lookbooksMap.get(post.entity_id);
        if (lookbook) {
          item.entity = { lookbook };
        }
      } else if (post.entity_type === 'headshot') {
        const headshot = headshotsMap.get(post.entity_id);
        if (headshot) {
          item.entity = { headshot };
        }
      } else if (post.entity_type === 'wardrobe') {
        const wardrobeItems = wardrobeItemsMap.get(post.id);
        if (wardrobeItems) {
          item.entity = { wardrobeItems };
        }
      }
    });

    return { data: feedItems, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}
