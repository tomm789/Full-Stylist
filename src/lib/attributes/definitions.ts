import { supabase } from '../supabase';

export interface AttributeDefinition {
  id: string;
  key: string;
  name?: string;
  type: 'enum' | 'multiselect' | 'text' | 'numeric';
  scope: 'wardrobe_item' | 'outfit' | 'both';
  created_at: string;
}

/**
 * Get all attribute definitions
 */
export async function getAttributeDefinitions(): Promise<{
  data: AttributeDefinition[];
  error: any;
}> {
  const { data, error } = await supabase
    .from('attribute_definitions')
    .select('*')
    .order('key', { ascending: true });

  return { data: data || [], error };
}

/**
 * Get attribute definition by key
 */
export async function getAttributeDefinitionByKey(key: string): Promise<{
  data: AttributeDefinition | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('attribute_definitions')
    .select('*')
    .eq('key', key)
    .single();

  return { data, error };
}

/**
 * Get attribute definition by ID
 */
export async function getAttributeDefinitionById(id: string): Promise<{
  data: AttributeDefinition | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('attribute_definitions')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}
