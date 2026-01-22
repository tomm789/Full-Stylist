import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getWardrobeCategories,
  getSubcategories,
  getWardrobeItem,
  WardrobeCategory,
  WardrobeSubcategory,
  WardrobeItem,
} from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import {
  getEntityAttributes,
  getAttributeDefinitions,
  updateEntityAttribute,
  deleteEntityAttribute,
  createEntityAttribute,
  EntityAttribute,
  AttributeDefinition,
} from '@/lib/attributes';
import { Ionicons } from '@expo/vector-icons';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState<string>('');
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [subcategories, setSubcategories] = useState<WardrobeSubcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private_link' | 'private' | 'inherit'>('inherit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState<Array<EntityAttribute & { attribute_definitions?: AttributeDefinition; attribute_values?: AttributeValue }>>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([]);
  const [editingAttributeTypeKey, setEditingAttributeTypeKey] = useState<string | null>(null);
  const [editingAttributeValues, setEditingAttributeValues] = useState<Record<string, string>>({});
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttributeKey, setNewAttributeKey] = useState<string>('');
  const [newAttributeValue, setNewAttributeValue] = useState<string>('');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [subcategoriesExpanded, setSubcategoriesExpanded] = useState(false);
  const [visibilityExpanded, setVisibilityExpanded] = useState(false);
  const [aiGenerationComplete, setAiGenerationComplete] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id && user) {
      initialize();
    }
    
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [id, user]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories();
      setCategoriesExpanded(false);
    } else {
      setSubcategories([]);
      setSelectedSubcategoryId('');
      setSubcategoriesExpanded(false);
    }
  }, [selectedCategoryId]);

  const initialize = async () => {
    if (!user || !id) return;

    setLoading(true);

    try {
      // Load categories first
      const { data: categoriesData } = await getWardrobeCategories();
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Load attribute definitions
      const { data: definitions } = await getAttributeDefinitions();
      if (definitions) {
        setAttributeDefinitions(definitions);
      }

      // Load the item directly by ID (OPTIMIZED - no longer fetches all items)
      const { data: foundItem, error: itemError } = await getWardrobeItem(id);
      if (itemError) throw itemError;
      
      if (foundItem) {
        setItem(foundItem);
        setTitle(foundItem.title || '');
        setDescription(foundItem.description || '');
        setBrand(foundItem.brand || '');
        // Don't set category/subcategory in state yet - wait for AI completion check
        // They will be set after we determine if AI has completed
        setVisibility(foundItem.visibility_override || 'inherit');
        // Handle size - can be string or JSONB object
        if (foundItem.size) {
          if (typeof foundItem.size === 'string') {
            setSize(foundItem.size);
          } else if (typeof foundItem.size === 'object' && foundItem.size !== null) {
            // If it's an object, try to extract a meaningful string representation
            // For arrays, join them; for objects, use the first value or stringify
            if (Array.isArray(foundItem.size)) {
              setSize(foundItem.size.join(', '));
            } else {
              // For objects, try to get a simple value or stringify
              const values = Object.values(foundItem.size);
              setSize(values.length > 0 ? String(values[0]) : '');
            }
          } else {
            setSize(String(foundItem.size));
          }
        } else {
          setSize('');
        }
        // Start collapsed if there's a selection or if AI has completed (will auto-select)
        // If AI completed, we'll collapse after auto-selecting
        setCategoriesExpanded(!foundItem.category_id);
        setSubcategoriesExpanded(!foundItem.subcategory_id);
        setVisibilityExpanded(false); // Always start collapsed for visibility
      } else {
        Alert.alert('Error', 'Item not found');
        router.back();
      }

      // Load attributes
      const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id);
      if (itemAttributes) {
        setAttributes(itemAttributes);
      }
      
      // Check if AI generation has completed - primary check: title is not placeholder
      // Secondary check: has AI-sourced attributes
      const titleIsGenerated = foundItem.title && foundItem.title !== 'New Item';
      const hasAiAttributes = itemAttributes?.some((attr: any) => attr.source === 'ai') || false;
      const isComplete = titleIsGenerated || hasAiAttributes;
      
      setAiGenerationComplete(isComplete);
      
      // Only set category/subcategory in state if AI has completed
      // This ensures fields are hidden until AI completes
      if (isComplete) {
        setSelectedCategoryId(foundItem.category_id || '');
        setSelectedSubcategoryId(foundItem.subcategory_id || '');
        
        // Load subcategories if category is set
        if (foundItem.category_id) {
          const { data: subcats } = await getSubcategories(foundItem.category_id);
          if (subcats) {
            setSubcategories(subcats);
          }
          setCategoriesExpanded(false);
          if (foundItem.subcategory_id) {
            setSubcategoriesExpanded(false);
          }
        }
      } else {
        // AI not complete - don't set category/subcategory, start polling
        setSelectedCategoryId('');
        setSelectedSubcategoryId('');
        startPollingForAICompletion();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load item');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async () => {
    if (!selectedCategoryId) return;

    const { data } = await getSubcategories(selectedCategoryId);
    if (data) {
      setSubcategories(data);
    }
  };

  const startPollingForAICompletion = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds for AI completion
    pollingIntervalRef.current = setInterval(async () => {
      if (!id || !user) return;

      try {
        // Refresh item and attributes to check if AI completed
        const { data: refreshedItem } = await getWardrobeItem(id);
        const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id);
        
        if (refreshedItem && itemAttributes) {
          const hasAiAttributes = itemAttributes.some((attr: any) => attr.source === 'ai');
          const titleIsGenerated = refreshedItem.title && refreshedItem.title !== 'New Item';
          const isComplete = hasAiAttributes || titleIsGenerated;
          
          if (isComplete) {
            // AI completed - update state and refresh UI
            setAiGenerationComplete(true);
            setItem(refreshedItem);
            setTitle(refreshedItem.title || '');
            setDescription(refreshedItem.description || '');
            setSelectedCategoryId(refreshedItem.category_id || '');
            setSelectedSubcategoryId(refreshedItem.subcategory_id || '');
            setAttributes(itemAttributes);
            
            // Collapse category/subcategory fields and load subcategories
            if (refreshedItem.category_id) {
              setSelectedCategoryId(refreshedItem.category_id);
              setCategoriesExpanded(false);
              // Load subcategories for the selected category
              const { data: subcats } = await getSubcategories(refreshedItem.category_id);
              if (subcats) {
                setSubcategories(subcats);
              }
              if (refreshedItem.subcategory_id) {
                setSelectedSubcategoryId(refreshedItem.subcategory_id);
                setSubcategoriesExpanded(false);
              }
            }
            
            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Error polling for AI completion:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds (30 attempts)
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }, 60000);
  };

  const handleSave = async () => {
    if (!user || !item) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setSaving(true);

    try {
      // Save basic item fields
      const { error } = await supabase
        .from('wardrobe_items')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          brand: brand.trim() || null,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubcategoryId || null,
          visibility_override: visibility,
          size: size.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('owner_user_id', user.id);

      if (error) {
        throw error;
      }

      // Attribute changes are saved immediately when edited, so no need to save them here
      // (they're saved via handleUpdateAttribute and handleDeleteAttribute)

      Alert.alert('Success', 'Item updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  // Group attributes by definition key
  const getGroupedAttributes = () => {
    const grouped: Record<string, {
      name: string;
      definitionId: string;
      definitionKey: string;
      attributes: Array<EntityAttribute & { attribute_definitions?: AttributeDefinition; attribute_values?: AttributeValue }>;
    }> = {};

    attributes.forEach((attr) => {
      const key = attr.attribute_definitions?.key || attr.definition_id;
      if (!grouped[key]) {
        grouped[key] = {
          name: attr.attribute_definitions?.name || attr.attribute_definitions?.key || key,
          definitionId: attr.definition_id,
          definitionKey: attr.attribute_definitions?.key || key,
          attributes: [],
        };
      }
      grouped[key].attributes.push(attr);
    });

    return grouped;
  };

  const handleStartEditAttributeType = (typeKey: string) => {
    const grouped = getGroupedAttributes();
    const group = grouped[typeKey];
    if (!group) return;

    // Initialize editing values with current values
    const values: Record<string, string> = {};
    group.attributes.forEach((attr) => {
      values[attr.id] = attr.attribute_values?.value || attr.raw_value || '';
    });
    setEditingAttributeValues(values);
    setEditingAttributeTypeKey(typeKey);
  };

  const handleCancelEditAttributeType = () => {
    setEditingAttributeTypeKey(null);
    setEditingAttributeValues({});
  };

  const handleUpdateAttributeValue = (attributeId: string, value: string) => {
    setEditingAttributeValues((prev) => ({
      ...prev,
      [attributeId]: value,
    }));
  };

  const handleSaveAttributeType = async () => {
    if (!editingAttributeTypeKey) return;

    try {
      // Update all changed values
      const updates = Object.entries(editingAttributeValues).map(async ([attrId, value]) => {
        if (!value.trim()) {
          // Delete if empty
          return deleteEntityAttribute(attrId);
        } else {
          // Update value
          return updateEntityAttribute(attrId, value.trim());
        }
      });

      await Promise.all(updates);

      // Refresh attributes
      const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id!);
      if (itemAttributes) {
        setAttributes(itemAttributes);
      }

      setEditingAttributeTypeKey(null);
      setEditingAttributeValues({});
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update attributes');
    }
  };

  const handleDeleteAttributeValue = async (attributeId: string) => {
    Alert.alert(
      'Delete Value',
      'Are you sure you want to delete this value?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteEntityAttribute(attributeId);
              if (error) {
                throw error;
              }

              // Refresh attributes
              const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id!);
              if (itemAttributes) {
                setAttributes(itemAttributes);
              }

              // If we're in edit mode, update the editing values
              if (editingAttributeTypeKey) {
                const newValues = { ...editingAttributeValues };
                delete newValues[attributeId];
                setEditingAttributeValues(newValues);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete attribute');
            }
          },
        },
      ]
    );
  };

  const handleAddAttribute = async () => {
    if (!newAttributeKey.trim() || !newAttributeValue.trim()) {
      Alert.alert('Error', 'Please select an attribute type and enter a value');
      return;
    }

    try {
      const { error } = await createEntityAttribute(
        'wardrobe_item',
        id!,
        newAttributeKey,
        newAttributeValue.trim(),
        undefined,
        'user'
      );

      if (error) {
        throw error;
      }

      // Refresh attributes
      const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id!);
      if (itemAttributes) {
        setAttributes(itemAttributes);
      }

      setShowAddAttribute(false);
      setNewAttributeKey('');
      setNewAttributeValue('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add attribute');
    }
  };

  const handleAddValueToAttributeType = async (typeKey: string) => {
    const grouped = getGroupedAttributes();
    const group = grouped[typeKey];
    if (!group || !newAttributeValue.trim()) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    try {
      const { error } = await createEntityAttribute(
        'wardrobe_item',
        id!,
        group.definitionKey,
        newAttributeValue.trim(),
        undefined,
        'user'
      );

      if (error) {
        throw error;
      }

      // Refresh attributes
      const { data: itemAttributes } = await getEntityAttributes('wardrobe_item', id!);
      if (itemAttributes) {
        setAttributes(itemAttributes);
        // Re-enter edit mode with updated values
        handleStartEditAttributeType(typeKey);
      }

      setNewAttributeValue('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add value');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Item</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={saving}>
          <Text style={[styles.headerButtonText, styles.saveText, saving && styles.saveTextDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Show loading message while AI generation is in progress */}
        {(!aiGenerationComplete || title === 'New Item') && (
          <View style={styles.section}>
            <View style={styles.loadingMessage}>
              <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 8 }} />
              <Text style={styles.loadingText}>AI is generating item details... Please wait.</Text>
            </View>
          </View>
        )}

        {/* Only show title field after AI generation completes */}
        {aiGenerationComplete && title !== 'New Item' && (
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter item title"
              value={title}
              onChangeText={setTitle}
              editable={!saving}
            />
          </View>
        )}

        {/* Only show description field after AI generation completes */}
        {aiGenerationComplete && title !== 'New Item' && (
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              editable={!saving}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Brand</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter brand (optional)"
            value={brand}
            onChangeText={setBrand}
            editable={!saving}
          />
        </View>

        {/* Only show category field after AI generation completes */}
        {aiGenerationComplete && title !== 'New Item' && (
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            {selectedCategoryId && !categoriesExpanded ? (
            <TouchableOpacity
              style={[styles.option, styles.optionSelected]}
              onPress={() => setCategoriesExpanded(true)}
              disabled={saving}
            >
              <View style={styles.selectedOptionContent}>
                <Text style={styles.optionTextSelected}>
                  {categories.find((c) => c.id === selectedCategoryId)?.name || 'Selected Category'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#007AFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.optionsList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.option,
                    selectedCategoryId === category.id && styles.optionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(category.id);
                    setCategoriesExpanded(false);
                  }}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategoryId === category.id && styles.optionTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          </View>
        )}

        {/* Only show subcategory field after AI generation completes */}
        {aiGenerationComplete && title !== 'New Item' && selectedCategoryId && subcategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Subcategory</Text>
            {selectedSubcategoryId && !subcategoriesExpanded ? (
              <TouchableOpacity
                style={[styles.option, styles.optionSelected]}
                onPress={() => setSubcategoriesExpanded(true)}
                disabled={saving}
              >
                <View style={styles.selectedOptionContent}>
                  <Text style={styles.optionTextSelected}>
                    {subcategories.find((s) => s.id === selectedSubcategoryId)?.name || 'Selected Subcategory'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#007AFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    !selectedSubcategoryId && styles.optionSelected,
                  ]}
                  onPress={() => {
                    setSelectedSubcategoryId('');
                    setSubcategoriesExpanded(false);
                  }}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.optionText,
                      !selectedSubcategoryId && styles.optionTextSelected,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {subcategories.map((subcategory) => (
                  <TouchableOpacity
                    key={subcategory.id}
                    style={[
                      styles.option,
                      selectedSubcategoryId === subcategory.id && styles.optionSelected,
                    ]}
                    onPress={() => {
                      setSelectedSubcategoryId(subcategory.id);
                      setSubcategoriesExpanded(false);
                    }}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedSubcategoryId === subcategory.id && styles.optionTextSelected,
                      ]}
                    >
                      {subcategory.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}


        {/* Attributes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Attributes</Text>
            <TouchableOpacity
              onPress={() => setShowAddAttribute(!showAddAttribute)}
              disabled={saving}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {showAddAttribute && (
            <View style={styles.addAttributeForm}>
              <Text style={styles.subLabel}>Attribute Type</Text>
              <View style={styles.optionsList}>
                {attributeDefinitions
                  .filter((def) => def.scope === 'wardrobe_item' || def.scope === 'both')
                  .map((def) => (
                    <TouchableOpacity
                      key={def.id}
                      style={[
                        styles.option,
                        newAttributeKey === def.key && styles.optionSelected,
                      ]}
                      onPress={() => setNewAttributeKey(def.key)}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          newAttributeKey === def.key && styles.optionTextSelected,
                        ]}
                      >
                        {def.name || def.key}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
              <Text style={styles.subLabel}>Value</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter attribute value"
                value={newAttributeValue}
                onChangeText={setNewAttributeValue}
                editable={!saving}
              />
              <View style={styles.addAttributeActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddAttribute(false);
                    setNewAttributeKey('');
                    setNewAttributeValue('');
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddAttribute}
                  style={styles.saveAttributeButton}
                  disabled={saving}
                >
                  <Text style={styles.saveAttributeButtonText}>Add Attribute</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.attributesList}>
            {attributes.length > 0 && (() => {
              const grouped = getGroupedAttributes();
              return (
                <>
                  {Object.entries(grouped).map(([typeKey, group]) => (
                    <View key={typeKey} style={styles.attributeItem}>
                      {editingAttributeTypeKey === typeKey ? (
                        <View style={styles.attributeEditForm}>
                          <Text style={styles.attributeTypeName}>{group.name}</Text>
                          <View style={styles.attributeValuesList}>
                            {group.attributes.map((attr) => (
                              <View key={attr.id} style={styles.attributeValueRow}>
                                <TextInput
                                  style={styles.attributeInput}
                                  value={editingAttributeValues[attr.id] || ''}
                                  onChangeText={(value) => handleUpdateAttributeValue(attr.id, value)}
                                  editable={!saving}
                                  placeholder="Enter value"
                                />
                                <TouchableOpacity
                                  onPress={() => handleDeleteAttributeValue(attr.id)}
                                  style={styles.attributeDeleteButton}
                                  disabled={saving}
                                >
                                  <Ionicons name="trash" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                              </View>
                            ))}
                            {/* Add new value input */}
                            <View style={styles.attributeValueRow}>
                              <TextInput
                                style={styles.attributeInput}
                                value={newAttributeValue}
                                onChangeText={setNewAttributeValue}
                                editable={!saving}
                                placeholder="Add new value"
                              />
                              <TouchableOpacity
                                onPress={() => handleAddValueToAttributeType(typeKey)}
                                style={styles.attributeAddButton}
                                disabled={saving || !newAttributeValue.trim()}
                              >
                                <Ionicons name="add" size={18} color="#007AFF" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={styles.attributeEditActions}>
                            <TouchableOpacity
                              onPress={handleCancelEditAttributeType}
                              style={styles.attributeCancelButton}
                            >
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleSaveAttributeType}
                              style={styles.attributeSaveButton}
                              disabled={saving}
                            >
                              <Text style={styles.saveAttributeButtonText}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.attributeDisplay}>
                          <View style={styles.attributeContent}>
                            <Text style={styles.attributeKey}>{group.name}:</Text>
                            <Text style={styles.attributeValue}>
                              {group.attributes
                                .map((attr) => attr.attribute_values?.value || attr.raw_value || '')
                                .filter((v) => v)
                                .join(', ')}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleStartEditAttributeType(typeKey)}
                            style={styles.attributeActionButton}
                            disabled={saving}
                          >
                            <Ionicons name="pencil" size={18} color="#007AFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              );
            })()}

            {attributes.length === 0 && !showAddAttribute && (
              <Text style={styles.emptyText}>No attributes yet. Click "Add" to add one.</Text>
            )}

            {/* Size Field - at the bottom of attributes list */}
            <View style={[styles.attributeItem, styles.sizeFieldContainer]}>
              <View style={styles.attributeDisplay}>
                <View style={styles.attributeContent}>
                  <Text style={[styles.attributeKey, styles.sizeFieldLabel]}>Size:</Text>
                  <TextInput
                    style={[styles.attributeInput, styles.sizeInput]}
                    placeholder="Enter size (e.g., S, M, L, XL, 10, 32)"
                    value={size}
                    onChangeText={setSize}
                    editable={!saving}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Visibility Section - at the bottom */}
        <View style={styles.section}>
          <Text style={styles.label}>Visibility</Text>
          {!visibilityExpanded ? (
            <TouchableOpacity
              style={[styles.option, styles.optionSelected]}
              onPress={() => setVisibilityExpanded(true)}
              disabled={saving}
            >
              <View style={styles.selectedOptionContent}>
                <Text style={styles.optionTextSelected}>
                  {[
                    { value: 'inherit', label: 'Inherit from settings' },
                    { value: 'public', label: 'Public' },
                    { value: 'followers', label: 'Followers' },
                    { value: 'private_link', label: 'Private Link' },
                    { value: 'private', label: 'Private' },
                  ].find((opt) => opt.value === visibility)?.label || 'Inherit from settings'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#007AFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.optionsList}>
              {[
                { value: 'inherit', label: 'Inherit from settings' },
                { value: 'public', label: 'Public' },
                { value: 'followers', label: 'Followers' },
                { value: 'private_link', label: 'Private Link' },
                { value: 'private', label: 'Private' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    visibility === option.value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    setVisibility(option.value as any);
                    setVisibilityExpanded(false);
                  }}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.optionText,
                      visibility === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveText: {
    color: '#007AFF',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionsList: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addAttributeForm: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  addAttributeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  saveAttributeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  saveAttributeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  attributesList: {
    gap: 8,
    marginTop: 8,
  },
  attributeItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  attributeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attributeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  attributeKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  attributeValue: {
    fontSize: 14,
    color: '#666',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  attributeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attributeActionButton: {
    padding: 4,
  },
  attributeEditForm: {
    gap: 8,
  },
  attributeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  attributeEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  attributeCancelButton: {
    padding: 4,
  },
  attributeSaveButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  attributeTypeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  attributeValuesList: {
    gap: 8,
    marginBottom: 12,
  },
  attributeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attributeAddButton: {
    padding: 8,
    opacity: 0.7,
  },
  sizeFieldContainer: {
    opacity: 0.7,
  },
  sizeFieldLabel: {
    opacity: 0.8,
  },
  sizeInput: {
    opacity: 0.9,
    flex: 1,
    marginLeft: 8,
    borderColor: '#ccc',
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  loadingText: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
  },
});
