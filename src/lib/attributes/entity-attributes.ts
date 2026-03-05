import { supabase } from '../supabase';
import { getOrCreateAttributeValue } from './values';
import type { AttributeDefinition } from './definitions';
import type { AttributeValue } from './values';

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
 * Get entity attributes for multiple items at once (batch query).
 * Returns a Map keyed by entity_id -> array of attributes with definitions and values.
 */
export async function getEntityAttributesForItems(
  entityType: 'wardrobe_item' | 'outfit',
  entityIds: string[]
): Promise<{
  data: Map<string, Array<EntityAttribute & { attribute_definitions?: AttributeDefinition; attribute_values?: AttributeValue }>>;
  error: any;
}> {
  if (entityIds.length === 0) {
    return { data: new Map(), error: null };
  }

  const { data, error } = await supabase
    .from('entity_attributes')
    .select('*, attribute_definitions(*), attribute_values(*)')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: new Map(), error };
  }

  const map = new Map<string, Array<any>>();
  (data || []).forEach((attr) => {
    const list = map.get(attr.entity_id) || [];
    list.push(attr);
    map.set(attr.entity_id, list);
  });

  return { data: map, error: null };
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
 * Batch create entity attributes from AI auto_tag result.
 * Uses batch queries instead of per-value lookups to minimise DB round-trips.
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

  // Collect all unique attribute keys
  const allKeys = [...new Set(attributes.map((a) => a.key))];
  if (allKeys.length === 0) return { created: 0, errors };

  // Batch-fetch all definitions in one query
  const { data: definitions, error: defError } = await supabase
    .from('attribute_definitions')
    .select('id, key')
    .in('key', allKeys);

  if (defError) {
    return { created: 0, errors: [{ key: 'definitions', error: defError }] };
  }

  const defMap = new Map((definitions || []).map((d) => [d.key, d.id]));

  // Collect all (defId, value) pairs
  const valuePairs: Array<{ defId: string; key: string; value: string; confidence?: number }> = [];
  for (const attr of attributes) {
    const defId = defMap.get(attr.key);
    if (!defId) continue;
    for (const val of attr.values) {
      valuePairs.push({ defId, key: attr.key, value: val.value, confidence: val.confidence });
    }
  }

  if (valuePairs.length === 0) return { created: 0, errors };

  // Batch-fetch existing attribute values
  const defIds = [...new Set(valuePairs.map((p) => p.defId))];
  const { data: existingValues } = await supabase
    .from('attribute_values')
    .select('id, definition_id, value, normalized_value')
    .in('definition_id', defIds);

  // Build lookup: "defId|normalized" → id
  const valueMap = new Map<string, string>();
  for (const ev of existingValues || []) {
    const normalized = (ev.normalized_value || ev.value).toLowerCase().trim();
    valueMap.set(`${ev.definition_id}|${normalized}`, ev.id);
  }

  // Find and batch-insert missing values
  const seen = new Set<string>();
  const missingInserts: Array<{ definition_id: string; value: string; normalized_value: string }> = [];
  for (const pair of valuePairs) {
    const normalized = pair.value.toLowerCase().trim();
    const lookupKey = `${pair.defId}|${normalized}`;
    if (!valueMap.has(lookupKey) && !seen.has(lookupKey)) {
      seen.add(lookupKey);
      missingInserts.push({
        definition_id: pair.defId,
        value: pair.value.trim(),
        normalized_value: normalized,
      });
    }
  }

  if (missingInserts.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('attribute_values')
      .insert(missingInserts)
      .select('id, definition_id, value, normalized_value');

    if (insertError) {
      errors.push({ key: 'batch_insert_values', error: insertError });
    }
    for (const iv of inserted || []) {
      const normalized = (iv.normalized_value || iv.value).toLowerCase().trim();
      valueMap.set(`${iv.definition_id}|${normalized}`, iv.id);
    }
  }

  // Build entity_attributes rows
  const entityAttrs = [];
  for (const pair of valuePairs) {
    const normalized = pair.value.toLowerCase().trim();
    const valueId = valueMap.get(`${pair.defId}|${normalized}`);
    if (valueId) {
      entityAttrs.push({
        entity_type: entityType,
        entity_id: entityId,
        definition_id: pair.defId,
        value_id: valueId,
        raw_value: pair.value,
        confidence: pair.confidence,
        source: 'ai' as const,
      });
    }
  }

  // Batch-insert all entity attributes
  let created = 0;
  if (entityAttrs.length > 0) {
    const { data: insertedAttrs, error: attrError } = await supabase
      .from('entity_attributes')
      .insert(entityAttrs)
      .select();

    if (attrError) {
      errors.push({ key: 'batch_insert_entity_attributes', error: attrError });
    } else {
      created = (insertedAttrs || []).length;
    }
  }

  return { created, errors };
}
