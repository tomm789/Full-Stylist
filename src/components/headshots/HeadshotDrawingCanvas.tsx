/**
 * HeadshotDrawingCanvas (web stub)
 * Skia is not supported on web — this stub satisfies the import on web
 * while the real implementation lives in HeadshotDrawingCanvas.native.tsx.
 * Metro picks the .native.tsx file on iOS/Android automatically.
 */

import React, { useImperativeHandle } from 'react';

export type HeadshotDrawingCanvasRef = {
  makeMaskSnapshot: () => Promise<string | null>;
};

type HeadshotDrawingCanvasProps = {
  drawingEnabled: boolean;
  currentColor: string;
};

const HeadshotDrawingCanvas = React.forwardRef<
  HeadshotDrawingCanvasRef,
  HeadshotDrawingCanvasProps
>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    makeMaskSnapshot: async () => null,
  }));
  return null;
});

HeadshotDrawingCanvas.displayName = 'HeadshotDrawingCanvas';

export default HeadshotDrawingCanvas;
