/**
 * HeadshotDrawingCanvas (native)
 * Skia-based drawing overlay for the Hair & Make-Up Draw Mode modal.
 * Renders absolutely on top of the headshot image.
 *
 * Features:
 *  - Undo / redo / clear via imperative ref
 *  - Variable stroke width
 *  - Touch coordinates are inverse-transformed so strokes land correctly
 *    when the parent view is zoomed/panned (pass scale + translateX/Y)
 *  - makeMaskSnapshot() captures at 1:1 canvas resolution (no zoom applied)
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
  type SkPath,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { HeadshotDrawingCanvasRef, HeadshotDrawingCanvasProps } from './HeadshotDrawingCanvas';

type Stroke = {
  path: SkPath;
  color: string;
  strokeWidth: number;
};

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps & {
    /** Current zoom scale from the parent's pinch gesture (default 1). */
    viewScale?: number;
    /** Current pan offset X from the parent's pan gesture (default 0). */
    viewTranslateX?: number;
    /** Current pan offset Y from the parent's pan gesture (default 0). */
    viewTranslateY?: number;
  }
>(({ drawingEnabled, currentColor, strokeWidth = 12, onStrokeChange, viewScale = 1, viewTranslateX = 0, viewTranslateY = 0 }, ref) => {
  const canvasRef = useCanvasRef();
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [maskMode, setMaskMode] = useState(false);

  const activePathRef = useRef<SkPath | null>(null);
  const activeColorRef = useRef<string>(currentColor);
  const activeWidthRef = useRef<number>(strokeWidth);

  // Keep refs current so gesture callbacks always see the latest values
  activeColorRef.current = currentColor;
  activeWidthRef.current = strokeWidth;

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

  useImperativeHandle(ref, () => ({
    makeMaskSnapshot: async (): Promise<string | null> => {
      setMaskMode(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      const image = canvasRef.current?.makeImageSnapshot();
      setMaskMode(false);
      if (!image) return null;
      return image.encodeToBase64();
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
    get canUndo() { return completedStrokes.length > 0; },
    get canRedo() { return undoneStrokes.length > 0; },
    get hasStrokes() { return completedStrokes.length > 0; },
  }));

  /**
   * Convert a screen-space touch coordinate to canvas space,
   * accounting for the parent's zoom scale and pan translation.
   */
  const toCanvasCoord = (screenX: number, screenY: number): { x: number; y: number } => {
    return {
      x: (screenX - viewTranslateX) / viewScale,
      y: (screenY - viewTranslateY) / viewScale,
    };
  };

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(drawingEnabled)
    .minDistance(0)
    .onBegin((e) => {
      const { x, y } = toCanvasCoord(e.x, e.y);
      const path = Skia.Path.Make();
      path.moveTo(x, y);
      activePathRef.current = path;
      setCurrentStroke({ path, color: activeColorRef.current, strokeWidth: activeWidthRef.current });
    })
    .onUpdate((e) => {
      if (!activePathRef.current) return;
      const { x, y } = toCanvasCoord(e.x, e.y);
      activePathRef.current.lineTo(x, y);
      setCurrentStroke({ path: activePathRef.current, color: activeColorRef.current, strokeWidth: activeWidthRef.current });
    })
    .onEnd(() => {
      if (activePathRef.current) {
        const finished: Stroke = {
          path: activePathRef.current,
          color: activeColorRef.current,
          strokeWidth: activeWidthRef.current,
        };
        // Adding a new stroke resets the redo stack (standard undo/redo behaviour)
        setUndoneStrokes([]);
        setCompletedStrokes((prev) => [...prev, finished]);
      }
      activePathRef.current = null;
      setCurrentStroke(null);
    });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[StyleSheet.absoluteFill, !drawingEnabled && { opacity: 0 }]}
        pointerEvents={drawingEnabled ? 'auto' : 'none'}
      >
        <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
          {maskMode && <Fill color="#000000" />}

          {completedStrokes.map((stroke, index) => (
            <Path
              key={index}
              path={stroke.path}
              color={stroke.color}
              style="stroke"
              strokeWidth={stroke.strokeWidth}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}

          {currentStroke && (
            <Path
              path={currentStroke.path}
              color={currentStroke.color}
              style="stroke"
              strokeWidth={currentStroke.strokeWidth}
              strokeCap="round"
              strokeJoin="round"
            />
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
});

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

export default HeadshotDrawingCanvas;
