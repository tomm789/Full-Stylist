import { supabase } from './supabase';

export interface AttributeDefinition {
  id: string;
  key: string;
  name?: string;
  type: 'enum' | 'multiselect' | 'text' | 'numeric';
  scope: 'wardrobe_item' | 'outfit' | 'both';
  created_at: string;
}

export interface AttributeValue {
  id: string;
  definition_id: string;
  value: string;
  normalized_value?: string;
}

export interface EntityAttribute {
  id: string;
  entity_type: 'wardrobe_item' | 'outfit';
  entity_id: string;
  definition_id: string;
  value_id?: string;
  raw_value?: string;
  confidence?: number;
  source: 'user' | 'ai' | 'derived' | 'imported';
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
 * Create entity attribute from AI result
 */
export async function createEntityAttribute(
  entityType: 'wardrobe_item' | 'outfit',
  entityId: string,
  attributeKey: string,
  value: string,
  confidence?: number,
  source: 'user' | 'ai' | 'derived' | 'imported' = 'ai'
): Promise<{
  data: EntityAttribute | null;
  error: any;
}> {
  // Get attribute definition
  const { data: definition, error: defError } = await supabase
    .from('attribute_definitions')
    .select('id')
    .eq('key', attributeKey)
    .single();

  if (defError || !definition) {
    return { data: null, error: defError || new Error('Attribute definition not found') };
  }

  // Get or create attribute value
  const { data: attrValue, error: valueError } = await getOrCreateAttributeValue(
    definition.id,
    value
  );

  if (valueError) {
    return { data: null, error: valueError };
  }

  // Create entity attribute
  const { data: entityAttr, error: createError } = await supabase
    .from('entity_attributes')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      definition_id: definition.id,
      value_id: attrValue?.id,
      raw_value: value,
      confidence,
      source,
    })
    .select()
    .single();

  return { data: entityAttr, error: createError };
}

/**
 * Get entity attributes for a wardrobe item or outfit
 */
export async function getEntityAttributes(
  entityType: 'wardrobe_item' | 'outfit',
  entityId: string
): Promise<{
  data: Array<EntityAttribute & { attribute_definitions?: AttributeDefinition; attribute_values?: AttributeValue }>;
  error: any;
}> {
  const { data, error } = await supabase
    .from('entity_attributes')
    .select('*, attribute_definitions(*), attribute_values(*)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  return { data: data || [], error };
}

/**
 * Update entity attribute value
 */
export async function updateEntityAttribute(
  attributeId: string,
  value: string
): Promise<{
  data: EntityAttribute | null;
  error: any;
}> {
  // Get the existing attribute to find its definition
  const { data: existing, error: fetchError } = await supabase
    .from('entity_attributes')
    .select('*, attribute_definitions(*)')
    .eq('id', attributeId)
    .single();

  if (fetchError || !existing) {
    return { data: null, error: fetchError || new Error('Attribute not found') };
  }

  const definitionId = existing.definition_id;

  // Get or create the new attribute value
  const { data: attrValue, error: valueError } = await getOrCreateAttributeValue(
    definitionId,
    value
  );

  if (valueError) {
    return { data: null, error: valueError };
  }

  // Update the entity attribute
  const { data: updated, error: updateError } = await supabase
    .from('entity_attributes')
    .update({
      value_id: attrValue?.id,
      raw_value: value.trim(),
      source: 'user', // Mark as user-edited
      confidence: null, // Clear AI confidence when user edits
    })
    .eq('id', attributeId)
    .select()
    .single();

  return { data: updated, error: updateError };
}

/**
 * Delete entity attribute
 */
export async function deleteEntityAttribute(
  attributeId: string
): Promise<{
  error: any;
}> {
  const { error } = await supabase
    .from('entity_attributes')
    .delete()
    .eq('id', attributeId);

  return { error };
}

/**
 * Batch create entity attributes from AI auto_tag result
 */
export async function createEntityAttributesFromAutoTag(
  entityType: 'wardrobe_item' | 'outfit',
  entityId: string,
  attributes: Array<{
    key: string;
    values: Array<{ value: string; confidence?: number }>;
  }>
): Promise<{
  created: number;
  errors: any[];
}> {
  const errors: any[] = [];
  let created = 0;

  for (const attr of attributes) {
    for (const val of attr.values) {
      const { error } = await createEntityAttribute(
        entityType,
        entityId,
        attr.key,
        val.value,
        val.confidence,
        'ai'
      );

      if (error) {
        errors.push({ key: attr.key, value: val.value, error });
      } else {
        created++;
      }
    }
  }

  return { created, errors };
}