/**
 * AddAttributeModal Component
 * Modal for adding a new attribute to an item
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { AttributeDefinition } from '@/lib/attributes';

interface AddAttributeModalProps {
  visible: boolean;
  attributeDefinitions: AttributeDefinition[];
  newAttributeKey: string;
  newAttributeValue: string;
  onAttributeKeyChange: (key: string) => void;
  onAttributeValueChange: (value: string) => void;
  onAdd: () => Promise<void>;
  onCancel: () => void;
}

export function AddAttributeModal({
  visible,
  attributeDefinitions,
  newAttributeKey,
  newAttributeValue,
  onAttributeKeyChange,
  onAttributeValueChange,
  onAdd,
  onCancel,
}: AddAttributeModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.addAttributeModal}>
      <Text style={styles.modalTitle}>Add Attribute</Text>
      <ScrollView style={styles.definitionsList}>
        {attributeDefinitions.map((def) => (
          <TouchableOpacity
            key={def.key}
            style={[
              styles.definitionOption,
              newAttributeKey === def.key && styles.definitionOptionSelected,
            ]}
            onPress={() => onAttributeKeyChange(def.key)}
          >
            <Text
              style={[
                styles.definitionOptionText,
                newAttributeKey === def.key && styles.definitionOptionTextSelected,
              ]}
            >
              {def.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput
        style={styles.valueInput}
        value={newAttributeValue}
        onChangeText={onAttributeValueChange}
        placeholder="Enter value"
      />
      <View style={styles.modalActions}>
        <TouchableOpacity style={styles.modalButton} onPress={onCancel}>
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.modalButtonPrimary]}
          onPress={onAdd}
        >
          <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addAttributeModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  definitionsList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  definitionOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  definitionOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  definitionOptionText: {
    fontSize: 16,
    color: '#000',
  },
  definitionOptionTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  valueInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    padding: 12,
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
  },
});
