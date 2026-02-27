/**
 * ColorControlsPanel
 * Shared color selector UI used by both DrawModeModal and DrawModeInline.
 *
 * Row A — horizontal scrollable row of colour circles (one per draw colour).
 * Row B — scrollable stack of per-drawn-colour settings panels:
 *   - colour swatch
 *   - custom prompt text input
 */

import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useThemeColors } from '@/contexts/ThemeContext';
import { createColorControlsStyles } from '@/styles/drawModeStyles';
import { DRAW_COLOUR_ORDER, getDrawColour } from '@/lib/headshot/drawingColors';
import type { ColorSettings } from '@/hooks/headshot/useDrawModeLogic';

type ColorControlsPanelProps = {
  activeColor: string;
  drawnColorHexes: string[];
  colorSettings: Record<string, ColorSettings>;
  onColorSelect: (hex: string) => void;
  onPromptChange: (hex: string, text: string) => void;
  focusPromptHex?: string | null;
  onFocusPromptHandled?: () => void;
  keyboardVisible?: boolean;
  keyboardHeight?: number;
  bottomInset?: number;
};

export default function ColorControlsPanel({
  activeColor,
  drawnColorHexes,
  colorSettings,
  onColorSelect,
  onPromptChange,
  focusPromptHex,
  onFocusPromptHandled,
  keyboardVisible = false,
  keyboardHeight = 0,
  bottomInset = 0,
}: ColorControlsPanelProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create(createColorControlsStyles(colors));
  const scrollRef = React.useRef<ScrollView | null>(null);
  const inputRefs = React.useRef<Record<string, TextInput | null>>({});
  const scrollYRef = React.useRef(0);
  const [activePromptHex, setActivePromptHex] = React.useState<string | null>(null);

  const ensurePromptVisible = React.useCallback(
    (hex: string) => {
      if (!keyboardVisible || keyboardHeight <= 0) return;
      const input = inputRefs.current[hex];
      if (!input || typeof input.measureInWindow !== 'function') return;

      input.measureInWindow((_x, y, _w, h) => {
        const keyboardTop = Dimensions.get('window').height - keyboardHeight;
        const overlap = y + h + 14 - keyboardTop;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + overlap),
            animated: true,
          });
        }
      });
    },
    [keyboardVisible, keyboardHeight],
  );

  React.useEffect(() => {
    if (!focusPromptHex) return;
    inputRefs.current[focusPromptHex]?.focus();
    setActivePromptHex(focusPromptHex);
    onFocusPromptHandled?.();
  }, [focusPromptHex, onFocusPromptHandled]);

  React.useEffect(() => {
    if (!keyboardVisible || !activePromptHex) return;
    const timer = setTimeout(() => ensurePromptVisible(activePromptHex), 36);
    return () => clearTimeout(timer);
  }, [keyboardVisible, activePromptHex, ensurePromptVisible]);

  const orderedColorHexes = React.useMemo(() => {
    if (!drawnColorHexes.includes(activeColor)) return drawnColorHexes;
    return [activeColor, ...drawnColorHexes.filter((hex) => hex !== activeColor)];
  }, [drawnColorHexes, activeColor]);

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
          ref={scrollRef}
          style={styles.colorPanelsScroll}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
        >
          {orderedColorHexes.map((hex) => (
            <View
              key={hex}
              style={styles.colorSettingsPanel}
            >
              <View style={styles.colorPromptRow}>
                <View style={[styles.activeColorSwatch, styles.activeColorSwatchTopAligned, { backgroundColor: hex }]} />
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[hex] = ref;
                  }}
                  style={[styles.colorPromptInput, styles.colorPromptInputInline]}
                  placeholder="Describe what to do here…"
                  placeholderTextColor={colors.textTertiary}
                  value={colorSettings[hex]?.customPrompt ?? ''}
                  onChangeText={(text) => onPromptChange(hex, text)}
                  onFocus={() => {
                    setActivePromptHex(hex);
                    ensurePromptVisible(hex);
                  }}
                  multiline
                  blurOnSubmit={false}
                  numberOfLines={2}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
