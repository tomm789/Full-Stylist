/**
 * HeadshotDrawingCanvas (web stub)
 * Skia is not supported on web — this stub satisfies the import on web
 * while the real implementation lives in HeadshotDrawingCanvas.native.tsx.
 * Metro picks the .native.tsx file on iOS/Android automatically.
 */

import React, { useImperativeHandle } from 'react';

export type HeadshotDrawingCanvasRef = {
  makeMaskSnapshot: () => Promise<string | null>;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasStrokes: boolean;
};

export type HeadshotDrawingCanvasProps = {
  drawingEnabled: boolean;
  currentColor: string;
  strokeWidth?: number;
  onStrokeChange?: (hasStrokes: boolean, canUndo: boolean, canRedo: boolean) => void;
};

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps
>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    makeMaskSnapshot: async () => null,
    undo: () => {},
    redo: () => {},
    clear: () => {},
    canUndo: false,
    canRedo: false,
    hasStrokes: false,
  }));
  return null;
});

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

export default HeadshotDrawingCanvas;
