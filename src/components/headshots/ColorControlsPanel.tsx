/**
 * ColorControlsPanel
 * Shared color selector UI used by both DrawModeModal and DrawModeInline.
 *
 * Row A — horizontal scrollable row of colour circles (one per draw colour).
 * Row B — scrollable stack of per-drawn-colour settings panels:
 *   - colour swatch label
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

import { useThemeColors } from '@/contexts/ThemeContext';
import { createColorControlsStyles } from '@/styles/drawModeStyles';
import { DRAW_COLOUR_MAP, DRAW_COLOUR_ORDER, getDrawColour } from '@/lib/headshot/drawingColors';
import type { ColorSettings } from '@/hooks/headshot/useDrawModeLogic';

type ColorControlsPanelProps = {
  activeColor: string;
  drawnColorHexes: string[];
  colorSettings: Record<string, ColorSettings>;
  onColorSelect: (hex: string) => void;
  onPromptChange: (hex: string, text: string) => void;
  focusPromptHex?: string | null;
  onFocusPromptHandled?: () => void;
};

export default function ColorControlsPanel({
  activeColor,
  drawnColorHexes,
  colorSettings,
  onColorSelect,
  onPromptChange,
  focusPromptHex,
  onFocusPromptHandled,
}: ColorControlsPanelProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create(createColorControlsStyles(colors));
  const inputRefs = React.useRef<Record<string, TextInput | null>>({});

  React.useEffect(() => {
    if (!focusPromptHex) return;
    inputRefs.current[focusPromptHex]?.focus();
    onFocusPromptHandled?.();
  }, [focusPromptHex, onFocusPromptHandled]);

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

              {/* B1: colour swatch + label */}
              <View style={styles.colorSettingsTopRow}>
                <View style={[styles.activeColorSwatch, { backgroundColor: hex }]} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {Object.values(DRAW_COLOUR_MAP).find((entry) => entry.colour === hex)?.label ?? hex}
                </Text>
              </View>

              {/* B2: custom prompt text area */}
              <TextInput
                ref={(ref) => {
                  inputRefs.current[hex] = ref;
                }}
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
