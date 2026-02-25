/**
 * DrawModeInline
 * Draw mode UI rendered inline within the My Mirror tab — no Modal wrapper.
 *
 * Layout (top → bottom):
 *   Controls: close | info | spacer | undo | redo | clear
 *   Image + Skia canvas (pinch-to-zoom, 2-finger pan)
 *   Color selector row (8 color circles)
 *   Active color settings panels (scrollable, stacked per drawn color)
 *   CreatorContainer + CreatorBar (conditional)
 *
 * Canvas dimensions come from the container's onLayout width rather than
 * useWindowDimensions, so this component works at any width.
 */

import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';
import { useDrawModeLogic } from '@/hooks/headshot/useDrawModeLogic';
import { createDrawModeStyles } from '@/styles/drawModeStyles';
import HeadshotDrawingCanvas, { type HeadshotDrawingCanvasRef, type DrawnColorEntry } from './HeadshotDrawingCanvas';
import HeadshotCreatorContainer, { type SelectionPill } from './HeadshotCreatorContainer';
import ColorControlsPanel from './ColorControlsPanel';
import CreatorBar from '../shared/CreatorBar';

export type DrawModeInlineProps = {
  onClose: () => void;
  previewImageUrl: string | null;
  baseImageId: string | null;
  userId: string | null;
  creatorSelections: SelectionPill[];
  hasSelections: boolean;
  generating: boolean;
  onGenerate: (maskBase64: string | null, colorMap: DrawnColorEntry[]) => void;
  onRemoveSelection: (id: string) => void;
  /** Ref managed by the parent (useHairAndMakeup); shared with generation flow. */
  drawingCanvasRef: React.RefObject<HeadshotDrawingCanvasRef>;
};

export default function DrawModeInline({
  onClose,
  previewImageUrl,
  baseImageId,
  userId,
  creatorSelections,
  hasSelections,
  generating,
  onGenerate,
  onRemoveSelection,
  drawingCanvasRef,
}: DrawModeInlineProps) {
  const colors = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();

  // Measure container width via onLayout
  const [containerWidth, setContainerWidth] = useState(0);
  const canvasWidth = containerWidth;
  const canvasHeight =
    containerWidth > 0 ? Math.min(containerWidth * (4 / 3), screenHeight * 0.52) : 0;

  const sharedStyles = createDrawModeStyles(colors, canvasWidth, canvasHeight);
  const styles = StyleSheet.create({
    ...sharedStyles,
    root: { flex: 1 as const },
  });

  const draw = useDrawModeLogic({
    previewImageUrl,
    baseImageId,
    userId,
    creatorSelections,
    hasSelections,
    generating,
    drawingCanvasRef,
    canvasWidth,
    canvasHeight,
    onGenerate,
    // No onClose — user stays in draw mode until they tap the back button
  });

  return (
    <View
      style={styles.root}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* ── Controls row ── */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={onClose} style={styles.controlButton} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => draw.setInfoVisible(true)} style={styles.controlButton} hitSlop={8}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.controlSpacer} />

        <TouchableOpacity
          onPress={draw.handleUndo}
          disabled={!draw.canUndo}
          style={[styles.controlButton, !draw.canUndo && styles.controlButtonDisabled]}
          hitSlop={8}
        >
          <Ionicons name="arrow-undo-outline" size={20} color={draw.canUndo ? colors.textPrimary : colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={draw.handleRedo}
          disabled={!draw.canRedo}
          style={[styles.controlButton, !draw.canRedo && styles.controlButtonDisabled]}
          hitSlop={8}
        >
          <Ionicons name="arrow-redo-outline" size={20} color={draw.canRedo ? colors.textPrimary : colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={draw.handleClear} style={styles.controlButton} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Image + canvas (rendered only after container width is known) ── */}
      {containerWidth > 0 && (
        <GestureDetector gesture={draw.allGestures}>
          <View style={styles.canvasContainer}>
            <Animated.View style={[StyleSheet.absoluteFill, draw.animatedCanvasStyle]}>
              {previewImageUrl ? (
                <ExpoImage
                  source={{ uri: previewImageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundTertiary }]} />
              )}

              <HeadshotDrawingCanvas
                ref={drawingCanvasRef}
                drawingEnabled
                currentColor={draw.activeColor}
                onStrokeChange={draw.handleStrokeChange}
                viewScale={draw.scale}
                viewTranslateX={draw.translateX}
                viewTranslateY={draw.translateY}
              />
            </Animated.View>

            <View style={styles.zoomHint} pointerEvents="none">
              <Text style={styles.zoomHintText}>Pinch to zoom · 2-finger drag to pan · Double-tap to reset</Text>
            </View>
          </View>
        </GestureDetector>
      )}

      {/* ── Color controls ── */}
      <ColorControlsPanel
        activeColor={draw.activeColor}
        drawnColorHexes={draw.drawnColorHexes}
        colorSettings={draw.colorSettings}
        onColorSelect={draw.setActiveColor}
        onPromptChange={draw.handlePromptChange}
        focusPromptHex={draw.focusPromptHex}
        onFocusPromptHandled={() => draw.setFocusPromptHex(null)}
      />

      {/* ── Selections + generate ── */}
      {(hasSelections || draw.hasStrokes) && (
        <>
          {hasSelections && (
            <HeadshotCreatorContainer
              selections={creatorSelections}
              onRemoveSelection={onRemoveSelection}
            />
          )}
          <CreatorBar
            label={draw.generateLabel}
            onGenerate={draw.handleGenerate}
            isGenerating={!draw.canGenerate}
            showOptionsButton={false}
          />
        </>
      )}

      {/* ── Info modal ── */}
      <Modal visible={draw.infoVisible} transparent animationType="fade" onRequestClose={() => draw.setInfoVisible(false)}>
        <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => draw.setInfoVisible(false)}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How to use Draw Mode</Text>
            <Text style={styles.infoBody}>
              {`1. Select a color from the row below the image.\n\n`}
              {`2. Draw on the image to mark the areas you want the AI to modify.\n\n`}
              {`3. Add a custom instruction for each color in the text field below.\n\n`}
              {`4. Pinch to zoom in for precision. Double-tap to reset.\n\n`}
              {`5. Tap Generate — the AI will use your color + instruction pairings as placement guidance.`}
            </Text>
            <TouchableOpacity style={styles.infoClose} onPress={() => draw.setInfoVisible(false)}>
              <Text style={styles.infoCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
