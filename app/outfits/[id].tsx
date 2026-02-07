/**
 * Outfit Editor Screen (Refactored)
 * Create and edit outfits with AI generation
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOutfitEditor, useOutfitEditorActions } from '@/hooks/outfits';
import {
  CategorySlotSelector,
  ItemPickerModal,
  GenerationProgressModal,
  OutfitScheduleSection,
} from '@/components/outfits';
import {
  Header,
  Input,
  TextArea,
  PrimaryButton,
  LoadingSpinner,
} from '@/components/shared';
import { VisibilitySelector } from '@/components/wardrobe/VisibilitySelector';
import { HeaderActionButton, HeaderIconButton } from '@/components/shared/layout';
import { theme } from '@/styles';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

export default function OutfitEditorScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const commonStyles = createCommonStyles(colors);
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
    visibility,
    categories,
    outfitItems,
    itemImageUrls,
    setTitle,
    setNotes,
    setVisibility,
    setOutfitItems,
    saveOutfit: saveOutfitAction,
    ensureItemImageUrls,
    refreshOutfit,
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
    ensureItemImageUrls,
    onDescriptionReady: refreshOutfit,
  });

  const [visibilityExpanded, setVisibilityExpanded] = React.useState(false);

  if (loading) {
    return (
      <View style={commonStyles.loadingContainer}>
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
        perfMode={PERF_MODE}
      />

      <Header
        title={isNew ? 'New Outfit' : 'Edit Outfit'}
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        rightContent={
          !isNew && (
            <HeaderIconButton
              icon="archive-outline"
              color={colors.textPrimary}
              onPress={actions.handleDelete}
              disabled={actions.saving}
              accessibilityLabel="Archive outfit"
            />
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

        <View style={styles.aiSummarySection}>
          {outfit?.description ? (
            <View style={styles.aiContent}>
              <Text style={styles.aiLabel}>Description</Text>
              <Text style={styles.aiText}>{outfit.description}</Text>
              {!!outfit?.occasions?.length && (
                <View style={styles.aiRow}>
                  <Text style={styles.aiLabel}>Occasions</Text>
                  <Text style={styles.aiText}>{outfit.occasions.join(', ')}</Text>
                </View>
              )}
              {!!outfit?.style_tags?.length && (
                <View style={styles.aiRow}>
                  <Text style={styles.aiLabel}>Style Tags</Text>
                  <Text style={styles.aiText}>{outfit.style_tags.join(', ')}</Text>
                </View>
              )}
              {!!outfit?.season && outfit.season !== 'all-season' && (
                <View style={styles.aiRow}>
                  <Text style={styles.aiLabel}>Season</Text>
                  <Text style={styles.aiText}>{outfit.season}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.aiEmptyText}>
              {actions.rendering
                ? 'Generating description...'
                : 'No AI description yet. Generate an outfit image to create one.'}
            </Text>
          )}
        </View>

        <CategorySlotSelector
          categories={categories}
          selectedItems={outfitItems}
          itemImageUrls={itemImageUrls}
          onAddItem={actions.openItemPicker}
          onRemoveItem={actions.removeItem}
        />

        <VisibilitySelector
          value={visibility}
          onChange={setVisibility}
          expanded={visibilityExpanded}
          onToggleExpanded={() => setVisibilityExpanded(!visibilityExpanded)}
          showInherit={false}
        />

        <OutfitScheduleSection
          outfitId={id}
          isNew={isNew}
          userId={user?.id}
        />

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this outfit..."
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  aiSummarySection: {
    marginTop: spacing.lg,
  },
  aiContent: {
    gap: spacing.sm,
  },
  aiLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  aiText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  aiEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aiRow: {
    marginTop: spacing.sm,
  },
});
