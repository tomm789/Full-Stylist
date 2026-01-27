import { supabase } from '../supabase';

export interface AttributeValue {
  id: string;
  definition_id: string;
  value: string;
  normalized_value?: string;
}

/**
 * Get attribute values for a definition
 */
export async function getAttributeValues(definitionId: string): Promise<{
  data: AttributeValue[];
  error: any;
}> {
  const { data, error } = await supabase
    .from('attribute_values')
    .select('*')
    .eq('definition_id', definitionId)
    .order('value', { ascending: true });

  return { data: data || [], error };
}

/**
 * Get or create attribute value
 */
export async function getOrCreateAttributeValue(
  definitionId: string,
  value: string
): Promise<{
  data: AttributeValue | null;
  error: any;
}> {
  // Normalize value (lowercase, trim)
  const normalizedValue = value.toLowerCase().trim();

  // Try to find existing value
  const { data: existing, error: findError } = await supabase
    .from('attribute_values')
    .select('*')
    .eq('definition_id', definitionId)
    .or(`value.eq.${value},normalized_value.eq.${normalizedValue}`)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create new value
  const { data: newValue, error: createError } = await supabase
    .from('attribute_values')
    .insert({
      definition_id: definitionId,
      value: value.trim(),
      normalized_value: normalizedValue,
    })
    .select()
    .single();

  return { data: newValue, error: createError };
}

/**
 * Create attribute value
 */
export async function createAttributeValue(
  definitionId: string,
  value: string
): Promise<{
  data: AttributeValue | null;
  error: any;
}> {
  const normalizedValue = value.toLowerCase().trim();

  const { data, error } = await supabase
    .from('attribute_values')
    .insert({
      definition_id: definitionId,
      value: value.trim(),
      normalized_value: normalizedValue,
    })
    .select()
    .single();

  return { data, error };
}
