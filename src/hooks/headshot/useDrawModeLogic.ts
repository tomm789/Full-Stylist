/**
 * useDrawModeLogic
 * Shared state, gestures and handlers for DrawModeModal and DrawModeInline.
 *
 * The only behavioural difference between the two variants is whether
 * onClose() is called after the user taps Generate:
 *   - Modal variant: pass onClose → generate dismisses the modal
 *   - Inline variant: omit onClose → user stays in draw mode
 */

import { useState, useCallback, useRef } from 'react';
import { Alert, Keyboard, Platform } from 'react-native';
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
import type {
  HeadshotDrawingCanvasRef,
  DrawMaskMeta,
  DrawnColorEntry,
} from '@/components/headshots/HeadshotDrawingCanvas';
import type { SelectionPill } from '@/components/headshots/HeadshotCreatorContainer';

export type ColorSettings = {
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
  onGenerate: (maskBase64: string | null, colorMap: DrawnColorEntry[], maskMeta?: DrawMaskMeta) => void;
  renderContentFit?: 'cover' | 'contain';
  onApplyTemplateSelections?: (snapshot: {
    hairPresetIds: string[];
    makeupPresetIds: string[];
    customDescription?: string;
  }) => void;
  /** Called after generate. Provide in Modal variant; omit in Inline variant. */
  onClose?: () => void;
  /** When true, disable draw gesture and allow tap-to-dismiss keyboard. */
  keyboardVisible?: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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
  renderContentFit = 'cover',
  onApplyTemplateSelections,
  onClose,
  keyboardVisible = false,
}: UseDrawModeLogicParams) {
  // --- Draw state ---
  const [activeColor, setActiveColor] = useState<string>(getDrawColour(DRAW_COLOUR_ORDER[0]));
  const [colorSettings, setColorSettings] = useState<Record<string, ColorSettings>>({});
  const [drawnColorHexes, setDrawnColorHexes] = useState<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [focusPromptHex, setFocusPromptHex] = useState<string | null>(null);

  // --- Overlay state ---
  const [infoVisible, setInfoVisible] = useState(false);
  const [templateBrowserVisible, setTemplateBrowserVisible] = useState(false);
  const [templates, setTemplates] = useState<HeadshotDrawingTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateMaskUrl, setTemplateMaskUrl] = useState<string | null>(null);
  const webPointerModeRef = useRef<'idle' | 'draw' | 'pan'>('idle');
  const webPanLastRef = useRef({ x: 0, y: 0 });

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
    .enabled(!keyboardVisible)
    .onBegin((e) => drawingCanvasRef.current?.handleDrawBegin(e.x, e.y))
    .onUpdate((e) => drawingCanvasRef.current?.handleDrawUpdate(e.x, e.y))
    .onEnd(() => drawingCanvasRef.current?.handleDrawEnd())
    .onFinalize(() => drawingCanvasRef.current?.handleDrawEnd());

  // Single tap when keyboard open → dismiss keyboard (instead of drawing)
  const keyboardDismissGesture = Gesture.Tap()
    .numberOfTaps(1)
    .runOnJS(true)
    .enabled(keyboardVisible)
    .onEnd(() => Keyboard.dismiss());

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

  const allGestures = Platform.OS === 'web'
    ? keyboardDismissGesture
    : Gesture.Simultaneous(
        drawGesture,
        keyboardDismissGesture,
        pinchGesture,
        panZoomGesture,
        doubleTapGesture,
      );

  const getWebPoint = useCallback((event: any): { x: number; y: number } => {
    const native = event?.nativeEvent ?? event ?? {};
    const currentTarget = event?.currentTarget as { getBoundingClientRect?: () => DOMRect } | undefined;
    if (currentTarget?.getBoundingClientRect) {
      const rect = currentTarget.getBoundingClientRect();
      const pageX = typeof native.pageX === 'number' ? native.pageX : native.clientX;
      const pageY = typeof native.pageY === 'number' ? native.pageY : native.clientY;
      if (typeof pageX === 'number' && typeof pageY === 'number') {
        return { x: pageX - rect.left, y: pageY - rect.top };
      }
    }
    return {
      x: typeof native.locationX === 'number' ? native.locationX : 0,
      y: typeof native.locationY === 'number' ? native.locationY : 0,
    };
  }, []);

  // Web pointer handlers — only assigned when Platform.OS === 'web' (see webCanvasHandlers).
  const handleWebPointerDown = useCallback((event: any) => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }

    const native = event?.nativeEvent ?? {};
    if (typeof native.button === 'number' && native.button !== 0) return;

    const point = getWebPoint(event);
    const shouldPan = (scale.value ?? 1) > 1.01 && !native.shiftKey;

    if (shouldPan) {
      webPointerModeRef.current = 'pan';
      webPanLastRef.current = point;
      return;
    }

    webPointerModeRef.current = 'draw';
    drawingCanvasRef.current?.handleDrawBegin(point.x, point.y);
  }, [drawingCanvasRef, getWebPoint, keyboardVisible, scale]);

  const handleWebPointerMove = useCallback((event: any) => {
    const mode = webPointerModeRef.current;
    if (mode === 'idle') return;

    const point = getWebPoint(event);

    if (mode === 'draw') {
      drawingCanvasRef.current?.handleDrawUpdate(point.x, point.y);
      return;
    }

    const dx = point.x - webPanLastRef.current.x;
    const dy = point.y - webPanLastRef.current.y;
    webPanLastRef.current = point;

    translateX.value += dx;
    translateY.value += dy;
  }, [drawingCanvasRef, getWebPoint, translateX, translateY]);

  const handleWebPointerUp = useCallback(() => {
    if (webPointerModeRef.current === 'draw') {
      drawingCanvasRef.current?.handleDrawEnd();
    } else if (webPointerModeRef.current === 'pan') {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    }
    webPointerModeRef.current = 'idle';
  }, [drawingCanvasRef, savedTranslateX, savedTranslateY, translateX, translateY]);

  const handleWebWheel = useCallback((event: any) => {
    const native = event?.nativeEvent ?? {};
    const deltaY = typeof native.deltaY === 'number' ? native.deltaY : 0;
    if (!Number.isFinite(deltaY) || deltaY === 0) return;

    const deltaScale = deltaY < 0 ? 0.2 : -0.2;
    const nextScale = clamp((scale.value ?? 1) + deltaScale, 1, 4);
    scale.value = nextScale;
    savedScale.value = nextScale;

    if (nextScale <= 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }

    if (typeof event?.preventDefault === 'function') {
      event.preventDefault();
    }
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const webCanvasHandlers =
    Platform.OS === 'web'
      ? {
          onPointerDown: handleWebPointerDown,
          onPointerMove: handleWebPointerMove,
          onPointerUp: handleWebPointerUp,
          onPointerLeave: handleWebPointerUp,
          onPointerCancel: handleWebPointerUp,
          onWheel: handleWebWheel,
        }
      : undefined;

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
  const handlePromptChange = (hex: string, text: string) => {
    setColorSettings((prev) => ({
      ...prev,
      [hex]: { ...prev[hex], customPrompt: text },
    }));
  };

  // --- Generate ---
  const hasDrawnColors = drawnColorHexes.length > 0;
  const hasAnyPrompt = drawnColorHexes.some((hex) => Boolean(colorSettings[hex]?.customPrompt?.trim()));
  const canGenerate = hasDrawnColors && hasAnyPrompt && !generating && !capturing;
  const generateLabel = capturing
    ? 'Capturing…'
    : generating
    ? 'Generating…'
    : `Generate${creatorSelections.length > 0 ? ` (${creatorSelections.length})` : ''}`;

  const handleGenerate = async () => {
    const drawnColors = drawingCanvasRef.current?.getDrawnColorMap() ?? [];
    const colorMap: DrawnColorEntry[] = drawnColors.map((entry) => ({
      ...entry,
      customPrompt: colorSettings[entry.hex]?.customPrompt?.trim(),
    }));
    const missingPromptColor = colorMap.find((entry) => !entry.customPrompt);
    if (missingPromptColor) {
      Alert.alert(
        'Missing instructions',
        `You have not entered instructions for ${missingPromptColor.label}, this may generate inaccurate results. What would you like to do?`,
        [
          {
            text: 'Clear color from mask',
            style: 'destructive',
            onPress: () => {
              drawingCanvasRef.current?.clearColor(missingPromptColor.hex);
              setColorSettings((prev) => {
                const next = { ...prev };
                delete next[missingPromptColor.hex];
                return next;
              });
            },
          },
          {
            text: 'Add instructions',
            onPress: () => {
              setActiveColor(missingPromptColor.hex);
              setFocusPromptHex(missingPromptColor.hex);
            },
          },
          {
            text: 'Generate anyway',
            onPress: () => {
              void runGenerate(colorMap);
            },
          },
        ],
      );
      return;
    }

    await runGenerate(colorMap);
  };

  const runGenerate = async (colorMap: DrawnColorEntry[]) => {
    setCapturing(true);
    const maskBase64 = hasDrawnColors
      ? ((await drawingCanvasRef.current?.makeMaskSnapshot()) ?? null)
      : null;
    setCapturing(false);
    const maskMeta: DrawMaskMeta = {
      contentFit: renderContentFit,
      canvasWidth,
      canvasHeight,
    };
    onGenerate(maskBase64, colorMap, maskMeta);
    onClose?.();
  };

  return {
    // Draw state
    activeColor,
    setActiveColor,
    colorSettings,
    drawnColorHexes,
    focusPromptHex,
    setFocusPromptHex,
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
    webCanvasHandlers,
    // Handlers
    handleStrokeChange,
    handleUndo,
    handleRedo,
    handleClear,
    handleSave,
    handleOpenTemplateBrowser,
    handleLoadTemplate,
    handlePromptChange,
    handleGenerate,
    resetState,
    // Derived
    canGenerate,
    generateLabel,
  };
}
