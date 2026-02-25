/**
 * DrawModeModal
 * Fullscreen draw mode UI for localised makeup/hair generation.
 *
 * Layout (top → bottom):
 *   Header: back | "Draw Mode" | save
 *   Controls: undo | redo | clear | load template | info
 *   Image + Skia canvas (pinch-to-zoom, 2-finger pan)
 *   Color selector row (8 color circles)
 *   Active color settings panel:
 *     Row 1 — color swatch + category icons (tap = select, gear = open preset modal)
 *     Row 2 — custom prompt text input for the active color
 *   CreatorContainer + CreatorBar (conditional, floating at bottom)
 */

import React, { useEffect } from 'react';
import {
  Modal,
  SafeAreaView,
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
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';
import { supabase } from '@/lib/supabase';
import { useDrawModeLogic } from '@/hooks/headshot/useDrawModeLogic';
import { createDrawModeStyles } from '@/styles/drawModeStyles';
import HeadshotDrawingCanvas, { type HeadshotDrawingCanvasRef, type DrawnColorEntry } from './HeadshotDrawingCanvas';
import HeadshotCreatorContainer, { type SelectionPill } from './HeadshotCreatorContainer';
import ColorControlsPanel from './ColorControlsPanel';
import CreatorBar from '../shared/CreatorBar';
import BottomSheet from '../shared/modals/BottomSheet';

const { spacing, borderRadius, typography } = theme;

export type DrawModeModalProps = {
  visible: boolean;
  onClose: () => void;
  previewImageUrl: string | null;
  baseImageId: string | null;
  userId: string | null;
  creatorSelections: SelectionPill[];
  hasSelections: boolean;
  generating: boolean;
  onGenerate: (maskBase64: string | null, colorMap: DrawnColorEntry[]) => void;
  onRemoveSelection: (id: string) => void;
  onOpenCategoryEditor: (categoryId: string) => void;
  onApplyTemplateSelections?: (snapshot: {
    hairPresetIds: string[];
    makeupPresetIds: string[];
    customDescription?: string;
  }) => void;
  /** Ref managed by the parent (useHairAndMakeup); shared with generation flow. */
  drawingCanvasRef: React.RefObject<HeadshotDrawingCanvasRef>;
};

export default function DrawModeModal({
  visible,
  onClose,
  previewImageUrl,
  baseImageId,
  userId,
  creatorSelections,
  hasSelections,
  generating,
  onGenerate,
  onRemoveSelection,
  onOpenCategoryEditor,
  onApplyTemplateSelections,
  drawingCanvasRef,
}: DrawModeModalProps) {
  const colors = useThemeColors();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const canvasWidth = screenWidth;
  const canvasHeight = Math.min(canvasWidth * (4 / 3), screenHeight * 0.52);

  const sharedStyles = createDrawModeStyles(colors, canvasWidth, canvasHeight);
  const styles = StyleSheet.create({
    ...sharedStyles,
    safeArea: { flex: 1, backgroundColor: colors.background },
    root: { flex: 1, position: 'relative' as const },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    headerButton: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
    headerTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
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
    onApplyTemplateSelections,
    onClose, // Modal variant: generate → close
  });

  // Reset draw state when modal closes
  useEffect(() => {
    if (!visible) draw.resetState();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.root}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Draw Mode</Text>
            <TouchableOpacity
              onPress={draw.handleSave}
              style={styles.headerButton}
              hitSlop={8}
              disabled={draw.saving}
            >
              <Ionicons
                name={draw.saving ? 'hourglass-outline' : 'save-outline'}
                size={22}
                color={draw.saving ? colors.textSecondary : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Controls row ── */}
          <View style={styles.controlsRow}>
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

            <View style={styles.controlSpacer} />

            <TouchableOpacity onPress={draw.handleOpenTemplateBrowser} style={styles.controlButton} hitSlop={8}>
              <Ionicons name="folder-open-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => draw.setInfoVisible(true)} style={styles.controlButton} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Image + canvas ── */}
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

                {draw.templateMaskUrl && (
                  <ExpoImage
                    source={{ uri: draw.templateMaskUrl }}
                    style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
                    contentFit="cover"
                  />
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

          {/* ── Color controls ── */}
          <ColorControlsPanel
            activeColor={draw.activeColor}
            drawnColorHexes={draw.drawnColorHexes}
            colorSettings={draw.colorSettings}
            onColorSelect={draw.setActiveColor}
            onToggleCategory={draw.toggleCategoryForColor}
            onPromptChange={draw.handlePromptChange}
            onOpenCategoryEditor={onOpenCategoryEditor}
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
        </View>
      </SafeAreaView>

      {/* ── Info modal ── */}
      <Modal visible={draw.infoVisible} transparent animationType="fade" onRequestClose={() => draw.setInfoVisible(false)}>
        <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => draw.setInfoVisible(false)}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How to use Draw Mode</Text>
            <Text style={styles.infoBody}>
              {`1. Select a color from the row below the image.\n\n`}
              {`2. Draw on the image to mark the areas you want the AI to modify.\n\n`}
              {`3. Tap a category icon to associate the color with a makeup or hair type.\n\n`}
              {`4. Tap the gear icon on a selected category to choose a specific preset.\n\n`}
              {`5. Optionally add a custom description for each color in the text field.\n\n`}
              {`6. Pinch to zoom in for precision. Double-tap to reset.\n\n`}
              {`7. Tap Generate — the AI will use your drawing as placement guidance.`}
            </Text>
            <TouchableOpacity style={styles.infoClose} onPress={() => draw.setInfoVisible(false)}>
              <Text style={styles.infoCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Template browser ── */}
      <BottomSheet
        visible={draw.templateBrowserVisible}
        onClose={() => draw.setTemplateBrowserVisible(false)}
        title="Saved Templates"
      >
        {draw.loadingTemplates ? (
          <Text style={styles.templateEmpty}>Loading…</Text>
        ) : draw.templates.length === 0 ? (
          <Text style={styles.templateEmpty}>No saved templates for this image yet.</Text>
        ) : (
          draw.templates.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.templateRow}
              onPress={() => draw.handleLoadTemplate(t)}
            >
              <ExpoImage
                source={{
                  uri: supabase.storage
                    .from(t.mask_storage_bucket)
                    .getPublicUrl(t.mask_storage_path).data.publicUrl,
                }}
                style={styles.templateThumb}
                contentFit="cover"
              />
              <View style={styles.templateInfo}>
                <Text style={styles.templateDate}>
                  {new Date(t.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
                {t.name && <Text style={styles.templateName}>{t.name}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </BottomSheet>
    </Modal>
  );
}
