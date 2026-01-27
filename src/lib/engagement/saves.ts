import { supabase } from '../supabase';

export interface Save {
  id: string;
  user_id: string;
  entity_type: 'post' | 'outfit' | 'lookbook';
  entity_id: string;
  created_at: string;
}

/**
 * Save an entity (post, outfit, or lookbook)
 */
export async function saveEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<{
  data: Save | null;
  error: any;
}> {
  try {
    // Check if already saved
    const { data: existing } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    if (existing) {
      // Already saved, return existing
      const { data: save } = await supabase
        .from('saves')
        .select('*')
        .eq('id', existing.id)
        .single();
      return { data: save, error: null };
    }

    // Create new save
    const { data: save, error } = await supabase
      .from('saves')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: save, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unsave an entity
 */
export async function unsaveEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if user has saved an entity
 */
export async function hasSaved(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('saves')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  return !!data;
}

/**
 * Get save count for an entity
 */
export async function getSaveCount(
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<number> {
  const { count } = await supabase
    .from('saves')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  return count || 0;
}

/**
 * Get user's saved entities
 */
export async function getUserSaves(
  userId: string,
  entityType?: 'post' | 'outfit' | 'lookbook',
  limit: number = 50
): Promise<{
  data: Array<Save & { entity?: any }>;
  error: any;
}> {
  try {
    let query = supabase
      .from('saves')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}
