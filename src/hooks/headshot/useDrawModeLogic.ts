/**
 * useDrawModeLogic
 * Shared state, gestures and handlers for DrawModeModal and DrawModeInline.
 *
 * The only behavioural difference between the two variants is whether
 * onClose() is called after the user taps Generate:
 *   - Modal variant: pass onClose → generate dismisses the modal
 *   - Inline variant: omit onClose → user stays in draw mode
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import type React from 'react';

import { supabase } from '@/lib/supabase';
import { uploadBase64ImageToStorage } from '@/lib/utils/image-helpers';
import {
  saveDrawingTemplate,
  listDrawingTemplates,
  type HeadshotDrawingTemplate,
} from '@/lib/headshot/drawingTemplates';
import { DRAW_COLOUR_ORDER, getDrawColour } from '@/lib/headshot/drawingColors';
import type { HeadshotDrawingCanvasRef, DrawnColorEntry } from '@/components/headshots/HeadshotDrawingCanvas';
import type { SelectionPill } from '@/components/headshots/HeadshotCreatorContainer';

export type ColorSettings = {
  categoryId?: string;
  customPrompt?: string;
};

export type UseDrawModeLogicParams = {
  previewImageUrl: string | null;
  baseImageId: string | null;
  userId: string | null;
  creatorSelections: SelectionPill[];
  hasSelections: boolean;
  generating: boolean;
  drawingCanvasRef: React.RefObject<HeadshotDrawingCanvasRef>;
  canvasWidth: number;
  canvasHeight: number;
  onGenerate: (maskBase64: string | null, colorMap: DrawnColorEntry[]) => void;
  onApplyTemplateSelections?: (snapshot: {
    hairPresetIds: string[];
    makeupPresetIds: string[];
    customDescription?: string;
  }) => void;
  /** Called after generate. Provide in Modal variant; omit in Inline variant. */
  onClose?: () => void;
};

export function useDrawModeLogic({
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
  onClose,
}: UseDrawModeLogicParams) {
  // --- Draw state ---
  const [activeColor, setActiveColor] = useState<string>(getDrawColour(DRAW_COLOUR_ORDER[0]));
  const [colorSettings, setColorSettings] = useState<Record<string, ColorSettings>>({});
  const [drawnColorHexes, setDrawnColorHexes] = useState<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // --- Overlay state ---
  const [infoVisible, setInfoVisible] = useState(false);
  const [templateBrowserVisible, setTemplateBrowserVisible] = useState(false);
  const [templates, setTemplates] = useState<HeadshotDrawingTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateMaskUrl, setTemplateMaskUrl] = useState<string | null>(null);

  // --- Zoom / pan (Reanimated shared values) ---
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
  }, [scale, savedScale, translateX, savedTranslateX, translateY, savedTranslateY]);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ] as any,
  }));

  // --- Gestures ---
  // 1-finger pan → draws on the canvas
  const drawGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => drawingCanvasRef.current?.handleDrawBegin(e.x, e.y))
    .onUpdate((e) => drawingCanvasRef.current?.handleDrawUpdate(e.x, e.y))
    .onEnd(() => drawingCanvasRef.current?.handleDrawEnd())
    .onFinalize(() => drawingCanvasRef.current?.handleDrawEnd());

  // 2-finger pinch → zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // 2-finger pan → move when zoomed
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

  // Double-tap → reset zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => resetZoom());

  const allGestures = Gesture.Simultaneous(
    drawGesture,
    pinchGesture,
    panZoomGesture,
    doubleTapGesture,
  );

  // --- Stroke change callback (fired by the canvas) ---
  const handleStrokeChange = useCallback(
    (nextHasStrokes: boolean, nextCanUndo: boolean, nextCanRedo: boolean) => {
      setHasStrokes(nextHasStrokes);
      setCanUndo(nextCanUndo);
      setCanRedo(nextCanRedo);
      const drawn = drawingCanvasRef.current?.getDrawnColorMap() ?? [];
      setDrawnColorHexes(drawn.map((e) => e.hex));
    },
    [drawingCanvasRef],
  );

  // --- Undo / redo / clear ---
  const handleUndo = () => drawingCanvasRef.current?.undo();
  const handleRedo = () => drawingCanvasRef.current?.redo();
  const handleClear = () => {
    drawingCanvasRef.current?.clear();
    setTemplateMaskUrl(null);
    setDrawnColorHexes([]);
  };

  /**
   * Reset all local draw state back to defaults.
   * Called by DrawModeModal when the modal closes (visible → false).
   */
  const resetState = useCallback(() => {
    setTemplateMaskUrl(null);
    setColorSettings({});
    setDrawnColorHexes([]);
    setActiveColor(getDrawColour(DRAW_COLOUR_ORDER[0]));
  }, []);

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
        bucket, path, maskBase64, 'image/png',
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
          DRAW_COLOUR_ORDER.map((id) => [id, getDrawColour(id)]),
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

  // --- Template browser ---
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
    if (onApplyTemplateSelections && template.prompt_snapshot_json) {
      onApplyTemplateSelections({
        hairPresetIds: template.prompt_snapshot_json.hairPresetIds ?? [],
        makeupPresetIds: template.prompt_snapshot_json.makeupPresetIds ?? [],
        customDescription: template.prompt_snapshot_json.customDescription,
      });
    }
    setTemplateBrowserVisible(false);
  };

  // --- Color settings ---
  const toggleCategoryForColor = (categoryId: string, hex: string) => {
    setColorSettings((prev) => {
      const current = prev[hex] ?? {};
      return {
        ...prev,
        [hex]: {
          ...current,
          categoryId: current.categoryId === categoryId ? undefined : categoryId,
        },
      };
    });
  };

  const handlePromptChange = (hex: string, text: string) => {
    setColorSettings((prev) => ({
      ...prev,
      [hex]: { ...prev[hex], customPrompt: text },
    }));
  };

  // --- Generate ---
  const canGenerate = (hasSelections || hasStrokes) && !generating && !capturing;
  const generateLabel = capturing
    ? 'Capturing…'
    : generating
    ? 'Generating…'
    : `Generate${creatorSelections.length > 0 ? ` (${creatorSelections.length})` : ''}`;

  const handleGenerate = async () => {
    setCapturing(true);
    let compositeBase64: string | null = null;

    if (hasStrokes && previewImageUrl) {
      try {
        const bgBase64 = await new Promise<string>((resolve, reject) => {
          fetch(previewImageUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
            .catch(reject);
        });
        compositeBase64 =
          (await drawingCanvasRef.current?.makeCompositeSnapshot(bgBase64, canvasWidth, canvasHeight)) ?? null;
      } catch (e) {
        console.warn('[DrawMode] Composite failed, falling back to mask-only', e);
        compositeBase64 = (await drawingCanvasRef.current?.makeMaskSnapshot()) ?? null;
      }
    } else if (hasStrokes) {
      compositeBase64 = (await drawingCanvasRef.current?.makeMaskSnapshot()) ?? null;
    }

    const drawnColors = drawingCanvasRef.current?.getDrawnColorMap() ?? [];
    const colorMap: DrawnColorEntry[] = drawnColors.map((entry) => ({
      ...entry,
      categoryId: colorSettings[entry.hex]?.categoryId,
      customPrompt: colorSettings[entry.hex]?.customPrompt,
    }));

    setCapturing(false);
    onGenerate(compositeBase64, colorMap);
    onClose?.();
  };

  return {
    // Draw state
    activeColor,
    setActiveColor,
    colorSettings,
    drawnColorHexes,
    canUndo,
    canRedo,
    hasStrokes,
    capturing,
    // Overlay state
    infoVisible,
    setInfoVisible,
    templateBrowserVisible,
    setTemplateBrowserVisible,
    templates,
    loadingTemplates,
    saving,
    templateMaskUrl,
    // Zoom/pan (shared values needed by HeadshotDrawingCanvas)
    scale,
    translateX,
    translateY,
    animatedCanvasStyle,
    resetZoom,
    // Gestures
    allGestures,
    // Handlers
    handleStrokeChange,
    handleUndo,
    handleRedo,
    handleClear,
    handleSave,
    handleOpenTemplateBrowser,
    handleLoadTemplate,
    toggleCategoryForColor,
    handlePromptChange,
    handleGenerate,
    resetState,
    // Derived
    canGenerate,
    generateLabel,
  };
}
