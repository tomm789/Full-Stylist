/**
 * AttributeEditor Component
 * Interface for editing item attributes
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';
import {
  EntityAttribute,
  AttributeDefinition,
} from '@/lib/attributes';
import { useAttributeEditor } from '@/hooks/wardrobe';
import { AddAttributeModal } from './AddAttributeModal';

const { spacing, borderRadius, typography } = theme;

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <Ionicons name="add" size={20} color={colors.primary} />
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
                  <Ionicons name="pencil" size={18} color={colors.primary} />
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
                      placeholderTextColor={colors.textPlaceholder}
                      blurOnSubmit
                    />
                    <TouchableOpacity onPress={() => onDeleteAttribute(attr.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  attributeGroup: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  attributeGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  attributeGroupName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  saveText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  editValues: {
    gap: spacing.sm,
  },
  editValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  valuesList: {
    gap: spacing.xs,
  },
  valueText: {
    fontSize: typography.fontSize.md,
    color: colors.gray800,
    paddingVertical: spacing.xs,
  },
});
