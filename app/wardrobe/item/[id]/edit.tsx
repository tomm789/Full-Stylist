/**
 * Edit Wardrobe Item Screen (Refactored)
 * Edit wardrobe item details, categories, and attributes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWardrobeItemEdit,
  useItemAttributes,
} from '@/hooks/wardrobe';
import {
  EditItemForm,
  CategorySelector,
  AttributeEditor,
  VisibilitySelector,
} from '@/components/wardrobe';
import { Header, HeaderActionButton } from '@/components/shared/layout';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  // Form state and item data
  const {
    item,
    title,
    description,
    brand,
    size,
    categories,
    selectedCategoryId,
    subcategories,
    selectedSubcategoryId,
    visibility,
    loading,
    aiGenerationComplete,
    categoriesExpanded,
    subcategoriesExpanded,
    visibilityExpanded,
    setTitle,
    setDescription,
    setBrand,
    setSize,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    setVisibility,
    setCategoriesExpanded,
    setSubcategoriesExpanded,
    setVisibilityExpanded,
    saveItem,
  } = useWardrobeItemEdit({
    itemId: id,
    userId: user?.id,
  });

  // Attributes management
  const {
    attributes,
    attributeDefinitions,
    updateAttribute,
    deleteAttribute,
    createAttribute,
  } = useItemAttributes({
    itemId: id,
    entityType: 'wardrobe_item',
  });

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    await saveItem();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="Edit Item"
        leftContent={
          <HeaderActionButton
            label="Cancel"
            onPress={() => router.back()}
            variant="secondary"
          />
        }
        rightContent={
          <HeaderActionButton
            label="Save"
            onPress={handleSave}
          />
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* AI Generation Status */}
        {(!aiGenerationComplete || title === 'New Item') && (
          <View style={styles.section}>
            <View style={styles.loadingMessage}>
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.loadingText}>
                AI is generating item details... Please wait.
              </Text>
            </View>
          </View>
        )}

        {/* Form Fields */}
        {aiGenerationComplete && title !== 'New Item' && (
          <>
            <EditItemForm
              title={title}
              description={description}
              brand={brand}
              size={size}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onBrandChange={setBrand}
              onSizeChange={setSize}
            />

            {/* Category Selector */}
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              subcategories={subcategories}
              selectedSubcategoryId={selectedSubcategoryId}
              expanded={categoriesExpanded}
              subcategoriesExpanded={subcategoriesExpanded}
              aiGenerationComplete={aiGenerationComplete}
              onCategorySelect={setSelectedCategoryId}
              onSubcategorySelect={setSelectedSubcategoryId}
              onToggleExpanded={() => setCategoriesExpanded(!categoriesExpanded)}
              onToggleSubcategoriesExpanded={() =>
                setSubcategoriesExpanded(!subcategoriesExpanded)
              }
            />

            {/* Visibility Selector */}
            <View style={styles.section}>
              <VisibilitySelector
                value={visibility}
                onChange={setVisibility}
                expanded={visibilityExpanded}
                onToggleExpanded={() =>
                  setVisibilityExpanded(!visibilityExpanded)
                }
                showInherit={true}
              />
            </View>
          </>
        )}

        {/* Attributes Editor */}
        {aiGenerationComplete && (
          <AttributeEditor
            attributes={attributes}
            attributeDefinitions={attributeDefinitions}
            onUpdateAttribute={updateAttribute}
            onDeleteAttribute={deleteAttribute}
            onCreateAttribute={createAttribute}
          />
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    padding: 16,
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#007AFF',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});
