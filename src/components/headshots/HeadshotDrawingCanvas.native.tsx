/**
 * HeadshotDrawingCanvas (native)
 * Skia-based drawing overlay for the Hair & Make-Up headshot preview.
 * Renders absolutely on top of the HeadshotSlideItem image.
 * Exposes `makeMaskSnapshot()` via forwardRef to capture the drawn mask.
 *
 * This file is loaded on iOS/Android only. The web stub lives in
 * HeadshotDrawingCanvas.tsx.
 */

import React, { useRef, useState, useImperativeHandle } from 'react';
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

export type HeadshotDrawingCanvasRef = {
  makeMaskSnapshot: () => Promise<string | null>;
};

type HeadshotDrawingCanvasProps = {
  drawingEnabled: boolean;
  currentColor: string;
};

type Stroke = {
  path: SkPath;
  color: string;
};

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps
>(({ drawingEnabled, currentColor }, ref) => {
  const canvasRef = useCanvasRef();
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [maskMode, setMaskMode] = useState(false);

  // Refs for the in-progress path — mutated on JS thread inside gesture callbacks
  const activePathRef = useRef<SkPath | null>(null);
  const activeColorRef = useRef<string>(currentColor);

  // Keep color ref up to date so gesture callbacks always see the latest color
  activeColorRef.current = currentColor;

  useImperativeHandle(ref, () => ({
    makeMaskSnapshot: async (): Promise<string | null> => {
      // Switch to mask mode: black background + strokes only (no photo)
      setMaskMode(true);
      // Wait for the state update to propagate to the canvas
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      const image = canvasRef.current?.makeImageSnapshot();
      setMaskMode(false);
      if (!image) return null;
      return image.encodeToBase64();
    },
  }));

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(drawingEnabled)
    .minDistance(0)
    .onBegin((e) => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      activePathRef.current = path;
      setCurrentStroke({ path, color: activeColorRef.current });
    })
    .onUpdate((e) => {
      if (!activePathRef.current) return;
      activePathRef.current.lineTo(e.x, e.y);
      // Create a new object reference so React re-renders the canvas.
      // The path object itself is mutated; Skia reads it at draw time.
      setCurrentStroke({ path: activePathRef.current, color: activeColorRef.current });
    })
    .onEnd(() => {
      if (activePathRef.current) {
        const finished: Stroke = {
          path: activePathRef.current,
          color: activeColorRef.current,
        };
        setCompletedStrokes((prev) => [...prev, finished]);
      }
      activePathRef.current = null;
      setCurrentStroke(null);
    });

  return (
    <GestureDetector gesture={gesture}>
      {/* Intermediate View needed for reliable touch routing between GestureDetector and Skia Canvas */}
      <View style={StyleSheet.absoluteFill}>
        <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
          {/* Black background only shown during snapshot capture */}
          {maskMode && <Fill color="#000000" />}

          {/* Completed strokes */}
          {completedStrokes.map((stroke, index) => (
            <Path
              key={index}
              path={stroke.path}
              color={stroke.color}
              style="stroke"
              strokeWidth={12}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}

          {/* In-progress stroke */}
          {currentStroke && (
            <Path
              path={currentStroke.path}
              color={currentStroke.color}
              style="stroke"
              strokeWidth={12}
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
