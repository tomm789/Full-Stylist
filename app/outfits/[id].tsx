/**
 * Outfit Editor Screen (Refactored)
 * Create and edit outfits with AI generation
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useOutfitEditor, useOutfitEditorActions } from '@/hooks/outfits';
import {
  CategorySlotSelector,
  ItemPickerModal,
  GenerationProgressModal,
} from '@/components/outfits';
import {
  Header,
  Input,
  TextArea,
  PrimaryButton,
  LoadingSpinner,
} from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing } = theme;

export default function OutfitEditorScreen() {
  const { id, items: itemsParam } = useLocalSearchParams<{
    id: string;
    items?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === 'new';

  // Outfit editor hook
  const {
    loading,
    outfit,
    title,
    notes,
    categories,
    outfitItems,
    itemImageUrls,
    setTitle,
    setNotes,
    setOutfitItems,
    saveOutfit: saveOutfitAction,
    getItemImageUrl,
  } = useOutfitEditor({
    outfitId: id,
    userId: user?.id,
    itemsParam,
  });

  // Actions hook
  const actions = useOutfitEditorActions({
    outfitId: id,
    isNew,
    outfit,
    categories,
    outfitItems,
    itemImageUrls,
    notes,
    saveOutfit: saveOutfitAction,
    setOutfitItems,
    getItemImageUrl,
  });

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LoadingSpinner text="Loading..." />
      </View>
    );
  }

  const generatingItems = Array.from(outfitItems.values()).map(
    (item, index) => ({
      id: item.id,
      title: item.title || `Item ${index + 1}`,
      orderIndex: index,
    })
  );

  return (
    <View style={commonStyles.container}>
      <GenerationProgressModal
        visible={actions.rendering}
        items={generatingItems}
        revealedItemsCount={actions.revealedItemsCount}
        completedItemsCount={actions.completedItemsCount}
        phase={actions.generationPhase}
        activeMessage={actions.activeMessage}
      />

      <Header
        title={isNew ? 'New Outfit' : 'Edit Outfit'}
        leftContent={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
        rightContent={
          !isNew && (
            <TouchableOpacity
              onPress={actions.handleDelete}
              disabled={actions.saving}
            >
              <Ionicons name="trash-outline" size={24} color={colors.error} />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled Outfit"
        />

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this outfit..."
        />

        <CategorySlotSelector
          categories={categories}
          selectedItems={outfitItems}
          itemImageUrls={itemImageUrls}
          onAddItem={actions.openItemPicker}
          onRemoveItem={actions.removeItem}
        />

        <View style={styles.actions}>
          <PrimaryButton
            title="Save Outfit"
            onPress={actions.handleSave}
            loading={actions.saving}
            disabled={actions.saving}
          />

          {outfitItems.size > 0 && (
            <PrimaryButton
              title="Generate Outfit Image"
              onPress={actions.handleRender}
              loading={actions.rendering}
              disabled={actions.rendering}
              style={styles.renderButton}
            />
          )}
        </View>
      </ScrollView>

      <ItemPickerModal
        visible={actions.showItemPicker}
        items={actions.categoryItems}
        itemImageUrls={itemImageUrls}
        onSelectItem={actions.selectItem}
        onClose={() => {
          actions.setShowItemPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  renderButton: {
    marginTop: spacing.sm,
  },
});
