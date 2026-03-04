/**
 * MirrorTabContent
 * Renders the full "My Mirror" tab UI when draw mode is NOT active:
 *   - Image slider
 *   - Controls row: [Quick/Advanced toggle] [New]  [spacer]  [Draw]
 *   - Inline Quick fields (custom description) OR inline Advanced fields
 *   - EditTabModal bottom sheet (opened via header category pills)
 *
 * Extracted from hair-and-make-up.tsx to keep the screen file thin.
 */

import React from 'react';
import {
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { PillButton, GenerationThumbnailStrip } from '@/components/shared';
import type { ThumbnailItem } from '@/components/shared';
import IconSegmentedToggle from '@/components/shared/buttons/IconSegmentedToggle';
import HeadshotPromptSettings from '@/components/headshots/HeadshotPromptSettings';
import AdvancedFieldsPanel from '@/components/headshots/AdvancedFieldsPanel';
import EditTabModal from '@/components/headshots/EditTabModal';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { theme } from '@/styles';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { EditTab } from '@/hooks/headshot/useHairAndMakeup';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import type { PresetCategory } from '@/lib/headshot/presetTypes';
const { spacing } = theme;

const QUICK_ADVANCED_OPTIONS = [
  { value: 'quick', label: 'Quick', icon: 'flash-outline' as const },
  { value: 'advanced', label: 'Advanced', icon: 'options-outline' as const },
];

interface MirrorTabContentProps {
  // Preview image (single base headshot — no longer a slider)
  previewImageUrl: string | null;
  onPreviewPress: () => void;
  onMenuPress?: () => void;
  generateOverlayStyle: AnimatedStyle;
  previewIsGenerated: boolean;
  onRestoreSelfie: () => void;

  // Generation state
  generating: boolean;
  dialogLine1Style: AnimatedStyle;
  dialogLine2Style: AnimatedStyle;
  dialogLine3Style: AnimatedStyle;
  dialogLine4Style: AnimatedStyle;

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

  // Scroll / header coordination
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;

  // Edit tab request from header pill row
  editTabRequest?: EditTab | null;
  onEditTabRequestHandled?: () => void;

  // Generation thumbnail strip (optional — shown when variations exist)
  thumbnailItems?: ThumbnailItem[];
  onThumbnailSelect?: (id: string) => void;
  thumbnailCanNavigateBack?: boolean;
  thumbnailCanNavigateForward?: boolean;
  onThumbnailNavigateBack?: () => void;
  onThumbnailNavigateForward?: () => void;

  // Session save/done
  onThumbnailSave?: (id: string) => void;
  showThumbnailSaveIndicator?: boolean;
  onSessionDone?: () => void;
  sessionActive?: boolean;
}

export default function MirrorTabContent({
  previewImageUrl,
  onPreviewPress,
  onMenuPress,
  generateOverlayStyle,
  previewIsGenerated,
  onRestoreSelfie,
  generating,
  dialogLine1Style,
  dialogLine2Style,
  dialogLine3Style,
  dialogLine4Style,
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
  onScroll,
  scrollEventThrottle = 16,
  editTabRequest = null,
  onEditTabRequestHandled,
  thumbnailItems,
  onThumbnailSelect,
  thumbnailCanNavigateBack,
  thumbnailCanNavigateForward,
  onThumbnailNavigateBack,
  onThumbnailNavigateForward,
  onThumbnailSave,
  showThumbnailSaveIndicator,
  onSessionDone,
  sessionActive,
}: MirrorTabContentProps) {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const commonStyles = createCommonStyles(colors);

  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'quick' | 'advanced'>('quick');

  // Quick mode: separate hair + makeup description fields
  const [inlineHairDesc, setInlineHairDesc] = React.useState('');
  const [inlineMakeupDesc, setInlineMakeupDesc] = React.useState('');

  // Sync the two inline fields into the single customDescription for generation
  const handleHairDescChange = React.useCallback((text: string) => {
    setInlineHairDesc(text);
    const combined = [text.trim(), inlineMakeupDesc.trim()].filter(Boolean).join('. ');
    setCustomDescription(combined);
  }, [inlineMakeupDesc, setCustomDescription]);

  const handleMakeupDescChange = React.useCallback((text: string) => {
    setInlineMakeupDesc(text);
    const combined = [inlineHairDesc.trim(), text.trim()].filter(Boolean).join('. ');
    setCustomDescription(combined);
  }, [inlineHairDesc, setCustomDescription]);

  // Open modal when header pill row requests a tab change
  React.useEffect(() => {
    if (editTabRequest) {
      setEditModalVisible(true);
      onEditTabRequestHandled?.();
    }
  }, [editTabRequest, onEditTabRequestHandled]);

  const presetGridGap = spacing.sm;
  const presetTileSize = (windowWidth - 2 * spacing.lg - 2 * spacing.sm - 3 * presetGridGap) / 4;

  return (
    <>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: hasSelections ? spacing.massive + 140 : floatingBarClearance },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        bottomOffset={80}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Single preview image */}
        <View style={styles.facePreviewSection}>
          {previewImageUrl ? (
            <View style={{ position: 'relative' }}>
              <TouchableOpacity onPress={onPreviewPress} activeOpacity={0.9}>
                <ExpoImage
                  source={{ uri: previewImageUrl }}
                  style={{ width: '100%', aspectRatio: 3 / 4 }}
                  contentFit="cover"
                />
              </TouchableOpacity>

              {onMenuPress && (
                <TouchableOpacity
                  style={styles.faceMenuButton}
                  onPress={onMenuPress}
                  accessibilityLabel="Open menu"
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}

              {generating && (
                <Animated.View
                  style={[styles.generateOverlay, generateOverlayStyle]}
                  pointerEvents="none"
                />
              )}

              {previewIsGenerated && (
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={onRestoreSelfie}
                  disabled={isStyleDisabled}
                  accessibilityLabel="Restore selfie"
                >
                  <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
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

          {generating && (
            <View style={styles.generatingDialog}>
              <Animated.Text style={[styles.dialogLine, dialogLine1Style]}>
                Ooo...
              </Animated.Text>
              <Animated.Text style={[styles.dialogLine, dialogLine2Style]}>
                You don't need any make up at all honey...
              </Animated.Text>
              <Animated.Text style={[styles.dialogLine, dialogLine3Style]}>
                But I love this look sister!
              </Animated.Text>
              <Animated.Text style={[styles.dialogLine, dialogLine4Style]}>
                Ready?
              </Animated.Text>
            </View>
          )}
        </View>

        {/* Generation thumbnail strip — below slider, above controls */}
        {!generating && thumbnailItems && thumbnailItems.length >= 2 && onThumbnailSelect && (
          <>
            <GenerationThumbnailStrip
              items={thumbnailItems}
              onSelect={onThumbnailSelect}
              canNavigateBack={thumbnailCanNavigateBack}
              canNavigateForward={thumbnailCanNavigateForward}
              onNavigateBack={onThumbnailNavigateBack}
              onNavigateForward={onThumbnailNavigateForward}
              onSavePress={onThumbnailSave}
              showSaveIndicator={showThumbnailSaveIndicator}
              style={{ paddingHorizontal: spacing.md }}
            />
            {sessionActive && onSessionDone && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, marginTop: spacing.xs }}>
                <TouchableOpacity
                  onPress={onSessionDone}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10 }}
                >
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {!generating && (
          <>
          {/* Controls row: [toggle + New]  [spacer]  [Draw] */}
          <View style={styles.mirrorControlsRow}>
            <View style={styles.mirrorControlsLeft}>
              <IconSegmentedToggle
                options={QUICK_ADVANCED_OPTIONS}
                value={viewMode}
                onChange={(v) => setViewMode(v as 'quick' | 'advanced')}
                showLabelWhenActiveOnly
              />
              <TouchableOpacity
                style={styles.mirrorNewButton}
                onPress={handlePickCamera}
                disabled={isStyleDisabled}
              >
                <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.mirrorNewButtonLabel}>New</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }} />

            {previewHasImage && Platform.OS !== 'web' && (
              <PillButton
                label="Draw"
                icon="pencil-outline"
                variant="primary"
                selected
                onPress={() => setIsDrawModeOpen(true)}
                size="medium"
              />
            )}
          </View>

          {/* Inline fields */}
          <View style={styles.mirrorInlineFields}>
            {viewMode === 'quick' ? (
              <>
                <View style={styles.customHeader}>
                  <Text style={styles.customHint}>Hair Description</Text>
                  <TouchableOpacity
                    style={styles.infoIconButton}
                    onPress={() => setInfoModalVisible(true)}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., long wavy hair with soft layers, curtain bangs"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  blurOnSubmit={false}
                  value={inlineHairDesc}
                  onChangeText={handleHairDescChange}
                />
                <View style={[styles.customHeader, { marginTop: 12 }]}>
                  <Text style={styles.customHint}>Make-up Description</Text>
                </View>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., soft glam with glossy lips, warm brown smoky eye"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  blurOnSubmit={false}
                  value={inlineMakeupDesc}
                  onChangeText={handleMakeupDescChange}
                />
              </>
            ) : (
              <AdvancedFieldsPanel
                advancedFields={advancedFields}
                setAdvancedField={setAdvancedField}
              />
            )}
          </View>

          <HeadshotPromptSettings variation={activeImageVariation} />
        </>
        )}
      </KeyboardAwareScrollView>

      {/* Edit tab content modal (opened via header category pills) */}
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
