/**
 * DrawModeModal
 * Fullscreen draw mode UI for localised makeup/hair generation.
 *
 * Layout (top → bottom):
 *   Header: back | "Draw Mode" | save
 *   Controls: undo | redo | clear | load template | info
 *   Image + Skia canvas (pinch-to-zoom, 2-finger pan)
 *   Stroke width picker
 *   Makeup type pills (horizontal scroll, each with ⚙ settings)
 *   CreatorContainer + CreatorBar (conditional, floating at bottom)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { theme, shadows } from '@/styles';
import { supabase } from '@/lib/supabase';
import { uploadBase64ImageToStorage } from '@/lib/utils/image-helpers';
import { saveDrawingTemplate, listDrawingTemplates, type HeadshotDrawingTemplate } from '@/lib/headshot/drawingTemplates';
import { DRAW_COLOUR_MAP, DRAW_COLOUR_ORDER, getDrawColour } from '@/lib/headshot/drawingColors';
import HeadshotDrawingCanvas, { type HeadshotDrawingCanvasRef } from './HeadshotDrawingCanvas';
import HeadshotCreatorContainer, { type SelectionPill } from './HeadshotCreatorContainer';
import CreatorBar from '../shared/CreatorBar';
import BottomSheet from '../shared/modals/BottomSheet';

const { spacing, borderRadius, typography } = theme;

const STROKE_SIZES = [
  { key: 'thin',   width: 6,  label: 'S' },
  { key: 'medium', width: 12, label: 'M' },
  { key: 'thick',  width: 24, label: 'L' },
] as const;

export type DrawModeModalProps = {
  visible: boolean;
  onClose: () => void;
  previewImageUrl: string | null;
  baseImageId: string | null;
  userId: string | null;
  creatorSelections: SelectionPill[];
  hasSelections: boolean;
  generating: boolean;
  onGenerate: () => void;
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
  const styles = createStyles(colors);

  // --- Draw state ---
  const [activeCategory, setActiveCategory] = useState<string>('lip-styles');
  const [strokeWidth, setStrokeWidth] = useState<number>(12);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  // --- Modals ---
  const [infoVisible, setInfoVisible] = useState(false);
  const [templateBrowserVisible, setTemplateBrowserVisible] = useState(false);
  const [templates, setTemplates] = useState<HeadshotDrawingTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);

  // Loaded template mask to show as underlay
  const [templateMaskUrl, setTemplateMaskUrl] = useState<string | null>(null);

  const currentColour = getDrawColour(activeCategory);

  // --- Zoom / pan (Reanimated) ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    savedTranslateX.value = 0;
    translateY.value = withSpring(0);
    savedTranslateY.value = 0;
  }, []);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ] as any,
  }));

  // Pinch-to-zoom (2 fingers)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // 2-finger pan (for moving when zoomed)
  const panZoomGesture = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double-tap to reset zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => resetZoom());

  const zoomGesture = Gesture.Simultaneous(pinchGesture, panZoomGesture, doubleTapGesture);

  // --- Stroke change callback ---
  const handleStrokeChange = useCallback(
    (nextHasStrokes: boolean, nextCanUndo: boolean, nextCanRedo: boolean) => {
      setHasStrokes(nextHasStrokes);
      setCanUndo(nextCanUndo);
      setCanRedo(nextCanRedo);
    },
    [],
  );

  // --- Reset canvas state when modal opens/closes ---
  useEffect(() => {
    if (!visible) {
      setTemplateMaskUrl(null);
    }
  }, [visible]);

  // --- Undo / redo / clear ---
  const handleUndo = () => drawingCanvasRef.current?.undo();
  const handleRedo = () => drawingCanvasRef.current?.redo();
  const handleClear = () => {
    drawingCanvasRef.current?.clear();
    setTemplateMaskUrl(null);
  };

  // --- Save template ---
  const handleSave = async () => {
    if (!userId || !baseImageId) {
      Alert.alert('Cannot save', 'A headshot must be loaded before saving a template.');
      return;
    }
    setSaving(true);
    try {
      const maskBase64 = await drawingCanvasRef.current?.makeMaskSnapshot();
      if (!maskBase64) {
        Alert.alert('Nothing to save', 'Draw on the image first.');
        return;
      }
      const bucket = 'user-images';
      const path = `${userId}/masks/template-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await uploadBase64ImageToStorage(
        bucket, path, maskBase64, 'image/png'
      );
      if (uploadError || !uploadData?.path) {
        throw uploadError || new Error('Upload failed');
      }
      const promptSnapshot: Record<string, any> = {};
      creatorSelections.forEach((s) => {
        if (s.type === 'hair') {
          (promptSnapshot.hairPresetIds ??= []).push(s.id);
        } else if (s.type === 'makeup') {
          (promptSnapshot.makeupPresetIds ??= []).push(s.id);
        }
      });
      const { error: saveError } = await saveDrawingTemplate({
        userId,
        baseImageId,
        maskStoragePath: uploadData.path,
        maskStorageBucket: bucket,
        promptSnapshot,
        colourMap: Object.fromEntries(
          DRAW_COLOUR_ORDER.map((id) => [id, getDrawColour(id)])
        ),
      });
      if (saveError) throw saveError;
      Alert.alert('Saved', 'Drawing template saved successfully.');
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // --- Load templates browser ---
  const handleOpenTemplateBrowser = async () => {
    if (!userId || !baseImageId) return;
    setLoadingTemplates(true);
    setTemplateBrowserVisible(true);
    const result = await listDrawingTemplates(userId, baseImageId);
    setTemplates(result);
    setLoadingTemplates(false);
  };

  const handleLoadTemplate = (template: HeadshotDrawingTemplate) => {
    const { data } = supabase.storage
      .from(template.mask_storage_bucket)
      .getPublicUrl(template.mask_storage_path);
    setTemplateMaskUrl(data.publicUrl);
    // Apply saved prompt selections if callback is available
    if (onApplyTemplateSelections && template.prompt_snapshot_json) {
      onApplyTemplateSelections({
        hairPresetIds: template.prompt_snapshot_json.hairPresetIds ?? [],
        makeupPresetIds: template.prompt_snapshot_json.makeupPresetIds ?? [],
        customDescription: template.prompt_snapshot_json.customDescription,
      });
    }
    setTemplateBrowserVisible(false);
  };

  // --- Generate ---
  const canGenerate = (hasSelections || hasStrokes) && !generating;
  const generateLabel = generating
    ? 'Generating…'
    : `Generate${creatorSelections.length > 0 ? ` (${creatorSelections.length})` : ''}`;

  const handleGenerate = () => {
    onGenerate();
    onClose();
  };

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
              onPress={handleSave}
              style={styles.headerButton}
              hitSlop={8}
              disabled={saving}
            >
              <Ionicons
                name={saving ? 'hourglass-outline' : 'save-outline'}
                size={22}
                color={saving ? colors.textSecondary : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Controls row ── */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={handleUndo}
              disabled={!canUndo}
              style={[styles.controlButton, !canUndo && styles.controlButtonDisabled]}
              hitSlop={8}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={canUndo ? colors.textPrimary : colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRedo}
              disabled={!canRedo}
              style={[styles.controlButton, !canRedo && styles.controlButtonDisabled]}
              hitSlop={8}
            >
              <Ionicons name="arrow-redo-outline" size={20} color={canRedo ? colors.textPrimary : colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear} style={styles.controlButton} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.controlSpacer} />

            <TouchableOpacity onPress={handleOpenTemplateBrowser} style={styles.controlButton} hitSlop={8}>
              <Ionicons name="folder-open-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.controlButton} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Image + canvas (zoomable) ── */}
          <GestureDetector gesture={zoomGesture}>
            <View style={styles.canvasContainer}>
              <Animated.View style={[StyleSheet.absoluteFill, animatedCanvasStyle]}>
                {previewImageUrl ? (
                  <ExpoImage
                    source={{ uri: previewImageUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundTertiary }]} />
                )}

                {/* Loaded template mask underlay (semi-transparent) */}
                {templateMaskUrl && (
                  <ExpoImage
                    source={{ uri: templateMaskUrl }}
                    style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
                    contentFit="cover"
                  />
                )}

                {/* Skia drawing canvas */}
                <HeadshotDrawingCanvas
                  ref={drawingCanvasRef}
                  drawingEnabled
                  currentColor={currentColour}
                  strokeWidth={strokeWidth}
                  onStrokeChange={handleStrokeChange}
                />
              </Animated.View>

              {/* Zoom hint */}
              <View style={styles.zoomHint} pointerEvents="none">
                <Text style={styles.zoomHintText}>Pinch to zoom · 2-finger drag to pan · Double-tap to reset</Text>
              </View>
            </View>
          </GestureDetector>

          {/* ── Stroke width picker ── */}
          <View style={styles.strokeRow}>
            {STROKE_SIZES.map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => setStrokeWidth(s.width)}
                style={[
                  styles.strokeButton,
                  strokeWidth === s.width && { borderColor: currentColour },
                ]}
                hitSlop={6}
              >
                <View
                  style={[
                    styles.strokeDot,
                    {
                      width: s.width,
                      height: s.width,
                      backgroundColor: currentColour,
                      borderRadius: s.width / 2,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Makeup type pills ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillScrollContent}
          >
            {DRAW_COLOUR_ORDER.map((categoryId) => {
              const entry = DRAW_COLOUR_MAP[categoryId];
              const isActive = activeCategory === categoryId;
              return (
                <View key={categoryId} style={[styles.pill, isActive && { borderColor: entry.colour }]}>
                  <TouchableOpacity
                    style={styles.pillBody}
                    onPress={() => setActiveCategory(categoryId)}
                  >
                    <View style={[styles.pillDot, { backgroundColor: entry.colour }]} />
                    <Text style={[styles.pillLabel, isActive && { color: entry.colour }]}>
                      {entry.label}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pillSettingsButton}
                    onPress={() => onOpenCategoryEditor(categoryId)}
                    hitSlop={4}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={12}
                      color={isActive ? entry.colour : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Selections + generate (floating) ── */}
          {(hasSelections || hasStrokes) && (
            <>
              {hasSelections && (
                <HeadshotCreatorContainer
                  selections={creatorSelections}
                  onRemoveSelection={onRemoveSelection}
                />
              )}
              <CreatorBar
                label={generateLabel}
                onGenerate={handleGenerate}
                isGenerating={!canGenerate}
                showOptionsButton={false}
              />
            </>
          )}
        </View>
      </SafeAreaView>

      {/* ── Info modal ── */}
      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How to use Draw Mode</Text>
            <Text style={styles.infoBody}>
              {`1. Select a makeup or hair type from the pills below.\n\n`}
              {`2. Draw on the image to mark the areas you want the AI to modify.\n\n`}
              {`3. Use the ⚙ icon on a pill to choose presets for that makeup type.\n\n`}
              {`4. Pinch to zoom in for precision. Double-tap to reset.\n\n`}
              {`5. Tap Generate — the AI will apply your selected styles to the marked areas only.\n\n`}
              {`6. Tap Save to store your drawing and selections as a reusable template.`}
            </Text>
            <TouchableOpacity style={styles.infoClose} onPress={() => setInfoVisible(false)}>
              <Text style={styles.infoCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Template browser ── */}
      <BottomSheet
        visible={templateBrowserVisible}
        onClose={() => setTemplateBrowserVisible(false)}
        title="Saved Templates"
      >
        {loadingTemplates ? (
          <Text style={styles.templateEmpty}>Loading…</Text>
        ) : templates.length === 0 ? (
          <Text style={styles.templateEmpty}>No saved templates for this image yet.</Text>
        ) : (
          templates.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.templateRow}
              onPress={() => handleLoadTemplate(t)}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    root: {
      flex: 1,
      position: 'relative',
      paddingBottom: spacing.massive, // room for floating CreatorBar
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    // Controls row
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      gap: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    controlButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.sm,
    },
    controlButtonDisabled: {
      opacity: 0.35,
    },
    controlSpacer: {
      flex: 1,
    },
    // Canvas
    canvasContainer: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: colors.backgroundTertiary,
    },
    zoomHint: {
      position: 'absolute',
      bottom: spacing.sm,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
    },
    zoomHintText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
    },
    // Stroke width
    strokeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    strokeButton: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    strokeDot: {},
    // Makeup pills
    pillScroll: {
      flexShrink: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    pillScrollContent: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.round,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      backgroundColor: colors.backgroundSecondary,
      paddingLeft: spacing.sm,
      paddingRight: spacing.xs,
      height: 36,
    },
    pillBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pillDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    pillLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    pillSettingsButton: {
      width: 24,
      height: 24,
      marginLeft: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Info modal
    infoOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    infoCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      ...shadows.md,
    },
    infoTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    infoBody: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    infoClose: {
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.round,
    },
    infoCloseText: {
      color: colors.white,
      fontWeight: typography.fontWeight.semibold,
      fontSize: typography.fontSize.sm,
    },
    // Template browser
    templateEmpty: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      textAlign: 'center',
      padding: spacing.xl,
    },
    templateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    templateThumb: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
    },
    templateInfo: {
      flex: 1,
    },
    templateDate: {
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    templateName: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
