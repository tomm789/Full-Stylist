/**
 * Account Deletion Service
 * Handles soft delete (deactivation, 90-day retention) and hard delete (permanent removal)
 *
 * Soft delete: Sets deactivated_at timestamp, hides profile from public view.
 *              Account can be reactivated within 90 days by signing back in.
 *              After 90 days, a scheduled job should permanently delete the account.
 *
 * Hard delete: Permanently removes all user data. Requires typing "DELETE" to confirm.
 *              Note: Auth user deletion requires a server-side Edge Function with service_role key.
 */

import { supabase } from '../supabase';

export interface DeactivationResult {
  success: boolean;
  error: string | null;
}

export interface DeletionResult {
  success: boolean;
  error: string | null;
}

/**
 * Soft delete - Deactivate account
 * Sets deactivated_at timestamp on the user profile.
 * The account will be hidden from public view but data is preserved for 90 days.
 */
export async function deactivateAccount(userId: string): Promise<DeactivationResult> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        deactivated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Deletion] Failed to deactivate account:', error);
    return { success: false, error: error.message || 'Failed to deactivate account' };
  }
}

/**
 * Reactivate a previously deactivated account
 * Clears the deactivated_at timestamp so the account is visible again.
 */
export async function reactivateAccount(userId: string): Promise<DeactivationResult> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        deactivated_at: null,
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Deletion] Failed to reactivate account:', error);
    return { success: false, error: error.message || 'Failed to reactivate account' };
  }
}

/**
 * Check if an account is deactivated and within the 90-day retention window
 */
export async function getDeactivationStatus(userId: string): Promise<{
  isDeactivated: boolean;
  deactivatedAt: string | null;
  daysRemaining: number | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('deactivated_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!data?.deactivated_at) {
      return { isDeactivated: false, deactivatedAt: null, daysRemaining: null, error: null };
    }

    const deactivatedDate = new Date(data.deactivated_at);
    const now = new Date();
    const daysSinceDeactivation = Math.floor(
      (now.getTime() - deactivatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(0, 90 - daysSinceDeactivation);

    return {
      isDeactivated: true,
      deactivatedAt: data.deactivated_at,
      daysRemaining,
      error: null,
    };
  } catch (error: any) {
    return {
      isDeactivated: false,
      deactivatedAt: null,
      daysRemaining: null,
      error: error.message || 'Failed to check deactivation status',
    };
  }
}

/**
 * Hard delete - Permanently delete account
 * Removes all user data from the database.
 *
 * Steps:
 * 1. Delete user's posts, reposts, comments, likes, saves
 * 2. Delete user's follows (both directions)
 * 3. Delete user's outfits, lookbooks, images
 * 4. Delete user profile and settings
 * 5. Sign out (auth user deletion needs server-side Edge Function)
 *
 * Note: Storage files (images) should be cleaned up by a server-side process
 * since client-side deletion of all storage objects may time out.
 */
export async function deleteAccountPermanently(userId: string): Promise<DeletionResult> {
  try {
    // 1. Delete engagement data (likes, saves, comments)
    await Promise.all([
      supabase.from('likes').delete().eq('user_id', userId),
      supabase.from('saves').delete().eq('user_id', userId),
      supabase.from('comments').delete().eq('user_id', userId),
      supabase.from('reposts').delete().eq('user_id', userId),
    ]);

    // 2. Delete posts
    await supabase.from('posts').delete().eq('owner_user_id', userId);

    // 3. Delete follows (both directions)
    await Promise.all([
      supabase.from('follows').delete().eq('follower_user_id', userId),
      supabase.from('follows').delete().eq('followed_user_id', userId),
    ]);

    // 4. Delete lookbook entries and lookbooks
    const { data: lookbooks } = await supabase
      .from('lookbooks')
      .select('id')
      .eq('owner_user_id', userId);

    if (lookbooks && lookbooks.length > 0) {
      const lookbookIds = lookbooks.map(lb => lb.id);
      await supabase
        .from('lookbook_outfits')
        .delete()
        .in('lookbook_id', lookbookIds);
      await supabase
        .from('lookbooks')
        .delete()
        .eq('owner_user_id', userId);
    }

    // 5. Delete outfits
    await supabase.from('outfits').delete().eq('owner_user_id', userId);

    // 6. Delete images
    await supabase.from('images').delete().eq('owner_user_id', userId);

    // 7. Delete user settings
    await supabase.from('user_settings').delete().eq('user_id', userId);

    // 8. Delete notifications
    await Promise.all([
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('notifications').delete().eq('actor_user_id', userId),
    ]);

    // 9. Delete user profile (last, after all related data)
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    // Note: Auth user (auth.users) deletion requires a server-side Edge Function
    // with service_role key. The client signs out after this, and the orphaned
    // auth record can be cleaned up by a scheduled server-side job.

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Deletion] Failed to permanently delete account:', error);
    return { success: false, error: error.message || 'Failed to delete account' };
  }
}
