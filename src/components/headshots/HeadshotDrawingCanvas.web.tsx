/**
 * HeadshotDrawingCanvas (web)
 * HTML5 Canvas implementation for Draw Mode.
 * On native, Metro resolves HeadshotDrawingCanvas.native.tsx instead.
 *
 * Performance: in-progress strokes are tracked via refs and drawn with
 * requestAnimationFrame to avoid React re-renders on every pointer move.
 * State is only committed on stroke completion for undo/redo.
 */

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type {
  DrawnColorEntry,
  HeadshotDrawingCanvasProps,
  HeadshotDrawingCanvasRef,
} from './HeadshotDrawingCanvas';
import { DRAW_COLOUR_MAP } from '@/lib/headshot/drawingColors';

const FIXED_STROKE_WIDTH = 4;

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function dataUrlToBase64(dataUrl: string): string | null {
  const idx = dataUrl.indexOf(',');
  return idx < 0 ? null : dataUrl.slice(idx + 1);
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scaleX = 1,
  scaleY = 1,
) {
  if (stroke.points.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = FIXED_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    ctx.beginPath();
    ctx.arc(p.x * scaleX, p.y * scaleY, FIXED_STROKE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
  }
  ctx.stroke();
}

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps
>(({ drawingEnabled, currentColor, onStrokeChange, viewScale, viewTranslateX, viewTranslateY }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeColorRef = useRef(currentColor);
  const sizeRef = useRef({ width: 0, height: 0 });

  // Completed strokes live in state (triggers re-render for undo/redo UI)
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);

  // In-progress stroke lives in a ref — no re-renders during drawing
  const activeStrokeRef = useRef<Stroke | null>(null);
  const rafIdRef = useRef<number>(0);

  activeColorRef.current = currentColor;

  const toCanvasCoord = useCallback(
    (x: number, y: number): Point => {
      const s = clamp(viewScale?.value ?? 1, 1, 4);
      const tx = viewTranslateX?.value ?? 0;
      const ty = viewTranslateY?.value ?? 0;
      return { x: (x - tx) / s, y: (y - ty) / s };
    },
    [viewScale, viewTranslateX, viewTranslateY],
  );

  // Full redraw: completed strokes + active stroke
  const redraw = useCallback((strokes: Stroke[], active: Stroke | null) => {
    const canvas = canvasRef.current;
    const { width, height } = sizeRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (active) drawStroke(ctx, active);
  }, []);

  // Schedule a single rAF repaint (coalesces rapid pointer events)
  const scheduleRedraw = useCallback(() => {
    if (rafIdRef.current) return; // already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      redraw(completedStrokes, activeStrokeRef.current);
    });
  }, [completedStrokes, redraw]);

  // Redraw when completed strokes change (undo/redo/clear)
  useEffect(() => {
    redraw(completedStrokes, activeStrokeRef.current);
  }, [completedStrokes, redraw]);

  // Notify parent of stroke state changes
  useEffect(() => {
    onStrokeChange?.(completedStrokes.length > 0, completedStrokes.length > 0, undoneStrokes.length > 0);
  }, [completedStrokes, undoneStrokes, onStrokeChange]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const w = Math.max(1, Math.round(event.nativeEvent.layout.width));
    const h = Math.max(1, Math.round(event.nativeEvent.layout.height));
    sizeRef.current = { width: w, height: h };

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    redraw(completedStrokes, activeStrokeRef.current);
  }, [completedStrokes, redraw]);

  useImperativeHandle(ref, () => ({
    getDrawnColorMap: (): DrawnColorEntry[] => {
      const seen = new Set<string>();
      const result: DrawnColorEntry[] = [];
      for (const stroke of completedStrokes) {
        if (seen.has(stroke.color)) continue;
        seen.add(stroke.color);
        const entry = Object.values(DRAW_COLOUR_MAP).find((item) => item.colour === stroke.color);
        result.push({ hex: stroke.color, label: entry?.label ?? stroke.color });
      }
      return result;
    },

    makeMaskSnapshot: async (): Promise<string | null> => {
      if (completedStrokes.length === 0 || typeof document === 'undefined') return null;
      const { width, height } = sizeRef.current;
      if (width <= 0 || height <= 0) return null;

      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      for (const stroke of completedStrokes) drawStroke(ctx, stroke);
      return dataUrlToBase64(offscreen.toDataURL('image/png'));
    },

    makeCompositeSnapshot: async (bgBase64: string, width: number, height: number): Promise<string | null> => {
      if (completedStrokes.length === 0 || typeof document === 'undefined') return null;
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      const { width: srcW, height: srcH } = sizeRef.current;
      if (srcW <= 0 || srcH <= 0) return null;

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      const bgSrc = bgBase64.startsWith('data:') ? bgBase64 : `data:image/png;base64,${bgBase64}`;

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, w, h); resolve(); };
        img.onerror = () => reject(new Error('Unable to decode background image'));
        img.src = bgSrc;
      });

      const scaleX = w / srcW;
      const scaleY = h / srcH;
      for (const stroke of completedStrokes) drawStroke(ctx, stroke, scaleX, scaleY);
      return dataUrlToBase64(offscreen.toDataURL('image/png'));
    },

    undo: () => {
      setCompletedStrokes((prev) => {
        if (prev.length === 0) return prev;
        setUndoneStrokes((undone) => [...undone, prev[prev.length - 1]]);
        return prev.slice(0, -1);
      });
    },

    redo: () => {
      setUndoneStrokes((prev) => {
        if (prev.length === 0) return prev;
        setCompletedStrokes((completed) => [...completed, prev[prev.length - 1]]);
        return prev.slice(0, -1);
      });
    },

    clear: () => {
      setCompletedStrokes([]);
      setUndoneStrokes([]);
      activeStrokeRef.current = null;
    },

    clearColor: (hex: string) => {
      setCompletedStrokes((prev) => prev.filter((s) => s.color !== hex));
      setUndoneStrokes((prev) => prev.filter((s) => s.color !== hex));
      if (activeStrokeRef.current?.color === hex) activeStrokeRef.current = null;
    },

    get canUndo() { return completedStrokes.length > 0; },
    get canRedo() { return undoneStrokes.length > 0; },
    get hasStrokes() { return completedStrokes.length > 0; },

    handleDrawBegin: (x: number, y: number) => {
      if (!drawingEnabled) return;
      activeStrokeRef.current = { points: [toCanvasCoord(x, y)], color: activeColorRef.current };
      scheduleRedraw();
    },

    handleDrawUpdate: (x: number, y: number) => {
      if (!drawingEnabled || !activeStrokeRef.current) return;
      activeStrokeRef.current.points.push(toCanvasCoord(x, y));
      scheduleRedraw();
    },

    handleDrawEnd: () => {
      const stroke = activeStrokeRef.current;
      activeStrokeRef.current = null;
      if (!stroke || stroke.points.length === 0) return;
      setUndoneStrokes([]);
      setCompletedStrokes((prev) => [...prev, stroke]);
    },
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }}
      />
    </View>
  );
});

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

export default HeadshotDrawingCanvas;
