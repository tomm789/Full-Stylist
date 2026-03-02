export type OutfitCanvasItemLayout = {
  centerX: number;
  centerY: number;
  scale: number;
  zIndex: number;
};

export type OutfitCanvasLayoutMap = Record<string, OutfitCanvasItemLayout>;

export type OutfitCanvasTrimBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OutfitCanvasTrimMetadata = {
  bounds: OutfitCanvasTrimBounds;
  trimWidthRatio: number;
  trimHeightRatio: number;
  aspectRatioAfterTrim: number;
};

export type OutfitCanvasTrimMap = Record<string, OutfitCanvasTrimMetadata>;
export type OutfitCanvasTrimStatus = 'idle' | 'pending' | 'success' | 'failed';
export type OutfitCanvasTrimStatusMap = Record<string, OutfitCanvasTrimStatus>;

export const OUTFIT_CANVAS_MIN_SCALE = 0.55;
export const OUTFIT_CANVAS_MAX_SCALE = 2.2;

export function calculateGridLayout(itemCount: number): { cols: number; rows: number } {
  if (itemCount <= 1) return { cols: 1, rows: 1 };
  if (itemCount === 2) return { cols: 2, rows: 1 };
  if (itemCount <= 4) return { cols: 2, rows: 2 };
  if (itemCount <= 6) return { cols: 2, rows: 3 };
  if (itemCount <= 9) return { cols: 3, rows: 3 };
  if (itemCount <= 12) return { cols: 3, rows: 4 };
  const cols = Math.ceil(Math.sqrt(itemCount));
  return { cols, rows: Math.ceil(itemCount / cols) };
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const clampCanvasCenter = (value: number) => clamp(value, 0.05, 0.95);
export const clampCanvasScale = (value: number) =>
  clamp(value, OUTFIT_CANVAS_MIN_SCALE, OUTFIT_CANVAS_MAX_SCALE);

export function getDefaultOutfitCanvasLayout(
  index: number,
  total: number
): OutfitCanvasItemLayout {
  const { cols, rows } = calculateGridLayout(Math.max(total, 1));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const centerX = (col + 0.5) / cols;
  const centerY = (row + 0.5) / rows;

  return {
    centerX: clampCanvasCenter(centerX),
    centerY: clampCanvasCenter(centerY),
    scale: 1,
    zIndex: index,
  };
}
