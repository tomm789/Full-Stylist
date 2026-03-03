/**
 * HeadshotDrawingCanvas (web)
 * HTML5 Canvas implementation for Draw Mode.
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

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  points: Point[];
  color: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function dataUrlToBase64(dataUrl: string): string | null {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return null;
  return dataUrl.slice(commaIndex + 1);
}

const HeadshotDrawingCanvas = React.forwardRef<HeadshotDrawingCanvasRef, HeadshotDrawingCanvasProps>(
  ({ drawingEnabled, currentColor, onStrokeChange, viewScale, viewTranslateX, viewTranslateY }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const activeColorRef = useRef(currentColor);
    const sizeRef = useRef({ width: 0, height: 0 });

    const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
    const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

    activeColorRef.current = currentColor;

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, scaleX = 1, scaleY = 1) => {
      if (stroke.points.length === 0) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = FIXED_STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        const point = stroke.points[0];
        ctx.beginPath();
        ctx.arc(point.x * scaleX, point.y * scaleY, FIXED_STROKE_WIDTH / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
      for (let i = 1; i < stroke.points.length; i += 1) {
        const point = stroke.points[i];
        ctx.lineTo(point.x * scaleX, point.y * scaleY);
      }
      ctx.stroke();
    }, []);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      const { width, height } = sizeRef.current;
      if (!canvas || width <= 0 || height <= 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      for (const stroke of completedStrokes) {
        drawStroke(ctx, stroke);
      }

      if (currentStroke) {
        drawStroke(ctx, currentStroke);
      }
    }, [completedStrokes, currentStroke, drawStroke]);

    const toCanvasCoord = useCallback(
      (x: number, y: number): Point => {
        const s = clamp(viewScale?.value ?? 1, 1, 4);
        const tx = viewTranslateX?.value ?? 0;
        const ty = viewTranslateY?.value ?? 0;
        return {
          x: (x - tx) / s,
          y: (y - ty) / s,
        };
      },
      [viewScale, viewTranslateX, viewTranslateY],
    );

    useEffect(() => {
      redraw();
    }, [redraw]);

    useEffect(() => {
      onStrokeChange?.(completedStrokes.length > 0, completedStrokes.length > 0, undoneStrokes.length > 0);
    }, [completedStrokes, undoneStrokes, onStrokeChange]);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const width = Math.max(1, Math.round(event.nativeEvent.layout.width));
      const height = Math.max(1, Math.round(event.nativeEvent.layout.height));

      sizeRef.current = { width, height };

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = width;
      canvas.height = height;
      redraw();
    }, [redraw]);

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

        for (const stroke of completedStrokes) {
          drawStroke(ctx, stroke);
        }

        return dataUrlToBase64(offscreen.toDataURL('image/png'));
      },

      makeCompositeSnapshot: async (bgBase64: string, width: number, height: number): Promise<string | null> => {
        if (completedStrokes.length === 0 || typeof document === 'undefined') return null;

        const snapshotWidth = Math.max(1, Math.round(width));
        const snapshotHeight = Math.max(1, Math.round(height));
        const { width: sourceWidth, height: sourceHeight } = sizeRef.current;

        if (sourceWidth <= 0 || sourceHeight <= 0) return null;

        const offscreen = document.createElement('canvas');
        offscreen.width = snapshotWidth;
        offscreen.height = snapshotHeight;

        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        const backgroundSrc = bgBase64.startsWith('data:')
          ? bgBase64
          : `data:image/png;base64,${bgBase64}`;

        await new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            ctx.drawImage(image, 0, 0, snapshotWidth, snapshotHeight);
            resolve();
          };
          image.onerror = () => reject(new Error('Unable to decode background image'));
          image.src = backgroundSrc;
        });

        const scaleX = snapshotWidth / sourceWidth;
        const scaleY = snapshotHeight / sourceHeight;

        for (const stroke of completedStrokes) {
          drawStroke(ctx, stroke, scaleX, scaleY);
        }

        return dataUrlToBase64(offscreen.toDataURL('image/png'));
      },

      undo: () => {
        setCompletedStrokes((prev) => {
          if (prev.length === 0) return prev;
          const next = prev.slice(0, -1);
          const last = prev[prev.length - 1];
          setUndoneStrokes((undone) => [...undone, last]);
          return next;
        });
      },

      redo: () => {
        setUndoneStrokes((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setCompletedStrokes((completed) => [...completed, last]);
          return prev.slice(0, -1);
        });
      },

      clear: () => {
        setCompletedStrokes([]);
        setUndoneStrokes([]);
        setCurrentStroke(null);
      },

      clearColor: (hex: string) => {
        setCompletedStrokes((prev) => prev.filter((stroke) => stroke.color !== hex));
        setUndoneStrokes((prev) => prev.filter((stroke) => stroke.color !== hex));
        setCurrentStroke((prev) => (prev?.color === hex ? null : prev));
      },

      get canUndo() {
        return completedStrokes.length > 0;
      },

      get canRedo() {
        return undoneStrokes.length > 0;
      },

      get hasStrokes() {
        return completedStrokes.length > 0;
      },

      handleDrawBegin: (x: number, y: number) => {
        if (!drawingEnabled) return;
        const startPoint = toCanvasCoord(x, y);
        setCurrentStroke({ points: [startPoint], color: activeColorRef.current });
      },

      handleDrawUpdate: (x: number, y: number) => {
        if (!drawingEnabled) return;
        const nextPoint = toCanvasCoord(x, y);
        setCurrentStroke((prev) => {
          if (!prev) return prev;
          return {
            color: activeColorRef.current,
            points: [...prev.points, nextPoint],
          };
        });
      },

      handleDrawEnd: () => {
        setCurrentStroke((prev) => {
          if (!prev || prev.points.length === 0) return null;
          setUndoneStrokes([]);
          setCompletedStrokes((completed) => [...completed, prev]);
          return null;
        });
      },
    }));

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />
      </View>
    );
  },
);

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as never,
    display: 'block' as never,
  },
});

export default HeadshotDrawingCanvas;
