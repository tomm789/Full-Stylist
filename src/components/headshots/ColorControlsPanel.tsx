/**
 * ColorControlsPanel
 * Shared color selector UI used by both DrawModeModal and DrawModeInline.
 *
 * Row A — horizontal scrollable row of colour circles (one per draw colour).
 * Row B — scrollable stack of per-drawn-colour settings panels, each with:
 *   - colour swatch + category icon row (tap = select, gear = open preset editor)
 *   - custom prompt text input
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/contexts/ThemeContext';
import { createColorControlsStyles } from '@/styles/drawModeStyles';
import { DRAW_COLOUR_ORDER, getDrawColour } from '@/lib/headshot/drawingColors';
import type { ColorSettings } from '@/hooks/headshot/useDrawModeLogic';

/** Ionicons name for each draw category. */
const CATEGORY_ICONS: Record<string, string> = {
  'lip-styles':       'water-outline',
  'eyeliner-styles':  'eye-outline',
  'eyeshadow-styles': 'glasses-outline',
  'blush-placements': 'heart-outline',
  'foundation-base':  'layers-outline',
  'eyebrow-styles':   'remove-outline',
  'major-aesthetics': 'star-outline',
  'hair':             'cut-outline',
};

type ColorControlsPanelProps = {
  activeColor: string;
  drawnColorHexes: string[];
  colorSettings: Record<string, ColorSettings>;
  onColorSelect: (hex: string) => void;
  onToggleCategory: (categoryId: string, hex: string) => void;
  onPromptChange: (hex: string, text: string) => void;
  onOpenCategoryEditor: (categoryId: string) => void;
};

export default function ColorControlsPanel({
  activeColor,
  drawnColorHexes,
  colorSettings,
  onColorSelect,
  onToggleCategory,
  onPromptChange,
  onOpenCategoryEditor,
}: ColorControlsPanelProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create(createColorControlsStyles(colors));

  return (
    <View style={styles.colorControlsSection}>

      {/* Row A: colour circles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorSelectorRow}
        contentContainerStyle={styles.colorSelectorContent}
      >
        {DRAW_COLOUR_ORDER.map((categoryId) => {
          const hex = getDrawColour(categoryId);
          const isActive = activeColor === hex;
          return (
            <TouchableOpacity
              key={categoryId}
              onPress={() => onColorSelect(hex)}
              style={styles.colorCircleButton}
              hitSlop={4}
            >
              <View style={[styles.colorCircle, { backgroundColor: hex }]} />
              {isActive && (
                <View style={[styles.colorCircleRing, { borderColor: hex }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Row B: stacked per-drawn-colour settings panels */}
      {drawnColorHexes.length > 0 && (
        <ScrollView
          style={styles.colorPanelsScroll}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {drawnColorHexes.map((hex) => (
            <View key={hex} style={styles.colorSettingsPanel}>

              {/* B1: colour swatch + category icons */}
              <View style={styles.colorSettingsTopRow}>
                <View style={[styles.activeColorSwatch, { backgroundColor: hex }]} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryIconsContent}
                >
                  {DRAW_COLOUR_ORDER.map((categoryId) => {
                    const iconName = CATEGORY_ICONS[categoryId];
                    const isSelected = colorSettings[hex]?.categoryId === categoryId;
                    return (
                      <View key={categoryId} style={styles.categoryIconWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.categoryIconButton,
                            isSelected && { borderColor: hex, backgroundColor: hex + '22' },
                          ]}
                          onPress={() => onToggleCategory(categoryId, hex)}
                          hitSlop={4}
                        >
                          <Ionicons
                            name={iconName as any}
                            size={16}
                            color={isSelected ? hex : colors.textSecondary}
                          />
                        </TouchableOpacity>
                        {isSelected && (
                          <TouchableOpacity
                            style={styles.categoryGearBadge}
                            onPress={() => onOpenCategoryEditor(categoryId)}
                            hitSlop={4}
                          >
                            <Ionicons name="settings-outline" size={9} color={colors.white} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* B2: custom prompt text area */}
              <TextInput
                style={styles.colorPromptInput}
                placeholder="Describe what to do here…"
                placeholderTextColor={colors.textTertiary}
                value={colorSettings[hex]?.customPrompt ?? ''}
                onChangeText={(text) => onPromptChange(hex, text)}
                multiline
                numberOfLines={2}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
