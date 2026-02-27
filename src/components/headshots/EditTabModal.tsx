/**
 * EditTabModal
 * Bottom-sheet modal for the Hair & Make-Up edit tabs (Quick, Hair, Make-Up,
 * Accessories, Jewellery, Advanced).
 * Extracted from hair-and-make-up.tsx to reduce screen file size.
 */

import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { HAIR_COLOR_SWATCHES } from '@/lib/headshot/hairColors';
import { PillButton } from '@/components/shared';
import HairLengthSlider from '@/components/headshots/HairLengthSlider';
import PresetGridTile from '@/components/hairAndMakeup/PresetGridTile';
import ColorPresetTile from '@/components/hairAndMakeup/ColorPresetTile';
import SubcategoryPillSelector from '@/components/hairAndMakeup/SubcategoryPillSelector';
import AdvancedFieldsPanel from '@/components/headshots/AdvancedFieldsPanel';
import {
  ACCESSORY_SUBCATEGORIES,
  JEWELLERY_SUBCATEGORIES,
  HAIR_COLOR_TABS,
  type EditTab,
} from '@/hooks/headshot/useHairAndMakeup';
import type { PresetCategory } from '@/lib/headshot/presetTypes';

interface EditTabModalProps {
  visible: boolean;
  onClose: () => void;
  editTab: EditTab;
  // Category state
  categoryPills: PresetCategory[];
  isCustomCategory: boolean;
  activeCategory: PresetCategory | null;
  quickTabHairPresets: PresetCategory | null;
  quickTabMakeupPresets: PresetCategory | null;
  quickTabPresets: PresetCategory | null;
  hairColorCategory: PresetCategory | null;
  // Preset/selection state
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  handleInfoPress: (option: any) => void;
  setActiveCategoryId: (id: string) => void;
  formatCategoryLabel: (title: string) => string;
  // Quick/custom description
  customDescriptionCopy: string;
  customDescription: string;
  setCustomDescription: (value: string) => void;
  setInfoModalVisible: (visible: boolean) => void;
  customPlaceholder: string;
  // Accessories / Jewellery
  accessorySubcategory: string | null;
  setAccessorySubcategory: (id: string | null) => void;
  jewellerySubcategory: string | null;
  setJewellerySubcategory: (id: string | null) => void;
  // Advanced
  advancedFields: Record<string, string>;
  setAdvancedField: (id: string, value: string) => void;
  // Layout
  presetGridGap: number;
  presetTileSize: number;
  // Hair length (Quick / Hair tabs)
  hairLengthOptions: { id: string; title: string }[];
  selectedHairLengthId: string | null;
}

export default function EditTabModal({
  visible,
  onClose,
  editTab,
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
  presetGridGap,
  presetTileSize,
  hairLengthOptions,
  selectedHairLengthId,
}: EditTabModalProps) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const commonStyles = createCommonStyles(colors);

  const tabTitle =
    editTab === 'quick' ? 'Quick' :
    editTab === 'hair' ? 'Hairstyles' :
    editTab === 'haircolors' ? 'Hair Colors' :
    editTab === 'aesthetics' ? 'Aesthetics' :
    editTab === 'makeup' ? 'Make-Up' :
    editTab === 'accessories' ? 'Accessories' :
    editTab === 'jewellery' ? 'Jewellery' :
    'Advanced';

  const [hairColorTab, setHairColorTab] = React.useState<string | null>('natural-colors');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editModalOverlay}>
        <View style={styles.editModalCard}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>{tabTitle}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.editModalScroll}
            contentContainerStyle={styles.editModalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Accessories: subcategory row */}
            {editTab === 'accessories' && (
              <SubcategoryPillSelector
                options={ACCESSORY_SUBCATEGORIES}
                selectedId={accessorySubcategory}
                onSelect={setAccessorySubcategory}
              />
            )}
            {/* Jewellery: subcategory row */}
            {editTab === 'jewellery' && (
              <SubcategoryPillSelector
                options={JEWELLERY_SUBCATEGORIES}
                selectedId={jewellerySubcategory}
                onSelect={setJewellerySubcategory}
              />
            )}
            {/* Category pills — only for hair/makeup tabs */}
            {editTab !== 'haircolors' && editTab !== 'aesthetics' && editTab !== 'accessories' && editTab !== 'jewellery' && editTab !== 'advanced' && categoryPills.length > 0 && (
              <View style={styles.categoryPills}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryPillsRow}>
                    {categoryPills.map((category) => (
                      <PillButton
                        key={category.id}
                        label={formatCategoryLabel(category.title)}
                        selected={activeCategory?.id === category.id}
                        onPress={() => setActiveCategoryId(category.id)}
                        size="medium"
                        variant="default"
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {(isCustomCategory || activeCategory) && (
              <>
                <View
                  style={[
                    styles.categoryCard,
                    styles.editModalSection,
                  ]}
                >
                  {isCustomCategory ? (
                    <>
                      {/* Quick / custom tab: inline presets */}
                      {editTab === 'quick' ? (
                        <>
                          {/* Quick tab: hair length slider + major-aesthetics */}
                          <View style={styles.sectionBlock}>
                            <Text style={styles.sectionLabel}>Hair Length</Text>
                            <HairLengthSlider
                              options={hairLengthOptions}
                              selectedId={selectedHairLengthId}
                              onSelect={(id) => toggleSelection(id)}
                            />
                          </View>
                          {quickTabMakeupPresets?.sections.map((section) => (
                            <View key={section.id} style={styles.sectionBlock}>
                              <Text style={styles.sectionLabel}>Makeup</Text>
                              <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                                {section.options.map((option) => (
                                  <View key={option.id} style={{ width: presetTileSize, height: presetTileSize }}>
                                    <PresetGridTile
                                      title={option.title}
                                      isSelected={selectedIds.includes(option.id)}
                                      onPress={() => toggleSelection(option.id)}
                                      onInfoPress={() => handleInfoPress(option)}
                                    />
                                  </View>
                                ))}
                              </View>
                            </View>
                          ))}
                        </>
                      ) : editTab === 'hair' ? (
                        /* Hair tab quick section: length slider */
                        <View style={styles.sectionBlock}>
                          <HairLengthSlider
                            options={hairLengthOptions}
                            selectedId={selectedHairLengthId}
                            onSelect={(id) => toggleSelection(id)}
                          />
                        </View>
                      ) : (
                        <>
                          {/* Makeup quick sub-tab presets */}
                          {quickTabPresets?.sections.map((section) => (
                            <View key={section.id} style={styles.sectionBlock}>
                              <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                                {section.options.map((option) => (
                                  <View key={option.id} style={{ width: presetTileSize, height: presetTileSize }}>
                                    <PresetGridTile
                                      title={option.title}
                                      isSelected={selectedIds.includes(option.id)}
                                      onPress={() => toggleSelection(option.id)}
                                      onInfoPress={() => handleInfoPress(option)}
                                    />
                                  </View>
                                ))}
                              </View>
                            </View>
                          ))}
                        </>
                      )}
                      {/* Custom description — hidden on makeup Major Aesthetics sub-tab */}
                      {editTab !== 'makeup' && (
                        <>
                          <View style={styles.customHeader}>
                            <Text style={styles.customHint}>{customDescriptionCopy}</Text>
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
                            placeholder={customPlaceholder}
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            value={customDescription}
                            onChangeText={setCustomDescription}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    activeCategory?.sections.map((section) => (
                      <View key={section.id} style={styles.sectionBlock}>
                        {activeCategory.sections.length > 1 && (
                          <Text style={styles.sectionLabel}>{section.title}</Text>
                        )}
                        <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                          {section.options.map((option) => (
                            <View key={option.id} style={{ width: presetTileSize, height: presetTileSize }}>
                              <PresetGridTile
                                title={option.title}
                                isSelected={selectedIds.includes(option.id)}
                                onPress={() => toggleSelection(option.id)}
                                onInfoPress={() => handleInfoPress(option)}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>

              </>
            )}

            {/* Hair Colors tab content */}
            {editTab === 'haircolors' && (
              <>
                <SubcategoryPillSelector
                  options={HAIR_COLOR_TABS}
                  selectedId={hairColorTab}
                  onSelect={(id) => setHairColorTab(id ?? 'natural-colors')}
                />
                {hairColorCategory && (
                  <View style={[styles.categoryCard, styles.editModalSection]}>
                    {hairColorCategory.sections
                      .filter((section) => section.id === hairColorTab)
                      .map((section) => (
                        <View key={section.id} style={styles.sectionBlock}>
                          <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                            {section.options.map((option) => (
                              <View key={option.id} style={{ width: presetTileSize, height: presetTileSize }}>
                                <ColorPresetTile
                                  title={option.title}
                                  isSelected={selectedIds.includes(option.id)}
                                  swatch={HAIR_COLOR_SWATCHES[option.id]}
                                  onPress={() => toggleSelection(option.id)}
                                  onInfoPress={() => handleInfoPress(option)}
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                  </View>
                )}
              </>
            )}

            {/* Aesthetics tab content */}
            {editTab === 'aesthetics' && quickTabMakeupPresets && (
              <View style={[styles.categoryCard, styles.editModalSection]}>
                {quickTabMakeupPresets.sections.map((section) => (
                  <View key={section.id} style={styles.sectionBlock}>
                    <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                      {section.options.map((option) => (
                        <View key={option.id} style={{ width: presetTileSize, height: presetTileSize }}>
                          <PresetGridTile
                            title={option.title}
                            isSelected={selectedIds.includes(option.id)}
                            onPress={() => toggleSelection(option.id)}
                            onInfoPress={() => handleInfoPress(option)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Accessories tab content */}
            {editTab === 'accessories' && (
              <View style={[styles.categoryCard, styles.editModalSection]}>
                {accessorySubcategory ? (
                  <View style={styles.emptySubcategoryContainer}>
                    <Ionicons name="glasses-outline" size={36} color={colors.textTertiary} />
                    <Text style={styles.emptySubcategoryText}>
                      {ACCESSORY_SUBCATEGORIES.find((s) => s.id === accessorySubcategory)?.name} presets coming soon
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptySubcategoryContainer}>
                    <Text style={styles.emptySubcategoryText}>Select a subcategory above</Text>
                  </View>
                )}
              </View>
            )}

            {/* Jewellery tab content */}
            {editTab === 'jewellery' && (
              <View style={[styles.categoryCard, styles.editModalSection]}>
                {jewellerySubcategory ? (
                  <View style={styles.emptySubcategoryContainer}>
                    <Ionicons name="diamond-outline" size={36} color={colors.textTertiary} />
                    <Text style={styles.emptySubcategoryText}>
                      {JEWELLERY_SUBCATEGORIES.find((s) => s.id === jewellerySubcategory)?.name} presets coming soon
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptySubcategoryContainer}>
                    <Text style={styles.emptySubcategoryText}>Select a subcategory above</Text>
                  </View>
                )}
              </View>
            )}

            {/* Advanced tab content */}
            {editTab === 'advanced' && (
              <View style={[styles.categoryCard, styles.editModalSection]}>
                <AdvancedFieldsPanel
                  advancedFields={advancedFields}
                  setAdvancedField={setAdvancedField}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
