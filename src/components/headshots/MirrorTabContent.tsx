/**
 * MirrorTabContent
 * Renders the full "My Mirror" tab UI when draw mode is NOT active:
 *   - Edit-tab pill row
 *   - Image slider with generation dialog / prompt settings
 *   - EditTabModal bottom sheet
 *
 * Extracted from hair-and-make-up.tsx to keep the screen file thin.
 */

import React from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PillButton, EdgePeekSlider } from '@/components/shared';
import HeadshotSlideItem from '@/components/headshots/HeadshotSlideItem';
import HeadshotPromptSettings from '@/components/headshots/HeadshotPromptSettings';
import EditTabModal from '@/components/headshots/EditTabModal';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { theme } from '@/styles';
import type { EditTab } from '@/hooks/headshot/useHairAndMakeup';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import type { PresetCategory } from '@/lib/headshot/presetTypes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { spacing } = theme;

interface MirrorTabContentProps {
  // Image slider
  headshots: { id: string; url: string | null }[];
  activeFaceIndex: number;
  onIndexChange: (nextIndex: number) => void;
  renderSliderItem: ({ item, index }: { item: { id: string; url: string | null }; index: number }) => React.ReactElement;
  keyExtractor: (item: { id: string; url: string | null }) => string;

  // Generation state
  generating: boolean;
  dialogLine1Opacity: Animated.Value;
  dialogLine2Opacity: Animated.Value;
  dialogLine3Opacity: Animated.Value;
  dialogLine4Opacity: Animated.Value;

  // Preview state
  previewHasImage: boolean;
  activeImageVariation: HeadshotGenerationVariation | null;
  isStyleDisabled: boolean;

  // Draw mode
  setIsDrawModeOpen: (open: boolean) => void;

  // Camera
  handlePickCamera: () => void;

  // Selections
  hasSelections: boolean;

  // Edit tab state (passed through to EditTabModal)
  editTab: EditTab;
  setEditTab: (tab: EditTab) => void;
  categoryPills: PresetCategory[];
  isCustomCategory: boolean;
  activeCategory: PresetCategory | null;
  quickTabHairPresets: PresetCategory | null;
  quickTabMakeupPresets: PresetCategory | null;
  quickTabPresets: PresetCategory | null;
  hairColorCategory: PresetCategory | null;
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  handleInfoPress: (option: any) => void;
  setActiveCategoryId: (id: string) => void;
  formatCategoryLabel: (title: string) => string;
  customDescriptionCopy: string;
  customDescription: string;
  setCustomDescription: (value: string) => void;
  setInfoModalVisible: (visible: boolean) => void;
  customPlaceholder: string;
  accessorySubcategory: string | null;
  setAccessorySubcategory: (id: string | null) => void;
  jewellerySubcategory: string | null;
  setJewellerySubcategory: (id: string | null) => void;
  advancedFields: Record<string, string>;
  setAdvancedField: (id: string, value: string) => void;
  hairLengthOptions: { id: string; title: string }[];
  selectedHairLengthId: string | null;

  // Bottom clearance
  floatingBarClearance: number;

}

export default function MirrorTabContent({
  headshots,
  activeFaceIndex,
  onIndexChange,
  renderSliderItem,
  keyExtractor,
  generating,
  dialogLine1Opacity,
  dialogLine2Opacity,
  dialogLine3Opacity,
  dialogLine4Opacity,
  previewHasImage,
  activeImageVariation,
  isStyleDisabled,
  setIsDrawModeOpen,
  handlePickCamera,
  hasSelections,
  editTab,
  setEditTab,
  categoryPills,
  isCustomCategory,
  activeCategory,
  quickTabHairPresets,
  quickTabMakeupPresets,
  quickTabPresets,
  hairColorCategory,
  selectedIds,
  toggleSelection,
  handleInfoPress,
  setActiveCategoryId,
  formatCategoryLabel,
  customDescriptionCopy,
  customDescription,
  setCustomDescription,
  setInfoModalVisible,
  customPlaceholder,
  accessorySubcategory,
  setAccessorySubcategory,
  jewellerySubcategory,
  setJewellerySubcategory,
  advancedFields,
  setAdvancedField,
  hairLengthOptions,
  selectedHairLengthId,
  floatingBarClearance,
}: MirrorTabContentProps) {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const commonStyles = createCommonStyles(colors);

  const [editModalVisible, setEditModalVisible] = React.useState(false);

  const presetGridGap = spacing.sm;
  const presetTileSize = (windowWidth - 2 * spacing.lg - 2 * spacing.sm - 3 * presetGridGap) / 4;

  const handleEditTabChange = React.useCallback(
    (tab: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditTab(tab as EditTab);
      setEditModalVisible(true);
    },
    [setEditTab]
  );

  return (
    <>
      {/* Tab pills row: below header, above image slider */}
      <View style={styles.pillRowStack}>
        <View style={styles.tabPills}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabPillsRow}>
              <PillButton
                label="Quick"
                icon="flash-outline"
                selected={editTab === 'quick'}
                onPress={() => handleEditTabChange('quick')}
                size="medium"
                variant="default"
                layout="vertical"
              />
              <PillButton
                label="Hair"
                icon="cut-outline"
                selected={editTab === 'hair'}
                onPress={() => handleEditTabChange('hair')}
                size="medium"
                variant="default"
                layout="vertical"
              />
              <PillButton
                label="Make-Up"
                icon="color-palette-outline"
                selected={editTab === 'makeup'}
                onPress={() => handleEditTabChange('makeup')}
                size="medium"
                variant="default"
                layout="vertical"
              />
              <PillButton
                label="Accessories"
                icon="glasses-outline"
                selected={editTab === 'accessories'}
                onPress={() => handleEditTabChange('accessories')}
                size="medium"
                variant="default"
                layout="vertical"
              />
              <PillButton
                label="Jewellery"
                icon="diamond-outline"
                selected={editTab === 'jewellery'}
                onPress={() => handleEditTabChange('jewellery')}
                size="medium"
                variant="default"
                layout="vertical"
              />
              <PillButton
                label="Advanced"
                icon="options-outline"
                selected={editTab === 'advanced'}
                onPress={() => handleEditTabChange('advanced')}
                size="medium"
                variant="default"
                layout="vertical"
              />
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView
        style={generating ? styles.generatingScrollView : undefined}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: hasSelections ? spacing.massive + 140 : floatingBarClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Image slider then prompt details */}
        <View
          style={[
            styles.facePreviewSection,
            commonStyles.sectionTopPadding,
          ]}
        >
          {headshots.length > 0 ? (
            <EdgePeekSlider
              data={headshots}
              keyExtractor={keyExtractor}
              itemWidthRatio={0.78}
              aspectRatio={3 / 4}
              gap={2}
              initialIndex={activeFaceIndex}
              activeIndex={activeFaceIndex}
              extraData={activeFaceIndex}
              enableHaptics
              edgeSwipeEnabled={false}
              onIndexChange={onIndexChange}
              renderItem={renderSliderItem}
            />
          ) : (
            <View style={styles.faceEmptyCard}>
              <TouchableOpacity
                style={styles.placeholder}
                onPress={handlePickCamera}
                disabled={isStyleDisabled}
              >
                <Ionicons name="camera-outline" size={42} color={colors.textSecondary} />
                <Text style={styles.placeholderText}>Tap to open camera</Text>
              </TouchableOpacity>
            </View>
          )}
          {generating ? (
            <View style={styles.generatingDialog}>
              <Animated.Text style={[styles.dialogLine, { opacity: dialogLine1Opacity }]}>
                Ooo...
              </Animated.Text>
              <Animated.Text style={[styles.dialogLine, { opacity: dialogLine2Opacity }]}>
                You don't need any make up at all honey...
              </Animated.Text>
              <Animated.Text style={[styles.dialogLine, { opacity: dialogLine3Opacity }]}>
                But I love this look sister!
              </Animated.Text>
              <Animated.Text style={[styles.dialogLine, { opacity: dialogLine4Opacity }]}>
                Ready?
              </Animated.Text>
            </View>
          ) : (
            <>
              {previewHasImage && Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.drawModeButton}
                  onPress={() => setIsDrawModeOpen(true)}
                  accessibilityLabel="Open draw mode"
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.drawModeButtonLabel}>Draw</Text>
                </TouchableOpacity>
              )}
              <HeadshotPromptSettings variation={activeImageVariation} />
            </>
          )}
        </View>
      </ScrollView>

      {/* Edit tab content modal */}
      <EditTabModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        editTab={editTab}
        categoryPills={categoryPills}
        isCustomCategory={isCustomCategory}
        activeCategory={activeCategory}
        quickTabHairPresets={quickTabHairPresets}
        quickTabMakeupPresets={quickTabMakeupPresets}
        quickTabPresets={quickTabPresets}
        hairColorCategory={hairColorCategory}
        selectedIds={selectedIds}
        toggleSelection={toggleSelection}
        handleInfoPress={handleInfoPress}
        setActiveCategoryId={setActiveCategoryId}
        formatCategoryLabel={formatCategoryLabel}
        customDescriptionCopy={customDescriptionCopy}
        customDescription={customDescription}
        setCustomDescription={setCustomDescription}
        setInfoModalVisible={setInfoModalVisible}
        customPlaceholder={customPlaceholder}
        accessorySubcategory={accessorySubcategory}
        setAccessorySubcategory={setAccessorySubcategory}
        jewellerySubcategory={jewellerySubcategory}
        setJewellerySubcategory={setJewellerySubcategory}
        advancedFields={advancedFields}
        setAdvancedField={setAdvancedField}
        presetGridGap={presetGridGap}
        presetTileSize={presetTileSize}
        hairLengthOptions={hairLengthOptions}
        selectedHairLengthId={selectedHairLengthId}
      />
    </>
  );
}
