/**
 * Attributes module - exports all attribute-related functions
 */

// Re-export from definitions
export {
  type AttributeDefinition,
  getAttributeDefinitions,
  getAttributeDefinitionByKey,
  getAttributeDefinitionById,
} from './definitions';

// Re-export from values
export {
  type AttributeValue,
  getAttributeValues,
  getOrCreateAttributeValue,
  createAttributeValue,
} from './values';

// Re-export from entity-attributes
export {
  type EntityAttribute,
  createEntityAttribute,
  getEntityAttributes,  // ← This is what wardrobe-search.ts needs!
  updateEntityAttribute,
  deleteEntityAttribute,
  createEntityAttributesFromAutoTag,
} from './entity-attributes';