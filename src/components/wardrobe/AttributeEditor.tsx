/**
 * AttributeEditor Component
 * Interface for editing item attributes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  EntityAttribute,
  AttributeDefinition,
} from '@/lib/attributes';
import { useAttributeEditor } from '@/hooks/wardrobe';
import { AddAttributeModal } from './AddAttributeModal';

type AttributeValue = any;

interface AttributeEditorProps {
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

export function AttributeEditor({
  attributes,
  attributeDefinitions,
  onUpdateAttribute,
  onDeleteAttribute,
  onCreateAttribute,
}: AttributeEditorProps) {
  const {
    editingAttributeTypeKey,
    editingAttributeValues,
    showAddAttribute,
    newAttributeKey,
    newAttributeValue,
    groupedAttributes,
    setEditingAttributeValues,
    setShowAddAttribute,
    setNewAttributeKey,
    setNewAttributeValue,
    handleStartEditAttributeType,
    handleSaveAttributeType,
    handleAddAttribute,
    handleCancelEdit,
    handleCancelAdd,
  } = useAttributeEditor({
    attributes,
    attributeDefinitions,
    onUpdateAttribute,
    onDeleteAttribute,
    onCreateAttribute,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Attributes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddAttribute(true)}
        >
          <Ionicons name="add" size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {Object.entries(groupedAttributes).map(([key, group]) => {
        const isEditing = editingAttributeTypeKey === key;

        return (
          <View key={key} style={styles.attributeGroup}>
            <View style={styles.attributeGroupHeader}>
              <Text style={styles.attributeGroupName}>{group.name}</Text>
              {!isEditing ? (
                <TouchableOpacity onPress={() => handleStartEditAttributeType(key)}>
                  <Ionicons name="pencil" size={18} color="#007AFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={handleCancelEdit}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveAttributeType}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editValues}>
                {group.attributes.map((attr) => (
                  <View key={attr.id} style={styles.editValueRow}>
                    <TextInput
                      style={styles.editValueInput}
                      value={editingAttributeValues[attr.id] || ''}
                      onChangeText={(value) =>
                        setEditingAttributeValues((prev) => ({
                          ...prev,
                          [attr.id]: value,
                        }))
                      }
                      placeholder="Enter value"
                    />
                    <TouchableOpacity onPress={() => onDeleteAttribute(attr.id)}>
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.valuesList}>
                {group.attributes.map((attr) => (
                  <Text key={attr.id} style={styles.valueText}>
                    {attr.attribute_values?.value || attr.raw_value || ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <AddAttributeModal
        visible={showAddAttribute}
        attributeDefinitions={attributeDefinitions}
        newAttributeKey={newAttributeKey}
        newAttributeValue={newAttributeValue}
        onAttributeKeyChange={setNewAttributeKey}
        onAttributeValueChange={setNewAttributeValue}
        onAdd={handleAddAttribute}
        onCancel={handleCancelAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  attributeGroup: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  attributeGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attributeGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  editValues: {
    gap: 8,
  },
  editValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  valuesList: {
    gap: 4,
  },
  valueText: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
  },
});
