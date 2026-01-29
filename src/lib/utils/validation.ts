import { supabase } from '../supabase';

/**
 * Verify user owns a wardrobe item
 */
export async function verifyWardrobeItemOwnership(
  itemId: string,
  userId: string
): Promise<{ isOwner: boolean; error: any }> {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id')
      .eq('id', itemId)
      .eq('owner_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { isOwner: false, error };
    }

    return { isOwner: !!data, error: null };
  } catch (error: any) {
    return { isOwner: false, error };
  }
}

/**
 * Verify user owns an outfit
 */
export async function verifyOutfitOwnership(
  outfitId: string,
  userId: string
): Promise<{ isOwner: boolean; error: any }> {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('id')
      .eq('id', outfitId)
      .eq('owner_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { isOwner: false, error };
    }

    return { isOwner: !!data, error: null };
  } catch (error: any) {
    return { isOwner: false, error };
  }
}

/**
 * Verify user owns a lookbook
 */
export async function verifyLookbookOwnership(
  lookbookId: string,
  userId: string
): Promise<{ isOwner: boolean; error: any }> {
  try {
    const { data, error } = await supabase
      .from('lookbooks')
      .select('id')
      .eq('id', lookbookId)
      .eq('owner_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { isOwner: false, error };
    }

    return { isOwner: !!data, error: null };
  } catch (error: any) {
    return { isOwner: false, error };
  }
}

/**
 * Verify images are original (not AI-generated) for listings
 */
export async function verifyOriginalImages(
  imageIds: string[],
  wardrobeItemId: string
): Promise<{ valid: boolean; error: any }> {
  try {
    const { data: itemImages, error } = await supabase
      .from('wardrobe_item_images')
      .select('image_id, type')
      .in('image_id', imageIds)
      .eq('wardrobe_item_id', wardrobeItemId);

    if (error) {
      return { valid: false, error };
    }

    const nonOriginalImages = (itemImages || []).filter(
      (img) => img.type !== 'original'
    );

    if (nonOriginalImages.length > 0) {
      return {
        valid: false,
        error: new Error(
          'Listings can only use original images. AI-generated images are not allowed.'
        ),
      };
    }

    return { valid: true, error: null };
  } catch (error: any) {
    return { valid: false, error };
  }
}

/**
 * Verify entity visibility/access permissions
 */
export async function canAccessEntity(
  entityType: 'outfit' | 'lookbook' | 'wardrobe_item',
  entityId: string,
  viewerId: string
): Promise<{ canAccess: boolean; error: any }> {
  try {
    const table =
      entityType === 'wardrobe_item'
        ? 'wardrobe_items'
        : entityType === 'outfit'
        ? 'outfits'
        : 'lookbooks';

    const { data, error } = await supabase
      .from(table)
      .select('owner_user_id, visibility, visibility_override')
      .eq('id', entityId)
      .single();

    if (error) {
      return { canAccess: false, error };
    }

    // Owner can always access
    if (data.owner_user_id === viewerId) {
      return { canAccess: true, error: null };
    }

    // Check visibility
    const visibility = data.visibility_override || data.visibility;
    
    if (visibility === 'public') {
      return { canAccess: true, error: null };
    }

    if (visibility === 'private') {
      return { canAccess: false, error: null };
    }

    if (visibility === 'followers') {
      // Check if viewer follows owner
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_user_id', viewerId)
        .eq('followed_user_id', data.owner_user_id)
        .eq('status', 'accepted')
        .single();

      return { canAccess: !!followData, error: null };
    }

    return { canAccess: false, error: null };
  } catch (error: any) {
    return { canAccess: false, error };
  }
}

/**
 * Validate post visibility
 */
export async function validatePostVisibility(
  postId: string,
  viewerId: string
): Promise<{ canView: boolean; error: any }> {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('owner_user_id, visibility, entity_type, entity_id')
      .eq('id', postId)
      .single();

    if (error) {
      return { canView: false, error };
    }

    // Owner can always view
    if (post.owner_user_id === viewerId) {
      return { canView: true, error: null };
    }

    // Check post visibility
    if (post.visibility === 'public') {
      return { canView: true, error: null };
    }

    if (post.visibility === 'private') {
      return { canView: false, error: null };
    }

    if (post.visibility === 'followers') {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_user_id', viewerId)
        .eq('followed_user_id', post.owner_user_id)
        .eq('status', 'accepted')
        .single();

      return { canView: !!followData, error: null };
    }

    // Check if visibility is 'inherit' - check entity visibility
    if (post.visibility === 'inherit') {
      const res = await canAccessEntity(post.entity_type, post.entity_id, viewerId);
      return { canView: res.canAccess, error: res.error };
    }

    return { canView: false, error: null };
  } catch (error: any) {
    return { canView: false, error };
  }
}

/**
 * Prevent self-following
 */
export function validateNotSelfAction(
  userId: string,
  targetId: string
): { valid: boolean; error: any } {
  if (userId === targetId) {
    return {
      valid: false,
      error: new Error('Cannot perform this action on yourself'),
    };
  }
  return { valid: true, error: null };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate handle format (alphanumeric, underscore, hyphen)
 */
export function isValidHandle(handle: string): boolean {
  const handleRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return handleRegex.test(handle);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '\\$&');
}
