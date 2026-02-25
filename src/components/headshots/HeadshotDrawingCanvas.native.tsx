/**
 * HeadshotDrawingCanvas (native)
 * Skia-based drawing overlay for the Hair & Make-Up Draw Mode modal.
 * Renders absolutely on top of the headshot image.
 *
 * Gesture handling is owned entirely by the parent (DrawModeModal), which
 * calls handleDrawBegin / handleDrawUpdate / handleDrawEnd via the imperative
 * ref. This avoids nested-GestureDetector conflicts with the zoom gestures.
 *
 * Touch coordinates are inverse-transformed so strokes land correctly when the
 * parent view is zoomed/panned (pass viewScale + viewTranslateX/Y SharedValues).
 *
 * Metro loads this file on iOS/Android. The web stub is HeadshotDrawingCanvas.tsx.
 */

import React, { useRef, useState, useImperativeHandle, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  useCanvasRef,
  Fill,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  type SkPath,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { HeadshotDrawingCanvasRef, HeadshotDrawingCanvasProps, DrawnColorEntry } from './HeadshotDrawingCanvas';
import { DRAW_COLOUR_MAP } from '@/lib/headshot/drawingColors';

const FIXED_STROKE_WIDTH = 4;

type Stroke = {
  path: SkPath;
  color: string;
};

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps & {
    /** Current zoom scale shared value from the parent's pinch gesture. */
    viewScale?: SharedValue<number>;
    /** Current pan offset X shared value from the parent's pan gesture. */
    viewTranslateX?: SharedValue<number>;
    /** Current pan offset Y shared value from the parent's pan gesture. */
    viewTranslateY?: SharedValue<number>;
  }
>(({ drawingEnabled, currentColor, onStrokeChange, viewScale, viewTranslateX, viewTranslateY }, ref) => {
  const canvasRef = useCanvasRef();
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [maskMode, setMaskMode] = useState(false);

  const activePathRef = useRef<SkPath | null>(null);
  const activeColorRef = useRef<string>(currentColor);

  // Keep ref current so draw callbacks always see the latest value
  activeColorRef.current = currentColor;

  // Notify parent whenever stroke state changes
  const notifyParent = (
    completed: Stroke[],
    undone: Stroke[],
    onStrokeChangeFn?: HeadshotDrawingCanvasProps['onStrokeChange']
  ) => {
    onStrokeChangeFn?.(completed.length > 0, completed.length > 0, undone.length > 0);
  };

  useEffect(() => {
    notifyParent(completedStrokes, undoneStrokes, onStrokeChange);
  }, [completedStrokes, undoneStrokes]);

  /**
   * Convert a coordinate in the canvas-container view space to canvas pixel
   * space, accounting for the parent's zoom scale and pan translation.
   * Reads .value from shared values — safe because draw callbacks run on JS thread.
   */
  const toCanvasCoord = (x: number, y: number): { x: number; y: number } => {
    const s  = viewScale?.value      ?? 1;
    const tx = viewTranslateX?.value ?? 0;
    const ty = viewTranslateY?.value ?? 0;
    return {
      x: (x - tx) / s,
      y: (y - ty) / s,
    };
  };

  useImperativeHandle(ref, () => ({
    getDrawnColorMap: (): DrawnColorEntry[] => {
      const seen = new Set<string>();
      const result: DrawnColorEntry[] = [];
      for (const stroke of completedStrokes) {
        if (!seen.has(stroke.color)) {
          seen.add(stroke.color);
          const entry = Object.values(DRAW_COLOUR_MAP).find((e) => e.colour === stroke.color);
          result.push({ hex: stroke.color, label: entry?.label ?? stroke.color });
        }
      }
      return result;
    },

    makeMaskSnapshot: async (): Promise<string | null> => {
      if (completedStrokes.length === 0) return null;
      setMaskMode(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      const image = canvasRef.current?.makeImageSnapshot();
      setMaskMode(false);
      if (!image) return null;
      return image.encodeToBase64();
    },

    makeCompositeSnapshot: async (bgBase64: string, width: number, height: number): Promise<string | null> => {
      if (completedStrokes.length === 0) return null;
      try {
        // Decode background image
        const data = Skia.Data.fromBase64(bgBase64);
        const bgImage = Skia.Image.MakeImageFromEncoded(data);
        if (!bgImage) return null;

        // Create off-screen surface at canvas dimensions
        const surface = Skia.Surface.Make(width, height);
        if (!surface) return null;
        const canvas = surface.getCanvas();

        // Draw background image scaled to fill surface
        const srcRect = Skia.XYWHRect(0, 0, bgImage.width(), bgImage.height());
        const dstRect = Skia.XYWHRect(0, 0, width, height);
        canvas.drawImageRect(bgImage, srcRect, dstRect, Skia.Paint());

        // Draw all strokes on top at full opacity
        for (const stroke of completedStrokes) {
          const paint = Skia.Paint();
          paint.setColor(Skia.Color(stroke.color));
          paint.setStyle(PaintStyle.Stroke);
          paint.setStrokeWidth(FIXED_STROKE_WIDTH);
          paint.setStrokeCap(StrokeCap.Round);
          paint.setStrokeJoin(StrokeJoin.Round);
          canvas.drawPath(stroke.path, paint);
        }

        return surface.makeImageSnapshot().encodeToBase64();
      } catch (e) {
        console.warn('[HeadshotDrawingCanvas] makeCompositeSnapshot failed:', e);
        return null;
      }
    },

    undo: () => {
      setCompletedStrokes((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        setUndoneStrokes((u) => [...u, last]);
        return prev.slice(0, -1);
      });
    },
    redo: () => {
      setUndoneStrokes((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        setCompletedStrokes((c) => [...c, last]);
        return prev.slice(0, -1);
      });
    },
    clear: () => {
      setCompletedStrokes([]);
      setUndoneStrokes([]);
      setCurrentStroke(null);
      activePathRef.current = null;
    },
    clearColor: (hex: string) => {
      setCompletedStrokes((prev) => prev.filter((stroke) => stroke.color !== hex));
      setUndoneStrokes((prev) => prev.filter((stroke) => stroke.color !== hex));
      setCurrentStroke((prev) => (prev?.color === hex ? null : prev));
      if (activePathRef.current && activeColorRef.current === hex) {
        activePathRef.current = null;
      }
    },
    get canUndo() { return completedStrokes.length > 0; },
    get canRedo() { return undoneStrokes.length > 0; },
    get hasStrokes() { return completedStrokes.length > 0; },

    // Called by the parent's GestureDetector — no internal gesture needed.
    handleDrawBegin: (x: number, y: number) => {
      if (!drawingEnabled) return;
      const { x: cx, y: cy } = toCanvasCoord(x, y);
      const path = Skia.Path.Make();
      path.moveTo(cx, cy);
      activePathRef.current = path;
      setCurrentStroke({ path, color: activeColorRef.current });
    },
    handleDrawUpdate: (x: number, y: number) => {
      if (!activePathRef.current) return;
      const { x: cx, y: cy } = toCanvasCoord(x, y);
      activePathRef.current.lineTo(cx, cy);
      setCurrentStroke({ path: activePathRef.current, color: activeColorRef.current });
    },
    handleDrawEnd: () => {
      if (!activePathRef.current) return;
      const finished: Stroke = {
        path: activePathRef.current,
        color: activeColorRef.current,
      };
      setUndoneStrokes([]);
      setCompletedStrokes((prev) => [...prev, finished]);
      activePathRef.current = null;
      setCurrentStroke(null);
    },
  }));

  return (
    // pointerEvents="none" — all input is handled by the parent GestureDetector.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
        {maskMode && <Fill color="#000000" />}

        {completedStrokes.map((stroke, index) => (
          <Path
            key={index}
            path={stroke.path}
            color={stroke.color}
            style="stroke"
            strokeWidth={FIXED_STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}

        {currentStroke && (
          <Path
            path={currentStroke.path}
            color={currentStroke.color}
            style="stroke"
            strokeWidth={FIXED_STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
          />
        )}
      </Canvas>
    </View>
  );
});

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

export default HeadshotDrawingCanvas;
