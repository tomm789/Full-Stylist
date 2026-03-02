/**
 * Edit Wardrobe Item Screen
 * Edit wardrobe item details, categories, and attributes
 */

import React, { useEffect, useMemo, useRef } from 'react';
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
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';
import {
  useWardrobeItemEdit,
  useItemAttributes,
} from '@/hooks/wardrobe';
import {
  CategorySelector,
  AttributeEditor,
  VisibilitySelector,
} from '@/components/wardrobe';
import {
  Header,
  HeaderActionButton,
  HeaderIconButton,
  Input,
  TextArea,
  LoadingSpinner,
} from '@/components/shared';

const { spacing, borderRadius, typography } = theme;

export default function EditItemScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
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
    loading: attributesLoading,
    updateAttribute,
    deleteAttribute,
    createAttribute,
  } = useItemAttributes({
    itemId: id,
    entityType: 'wardrobe_item',
  });

  const initialSnapshotRef = useRef<{
    title: string;
    description: string;
    brand: string;
    size: string;
    categoryId: string;
    subcategoryId: string;
    visibility: string;
    attributeSignature: string;
  } | null>(null);

  const getAttributeSignature = (
    attrs: Array<{ definition_id?: string; raw_value?: string }>
  ) =>
    attrs
      .map(
        (attr) =>
          `${attr.definition_id || ''}:${attr.raw_value || ''}`
      )
      .sort()
      .join('|');

  useEffect(() => {
    if (initialSnapshotRef.current || !item || attributesLoading) return;

    initialSnapshotRef.current = {
      title: item.title || '',
      description: item.description || '',
      brand: item.brand || '',
      size,
      categoryId: item.category_id || '',
      subcategoryId: item.subcategory_id || '',
      visibility: item.visibility_override || 'inherit',
      attributeSignature: getAttributeSignature(attributes),
    };
  }, [item, attributesLoading, attributes, size]);

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current || !item) return false;

    const snapshot = initialSnapshotRef.current;
    return (
      title !== snapshot.title ||
      description !== snapshot.description ||
      brand !== snapshot.brand ||
      size !== snapshot.size ||
      selectedCategoryId !== snapshot.categoryId ||
      selectedSubcategoryId !== snapshot.subcategoryId ||
      visibility !== snapshot.visibility ||
      getAttributeSignature(attributes) !== snapshot.attributeSignature
    );
  }, [
    title,
    description,
    brand,
    size,
    selectedCategoryId,
    selectedSubcategoryId,
    visibility,
    attributes,
    item,
  ]);

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
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner size="large" text="Loading item..." />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={commonStyles.container}>
        <Text style={commonStyles.emptyText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <Header
        title="Edit Item"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        rightContent={
          isDirty ? (
            <HeaderActionButton
              label="Save"
              onPress={handleSave}
            />
          ) : null
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* AI Generation Status */}
        {(!aiGenerationComplete || title === 'New Item') && (
          <View style={styles.aiLoadingSection}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginRight: spacing.sm }}
            />
            <Text style={styles.aiLoadingText}>
              AI is generating item details... Please wait.
            </Text>
          </View>
        )}

        {/* Form Fields */}
        {aiGenerationComplete && title !== 'New Item' && (
          <>
            <Input
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Item title"
              required
            />

            <TextArea
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Item description"
              rows={4}
            />

            <Input
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand name"
            />

            <Input
              label="Size"
              value={size}
              onChangeText={setSize}
              placeholder="Size"
            />

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

            <VisibilitySelector
              value={visibility}
              onChange={setVisibility}
              expanded={visibilityExpanded}
              onToggleExpanded={() =>
                setVisibilityExpanded(!visibilityExpanded)
              }
              showInherit={true}
            />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  aiLoadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  aiLoadingText: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
  },
});
