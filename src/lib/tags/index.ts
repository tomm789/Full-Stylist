import { supabase } from '../supabase';

export interface Tag {
  id: string;
  name: string;
}

/**
 * Get tags for multiple entities at once (batch query).
 * Returns a Map keyed by entity_id -> array of Tag.
 */
export async function getTagsForItems(
  entityType: 'wardrobe_item' | 'outfit' | 'lookbook',
  entityIds: string[]
): Promise<{
  data: Map<string, Tag[]>;
  error: any;
}> {
  if (entityIds.length === 0) {
    return { data: new Map(), error: null };
  }

  const { data, error } = await supabase
    .from('tag_links')
    .select('entity_id, tags(id, name)')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  if (error) {
    return { data: new Map(), error };
  }

  const map = new Map<string, Tag[]>();
  (data || []).forEach((link: any) => {
    if (!link.tags) return;
    const list = map.get(link.entity_id) || [];
    list.push({ id: link.tags.id, name: link.tags.name });
    map.set(link.entity_id, list);
  });

  return { data: map, error: null };
}
