/**
 * useItemAttributes Hook
 * Manage item attributes CRUD operations
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  getEntityAttributes,
  getAttributeDefinitions,
  updateEntityAttribute,
  deleteEntityAttribute,
  createEntityAttribute,
  EntityAttribute,
  AttributeDefinition,
} from '@/lib/attributes';

interface UseItemAttributesProps {
  itemId: string | undefined;
  entityType: 'wardrobe_item';
}

interface UseItemAttributesReturn {
  attributes: Array<
    EntityAttribute & {
      attribute_definitions?: AttributeDefinition;
      attribute_values?: any;
    }
  >;
  attributeDefinitions: AttributeDefinition[];
  loading: boolean;
  refreshAttributes: () => Promise<void>;
  updateAttribute: (
    attributeId: string,
    value: string
  ) => Promise<void>;
  deleteAttribute: (attributeId: string) => Promise<void>;
  createAttribute: (
    definitionKey: string,
    value: string
  ) => Promise<void>;
}

export function useItemAttributes({
  itemId,
  entityType,
}: UseItemAttributesProps): UseItemAttributesReturn {
  const [attributes, setAttributes] = useState<
    Array<
      EntityAttribute & {
        attribute_definitions?: AttributeDefinition;
        attribute_values?: any;
      }
    >
  >([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<
    AttributeDefinition[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refreshAttributes = async () => {
    if (!itemId) return;

    try {
      const { data: itemAttributes } = await getEntityAttributes(
        entityType,
        itemId
      );
      if (itemAttributes) {
        setAttributes(itemAttributes);
      }
    } catch (error: any) {
      console.error('Failed to refresh attributes:', error);
    }
  };

  const updateAttribute = async (attributeId: string, value: string) => {
    if (!itemId) return;

    try {
      const { error } = await updateEntityAttribute(attributeId, value);
      if (error) throw error;
      await refreshAttributes();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update attribute');
    }
  };

  const deleteAttribute = async (attributeId: string) => {
    if (!itemId) return;

    try {
      const { error } = await deleteEntityAttribute(attributeId);
      if (error) throw error;
      await refreshAttributes();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete attribute');
    }
  };

  const createAttribute = async (definitionKey: string, value: string) => {
    if (!itemId) return;

    try {
      const { error } = await createEntityAttribute(
        entityType,
        itemId,
        definitionKey,
        value
      );
      if (error) throw error;
      await refreshAttributes();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create attribute');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!itemId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: definitions } = await getAttributeDefinitions();
        if (definitions) {
          setAttributeDefinitions(definitions);
        }

        await refreshAttributes();
      } catch (error: any) {
        console.error('Failed to load attributes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [itemId]);

  return {
    attributes,
    attributeDefinitions,
    loading,
    refreshAttributes,
    updateAttribute,
    deleteAttribute,
    createAttribute,
  };
}
