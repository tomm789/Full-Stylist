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
 * Get social feed (posts + reposts)
 * Returns posts and reposts from users the current user follows (and own posts)
 * For MVP, we'll show all public posts
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
    // Get posts from followed users + own posts + public posts
    // First, get list of followed user IDs
    const { data: follows } = await supabase
      .from('follows')
      .select('followed_user_id, follower_user_id, status')
      .eq('follower_user_id', userId);
    
    const acceptedFollows = follows?.filter(f => f.status === 'accepted') || [];
    const followedUserIds = acceptedFollows.map((f) => f.followed_user_id);
    
    // Build query: own posts + posts from followed users + public posts
    let postsQuery = supabase
      .from('posts')
      .select(
        `
        *,
        owner:users(id, handle, display_name)
      `
      );

    // Filter posts: own posts + posts from followed users (public/followers) + public posts from anyone
    // Build OR filter
    let filterString = '';
    if (followedUserIds.length > 0) {
      // Include: 
      // 1. Own posts (any visibility)
      // 2. Followed users' posts with visibility public OR followers
      // 3. Public posts from anyone
      const userFilters = [userId, ...followedUserIds].map(id => `owner_user_id.eq.${id}`).join(',');
      filterString = `${userFilters},visibility.eq.public`;
      postsQuery = postsQuery.or(filterString);
    } else {
      // Just own posts and public posts
      filterString = `owner_user_id.eq.${userId},visibility.eq.public`;
      postsQuery = postsQuery.or(filterString);
    }

    const { data: posts, error: postsError } = await postsQuery
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (postsError) {
      throw postsError;
    }

    // Get all reposts (we'll filter by public posts after)
    const { data: allReposts, error: repostsError } = await supabase
      .from('reposts')
      .select(
        `
        *,
        user:users!reposts_user_id_fkey(id, handle, display_name),
        original_post:posts!reposts_original_post_id_fkey(*)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (repostsError) {
      throw repostsError;
    }

    // Filter reposts to only those with public original posts
    const reposts = (allReposts || []).filter(
      (r: any) => r.original_post && r.original_post.visibility === 'public'
    );

    // Combine and sort by created_at
    const feedItems: FeedItem[] = [];

    // Add posts
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

    // Add reposts
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

    // Sort by created_at (most recent first)
    feedItems.sort((a, b) => {
      const aDate = a.type === 'post' ? a.post!.created_at : a.repost!.created_at;
      const bDate = b.type === 'post' ? b.post!.created_at : b.repost!.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    // Slice to requested limit
    const limitedItems = feedItems.slice(offset, offset + limit);

    // Fetch entity data (outfit or lookbook) for each feed item
    for (const item of limitedItems) {
      const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
      if (post) {
        if (post.entity_type === 'outfit') {
          const { data: outfit, error: outfitError } = await supabase
            .from('outfits')
            .select('*')
            .eq('id', post.entity_id)
            .single();
          if (outfit) {
            item.entity = { outfit };
          }
        } else if (post.entity_type === 'lookbook') {
          const { data: lookbook, error: lookbookError } = await supabase
            .from('lookbooks')
            .select('*')
            .eq('id', post.entity_id)
            .single();
          if (lookbook) {
            item.entity = { lookbook };
          }
        }
      }
    }

    return { data: limitedItems, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}
