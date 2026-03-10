/**
 * Wardrobe Items Mutations
 * Create, update, delete, save, and unsave operations for wardrobe items
 */

import { supabase } from '../supabase';
import { QueryResult, QueryListResult } from '../utils/supabase-helpers';
import { batchUploadImages } from '../images/helpers';
import { WardrobeItem } from './items-types';
import { getDefaultWardrobeId } from './items-queries';
import { upsertDailyWardrobePost, resolveVisibility, type Visibility } from '../posts';
import { getUserSettings } from '../settings';

/**
 * Create wardrobe item with images
 */
export async function createWardrobeItem(
  userId: string,
  wardrobeId: string,
  itemData: {
    title: string;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    brand?: string;
    visibility_override?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  },
  imageFiles: Array<{ uri: string; type: string; name: string }>
): Promise<{
  data: { item: WardrobeItem; images: any[] } | null;
  error: any;
  isFirstPost?: boolean;
}> {
  try {
    // Upload images first
    const { data: imageIds, errors: uploadErrors } = await batchUploadImages(
      userId,
      imageFiles,
      'upload'
    );

    if (uploadErrors.length > 0) {
            if (__DEV__) console.warn('Some images failed to upload:', uploadErrors);
    }

    if (imageIds.length === 0) {
      return {
        data: null,
        error: new Error('Failed to upload any images'),
      };
    }

    // Create wardrobe item
    const { data: item, error: itemError } = await supabase
      .from('wardrobe_items')
      .insert({
        wardrobe_id: wardrobeId,
        owner_user_id: userId,
        ...itemData,
      })
      .select()
      .single();

    if (itemError) {
      throw itemError;
    }

    // Link images to wardrobe item
    const imageLinks = imageIds.map((imageId, index) => ({
      wardrobe_item_id: item.id,
      image_id: imageId,
      type: 'original' as const,
      sort_order: index,
    }));

    const { data: itemImages, error: linkError } = await supabase
      .from('wardrobe_item_images')
      .insert(imageLinks)
      .select();

    if (linkError) {
      console.error('Failed to create image links:', linkError);
      
      // Try to verify if links exist despite error
      const { data: existingLinks } = await supabase
        .from('wardrobe_item_images')
        .select('*, images(*)')
        .eq('wardrobe_item_id', item.id)
        .order('sort_order', { ascending: true });

      if (existingLinks && existingLinks.length > 0) {
        return { data: { item, images: existingLinks }, error: null };
      }

      return {
        data: { item, images: [] },
        error: {
          ...linkError,
          message: `Item created but image links failed: ${linkError.message}`,
          partialSuccess: true,
        } as any,
      };
    }

    // Auto-post is deferred until the user explicitly saves (draft state).
    // See publishWardrobeItem() below.
    return { data: { item, images: itemImages || [] }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Publish a wardrobe item by creating its feed post.
 * Called when the user explicitly saves from the draft state.
 */
export async function publishWardrobeItem(
  userId: string,
  itemId: string,
  visibilityOverride?: Visibility
): Promise<{ error: any; isFirstPost: boolean }> {
  try {
    const { data: settings } = await getUserSettings(userId);
    const postVisibility = resolveVisibility(
      visibilityOverride,
      settings,
      'wardrobe'
    );
    const postResult = await upsertDailyWardrobePost(userId, itemId, postVisibility);
    return { error: null, isFirstPost: postResult.isFirstPost };
  } catch (error: any) {
    return { error, isFirstPost: false };
  }
}

/**
 * Update wardrobe item
 */
export async function updateWardrobeItem(
  itemId: string,
  userId: string,
  updates: Partial<Omit<WardrobeItem, 'id' | 'owner_user_id' | 'created_at'>>
): Promise<QueryResult<WardrobeItem>> {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .update(updates)
      .eq('id', itemId)
      .eq('owner_user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete wardrobe item (soft delete)
 */
export async function deleteWardrobeItem(
  itemId: string,
  userId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('wardrobe_items')
      .update({ deleted_at: new Date().toISOString(), archived_at: null })
      .eq('id', itemId)
      .eq('owner_user_id', userId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Archive wardrobe item
 */
export async function archiveWardrobeItem(
  itemId: string,
  userId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('wardrobe_items')
      .update({ archived_at: new Date().toISOString(), deleted_at: null })
      .eq('id', itemId)
      .eq('owner_user_id', userId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Restore wardrobe item from archive
 */
export async function restoreWardrobeItem(
  itemId: string,
  userId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('wardrobe_items')
      .update({ archived_at: null })
      .eq('id', itemId)
      .eq('owner_user_id', userId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Save a wardrobe item from another user to your saved items
 */
export async function saveWardrobeItem(
  userId: string,
  wardrobeItemId: string
): Promise<QueryResult<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('saved_wardrobe_items')
      .insert({
        user_id: userId,
        wardrobe_item_id: wardrobeItemId,
      })
      .select('id')
      .single();

    // Already saved is OK
    if (error?.code === '23505') {
      return { data: null, error: null };
    }

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unsave a wardrobe item
 */
export async function unsaveWardrobeItem(
  userId: string,
  wardrobeItemId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('saved_wardrobe_items')
      .delete()
      .eq('user_id', userId)
      .eq('wardrobe_item_id', wardrobeItemId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}
