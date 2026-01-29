/**
 * useAttributeEditor Hook
 * State and handlers for attribute editing
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  EntityAttribute,
  AttributeDefinition,
} from '@/lib/attributes';

type AttributeValue = any;

interface UseAttributeEditorProps {
  attributes: Array<
    EntityAttribute & {
      attribute_definitions?: AttributeDefinition;
      attribute_values?: AttributeValue;
    }
  >;
  attributeDefinitions: AttributeDefinition[];
  onUpdateAttribute: (attributeId: string, value: string) => Promise<void>;
  onDeleteAttribute: (attributeId: string) => Promise<void>;
  onCreateAttribute: (definitionKey: string, value: string) => Promise<void>;
}

interface AttributeGroup {
  name: string;
  definitionId: string;
  definitionKey: string;
  attributes: Array<
    EntityAttribute & {
      attribute_definitions?: AttributeDefinition;
      attribute_values?: AttributeValue;
    }
  >;
}

interface UseAttributeEditorReturn {
  editingAttributeTypeKey: string | null;
  editingAttributeValues: Record<string, string>;
  showAddAttribute: boolean;
  newAttributeKey: string;
  newAttributeValue: string;
  groupedAttributes: Record<string, AttributeGroup>;
  setEditingAttributeTypeKey: (key: string | null) => void;
  setEditingAttributeValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setShowAddAttribute: (show: boolean) => void;
  setNewAttributeKey: (key: string) => void;
  setNewAttributeValue: (value: string) => void;
  handleStartEditAttributeType: (typeKey: string) => void;
  handleSaveAttributeType: () => Promise<void>;
  handleAddAttribute: () => Promise<void>;
  handleCancelEdit: () => void;
  handleCancelAdd: () => void;
}

export function useAttributeEditor({
  attributes,
  attributeDefinitions,
  onUpdateAttribute,
  onDeleteAttribute,
  onCreateAttribute,
}: UseAttributeEditorProps): UseAttributeEditorReturn {
  const [editingAttributeTypeKey, setEditingAttributeTypeKey] = useState<string | null>(null);
  const [editingAttributeValues, setEditingAttributeValues] = useState<Record<string, string>>({});
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttributeKey, setNewAttributeKey] = useState<string>('');
  const [newAttributeValue, setNewAttributeValue] = useState<string>('');

  const groupedAttributes = useMemo(() => {
    const grouped: Record<string, AttributeGroup> = {};

    attributes.forEach((attr) => {
      const key = attr.attribute_definitions?.key || attr.definition_id;
      if (!grouped[key]) {
        grouped[key] = {
          name:
            attr.attribute_definitions?.name ||
            attr.attribute_definitions?.key ||
            key,
          definitionId: attr.definition_id,
          definitionKey: attr.attribute_definitions?.key || key,
          attributes: [],
        };
      }
      grouped[key].attributes.push(attr);
    });

    return grouped;
  }, [attributes]);

  const handleStartEditAttributeType = useCallback(
    (typeKey: string) => {
      const group = groupedAttributes[typeKey];
      if (!group) return;

      const values: Record<string, string> = {};
      group.attributes.forEach((attr) => {
        values[attr.id] = attr.attribute_values?.value || attr.raw_value || '';
      });
      setEditingAttributeValues(values);
      setEditingAttributeTypeKey(typeKey);
    },
    [groupedAttributes]
  );

  const handleSaveAttributeType = useCallback(async () => {
    if (!editingAttributeTypeKey) return;

    try {
      const updates = Object.entries(editingAttributeValues).map(async ([attrId, value]) => {
        if (!value.trim()) {
          return onDeleteAttribute(attrId);
        } else {
          return onUpdateAttribute(attrId, value.trim());
        }
      });

      await Promise.all(updates);
      setEditingAttributeTypeKey(null);
      setEditingAttributeValues({});
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update attributes');
    }
  }, [editingAttributeTypeKey, editingAttributeValues, onUpdateAttribute, onDeleteAttribute]);

  const handleAddAttribute = useCallback(async () => {
    if (!newAttributeKey.trim() || !newAttributeValue.trim()) {
      Alert.alert('Error', 'Please select an attribute type and enter a value');
      return;
    }

    try {
      await onCreateAttribute(newAttributeKey, newAttributeValue.trim());
      setShowAddAttribute(false);
      setNewAttributeKey('');
      setNewAttributeValue('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add attribute');
    }
  }, [newAttributeKey, newAttributeValue, onCreateAttribute]);

  const handleCancelEdit = useCallback(() => {
    setEditingAttributeTypeKey(null);
    setEditingAttributeValues({});
  }, []);

  const handleCancelAdd = useCallback(() => {
    setShowAddAttribute(false);
    setNewAttributeKey('');
    setNewAttributeValue('');
  }, []);

  return {
    editingAttributeTypeKey,
    editingAttributeValues,
    showAddAttribute,
    newAttributeKey,
    newAttributeValue,
    groupedAttributes,
    setEditingAttributeTypeKey,
    setEditingAttributeValues,
    setShowAddAttribute,
    setNewAttributeKey,
    setNewAttributeValue,
    handleStartEditAttributeType,
    handleSaveAttributeType,
    handleAddAttribute,
    handleCancelEdit,
    handleCancelAdd,
  };
}
