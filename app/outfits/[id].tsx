/**
 * Outfit Editor Screen
 * Create and edit outfits with AI generation, session tracking,
 * and shared components from the wardrobe creator.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOutfitEditor, useOutfitEditorActions } from '@/hooks/outfits';
import {
  GenerationProgressModal,
  OutfitScheduleSection,
} from '@/components/outfits';
import {
  Header,
  Input,
  TextArea,
  PrimaryButton,
  LoadingSpinner,
  WardrobeCategoryIcon,
} from '@/components/shared';
import GenerationThumbnailStrip from '@/components/shared/GenerationThumbnailStrip';
import type { ThumbnailItem } from '@/components/shared/GenerationThumbnailStrip';
import CreatorBar from '@/components/shared/CreatorBar';
import { WardrobeBrowserModal } from '@/components/wardrobe';
import { VisibilitySelector } from '@/components/wardrobe/VisibilitySelector';
import { HeaderIconButton, KeyboardAwareScreen } from '@/components/shared/layout';
import { theme } from '@/styles';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFirstPostIntro } from '@/hooks/social/useFirstPostIntro';
import { FirstPostVisibilityModal } from '@/components/shared/modals/FirstPostVisibilityModal';
import { getPostForEntity } from '@/lib/posts';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themeColors';
import { normalizeLabelList } from '@/lib/outfits/normalizeLabels';

const { spacing, borderRadius, typography } = theme;

// ── Inline sub-components ────────────────────────────────────────────────────

function ItemCard({
  imageUrl,
  onRemove,
  onPress,
  colors,
}: {
  imageUrl: string | undefined;
  onRemove: () => void;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity style={itemCardStyles.card} onPress={onPress} activeOpacity={0.7}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={itemCardStyles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[itemCardStyles.placeholder, { backgroundColor: colors.gray200 }]}>
          <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
        </View>
      )}
      <TouchableOpacity
        style={[itemCardStyles.removeButton, { backgroundColor: colors.error }]}
        onPress={onRemove}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function CategoryCard({
  categoryName,
  onPress,
  colors,
}: {
  categoryName: string;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity
      style={[itemCardStyles.categoryCard, { backgroundColor: colors.backgroundSecondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <WardrobeCategoryIcon categoryName={categoryName} size={22} color={colors.textSecondary} />
      <View style={[itemCardStyles.plusBadge, { backgroundColor: colors.white }]}>
        <Ionicons name="add-circle" size={14} color={colors.black} />
      </View>
    </TouchableOpacity>
  );
}

const itemCardStyles = StyleSheet.create({
  card: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'visible',
    position: 'relative',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCard: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 10,
    padding: 2,
  },
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function OutfitEditorScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const { id, items: itemsParam } = useLocalSearchParams<{
    id: string;
    items?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === 'new';

  const firstPostIntro = useFirstPostIntro();

  const handleFirstPost = useCallback(async (outfitId: string) => {
    const { data: post } = await getPostForEntity(user?.id ?? '', 'outfit', outfitId);
    if (post) {
      firstPostIntro.triggerIntroIfNeeded('outfit', post.id);
    }
  }, [user?.id, firstPostIntro]);

  const {
    loading,
    outfit,
    title,
    notes,
    visibility,
    categories,
    outfitItems,
    itemImageUrls,
    coverImage,
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
    onFirstPost: handleFirstPost,
  });

  const [visibilityExpanded, setVisibilityExpanded] = React.useState(false);

  // ── Hero image logic ───────────────────────────────────────────────────────

  // Priority: session variation preview > outfit cover image > null
  const coverImageUrl = useMemo(() => {
    if (!coverImage?.storage_key) return null;
    // Build Supabase public URL from the image record
    const bucket = coverImage.storage_bucket || 'media';
    const key = coverImage.storage_key;
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
  }, [coverImage]);

  const heroImageUrl = actions.sessionNav.preview.imageUrl ?? coverImageUrl;

  // ── Thumbnail items ────────────────────────────────────────────────────────

  const resolvedThumbnailItems: ThumbnailItem[] = useMemo(() => {
    return actions.variations.map((v) => {
      // For complete variations, try to find the image URL
      let imageUrl: string | null = null;
      if (v.status === 'complete' && v.image_id) {
        // Check if we have this in the session navigation's known URLs
        imageUrl = actions.sessionNav.preview.variationId === v.id
          ? actions.sessionNav.preview.imageUrl
          : null;
      }
      return {
        id: v.id,
        imageUrl,
        isActive: v.id === actions.sessionNav.preview.variationId,
        isSaved: v.is_saved,
        status: v.status,
      };
    });
  }, [actions.variations, actions.sessionNav.preview]);

  const handleThumbnailSelect = useCallback(
    (variationId: string) => {
      const variation = actions.variations.find((v) => v.id === variationId);
      if (variation) {
        actions.sessionNav.selectVariation(variation);
      }
    },
    [actions.variations, actions.sessionNav]
  );

  // ── Loading state ──────────────────────────────────────────────────────────

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

  const hasItems = outfitItems.size > 0;

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
              onPress={actions.handleDelete}
              disabled={actions.saving}
              accessibilityLabel="Archive outfit"
            />
          )
        }
      />

      <KeyboardAwareScreen
        contentContainerStyle={[styles.scrollContent, hasItems && styles.scrollContentWithBar]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session thumbnail strip — only show with 2+ variations or during generation */}
        {(actions.variations.length >= 2 || actions.rendering) && (
          <GenerationThumbnailStrip
            items={resolvedThumbnailItems}
            onSelect={handleThumbnailSelect}
            canNavigateBack={actions.sessionNav.canNavigateBack}
            canNavigateForward={actions.sessionNav.canNavigateForward}
            onNavigateBack={() => actions.sessionNav.handleNavigate('back')}
            onNavigateForward={() => actions.sessionNav.handleNavigate('forward')}
          />
        )}

        {/* Hero image */}
        {heroImageUrl && (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: heroImageUrl }}
              style={styles.heroImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>
        )}

        {/* Horizontal category/item row */}
        <View style={styles.itemRowSection}>
          <Text style={styles.sectionLabel}>Items</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemRowContent}
          >
            {categories.map((cat) => {
              const item = outfitItems.get(cat.id);
              if (item) {
                return (
                  <ItemCard
                    key={cat.id}
                    imageUrl={itemImageUrls.get(item.id)}
                    onRemove={() => actions.removeItem(cat.id)}
                    onPress={() => actions.openBrowser(cat.id)}
                    colors={colors}
                  />
                );
              }
              return (
                <CategoryCard
                  key={cat.id}
                  categoryName={cat.name}
                  onPress={() => actions.openBrowser(cat.id)}
                  colors={colors}
                />
              );
            })}
          </ScrollView>
        </View>

        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled Outfit"
        />

        {/* AI Summary */}
        <View style={styles.aiSummarySection}>
          {outfit?.description ? (
            <View style={styles.aiContent}>
              <Text style={styles.aiLabel}>Description</Text>
              <Text style={styles.aiText}>{outfit.description}</Text>
              {!!outfit?.occasions?.length && (
                <View style={styles.aiRow}>
                  <Text style={styles.aiLabel}>Occasions</Text>
                  <Text style={styles.aiText}>
                    {normalizeLabelList(outfit.occasions).join(', ')}
                  </Text>
                </View>
              )}
              {!!outfit?.style_tags?.length && (
                <View style={styles.aiRow}>
                  <Text style={styles.aiLabel}>Style Tags</Text>
                  <Text style={styles.aiText}>
                    {normalizeLabelList(outfit.style_tags).join(', ')}
                  </Text>
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

        <View style={styles.saveSection}>
          <PrimaryButton
            title="Save Outfit"
            onPress={actions.handleSave}
            loading={actions.saving}
            disabled={actions.saving}
          />
        </View>
      </KeyboardAwareScreen>

      {/* Sticky bottom generate bar */}
      {hasItems && (
        <CreatorBar
          label={`Generate (${outfitItems.size})`}
          onGenerate={actions.handleRender}
          isGenerating={actions.rendering}
          showOptionsButton={false}
        />
      )}

      {/* Browser modal */}
      <WardrobeBrowserModal
        visible={actions.showBrowser}
        onClose={() => actions.setShowBrowser(false)}
        onSelectItem={actions.selectItem}
        wardrobeId={actions.wardrobeId}
        userId={user?.id ?? null}
        initialCategoryId={actions.selectedCategory}
        selectedItemIds={actions.selectedItemIds}
        title="Add Item"
      />

      {/* First-post visibility intro */}
      {firstPostIntro.introEntityType && (
        <FirstPostVisibilityModal
          visible={firstPostIntro.showIntro}
          entityType={firstPostIntro.introEntityType}
          currentVisibility={firstPostIntro.currentVisibility}
          defaultVisibility={firstPostIntro.defaultVisibility}
          onDone={firstPostIntro.handleIntroDone}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scrollContent: {
      padding: spacing.lg,
    },
    scrollContentWithBar: {
      paddingBottom: spacing.lg + 80, // Extra space for sticky CreatorBar
    },
    heroContainer: {
      marginHorizontal: -spacing.lg,
      marginBottom: spacing.lg,
    },
    heroImage: {
      width: '100%',
      aspectRatio: 3 / 4,
    },
    aiSummarySection: {
      marginTop: spacing.lg,
    },
    aiContent: {
      gap: spacing.sm,
    },
    aiLabel: {
      fontSize: typography.fontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    aiText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    aiEmptyText: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    aiRow: {
      marginTop: spacing.sm,
    },
    itemRowSection: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    itemRowContent: {
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
    },
    saveSection: {
      marginTop: spacing.xl,
    },
  });
