import { supabase } from './supabase';

export interface Post {
  id: string;
  owner_user_id: string;
  entity_type: 'outfit' | 'lookbook';
  entity_id: string;
  caption?: string;
  visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  share_slug?: string;
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
  };
  entity?: {
    outfit?: any;
    lookbook?: any;
  };
}

/**
 * Create a post for an outfit or lookbook
 */
export async function createPost(
  userId: string,
  entityType: 'outfit' | 'lookbook',
  entityId: string,
  caption?: string,
  visibility?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit'
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
      .select('*, owner:users(id, handle, display_name)');

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
        user:users!reposts_user_id_fkey(id, handle, display_name),
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

    limitedItems.forEach(item => {
      const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
      if (post) {
        if (post.entity_type === 'outfit') {
          outfitIds.add(post.entity_id);
        } else if (post.entity_type === 'lookbook') {
          lookbookIds.add(post.entity_id);
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
        }
      }
    });

    return { data: limitedItems, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get discover feed - public posts from all users (excluding current user)
 * Used for the Discover tab on the social page
 */
export async function getDiscoverFeed(
  userId: string,
  limit: number = 60,
  offset: number = 0
): Promise<{
  data: FeedItem[];
  error: any;
}> {
  try {
    // Query public posts from all users except current user
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*, owner:users(id, handle, display_name)')
      .eq('visibility', 'public')
      .neq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

    feedItems.forEach(item => {
      const post = item.post!;
      if (post.entity_type === 'outfit') {
        outfitIds.add(post.entity_id);
      } else if (post.entity_type === 'lookbook') {
        lookbookIds.add(post.entity_id);
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
      }
    });

    return { data: feedItems, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}
