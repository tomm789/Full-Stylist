/**
 * HeadshotDrawingCanvas (web stub)
 * Skia is not supported on web — this stub satisfies the import on web
 * while the real implementation lives in HeadshotDrawingCanvas.native.tsx.
 * Metro picks the .native.tsx file on iOS/Android automatically.
 */

import React, { useImperativeHandle } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type DrawnColorEntry = {
  hex: string;
  label: string;
  categoryId?: string;
  customPrompt?: string;
};

export type HeadshotDrawingCanvasRef = {
  makeMaskSnapshot: () => Promise<string | null>;
  makeCompositeSnapshot: (bgBase64: string, width: number, height: number) => Promise<string | null>;
  getDrawnColorMap: () => DrawnColorEntry[];
  undo: () => void;
  redo: () => void;
  clear: () => void;
  clearColor: (hex: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasStrokes: boolean;
  handleDrawBegin: (x: number, y: number) => void;
  handleDrawUpdate: (x: number, y: number) => void;
  handleDrawEnd: () => void;
};

export type HeadshotDrawingCanvasProps = {
  drawingEnabled: boolean;
  currentColor: string;
  onStrokeChange?: (hasStrokes: boolean, canUndo: boolean, canRedo: boolean) => void;
  viewScale?: SharedValue<number>;
  viewTranslateX?: SharedValue<number>;
  viewTranslateY?: SharedValue<number>;
};

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps
>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    makeMaskSnapshot: async () => null,
    makeCompositeSnapshot: async () => null,
    getDrawnColorMap: () => [],
    undo: () => {},
    redo: () => {},
    clear: () => {},
    clearColor: () => {},
    canUndo: false,
    canRedo: false,
    hasStrokes: false,
    handleDrawBegin: () => {},
    handleDrawUpdate: () => {},
    handleDrawEnd: () => {},
  }));
  return null;
});

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

export default HeadshotDrawingCanvas;
