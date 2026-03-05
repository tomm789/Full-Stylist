/**
 * Clothing Grid Generator (Web)
 * Creates a 3:4 portrait aspect ratio grid of clothing items for AI outfit rendering
 */

import { trimImageWhitespace } from './canvasTrimmer';

interface GridLayout {
  cols: number;
  rows: number;
}

interface ItemLayout {
  centerX?: number;
  centerY?: number;
  scale?: number;
  zIndex?: number;
}

interface GridOptions {
  itemIds?: string[] | null;
  layoutByItemId?: Record<string, ItemLayout> | null;
}

/**
 * Calculates optimal grid dimensions for a given number of items.
 */
function calculateGridLayout(itemCount: number): GridLayout {
  if (itemCount <= 0) return { cols: 1, rows: 1 };
  if (itemCount === 1) return { cols: 1, rows: 1 };
  if (itemCount === 2) return { cols: 2, rows: 1 };
  if (itemCount <= 4) return { cols: 2, rows: 2 };
  if (itemCount <= 6) return { cols: 2, rows: 3 };
  if (itemCount <= 9) return { cols: 3, rows: 3 };
  if (itemCount <= 12) return { cols: 3, rows: 4 };

  const cols = Math.ceil(Math.sqrt(itemCount));
  const rows = Math.ceil(itemCount / cols);
  return { cols, rows };
}

/**
 * Creates a composite grid image of clothing items with a fixed 3:4 portrait aspect ratio.
 * Images are arranged in a grid layout on a white background, with each image resized
 * to "contain" within its grid cell (no cropping, centered).
 */
export async function generateClothingGrid(
  imageUrls: string[],
  options: GridOptions = {}
): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('generateClothingGrid requires DOM canvas APIs (web only)');
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided for grid generation');
  }

  const CANVAS_WIDTH = 1536;
  const CANVAS_HEIGHT = 2048;
  const BACKGROUND_COLOR = '#FFFFFF';
  const PADDING = 20;

  if (__DEV__) console.log(`[generateClothingGrid] Creating grid for ${imageUrls.length} items`);

  const { cols, rows } = calculateGridLayout(imageUrls.length);
  if (__DEV__) console.log(`[generateClothingGrid] Grid layout: ${cols}x${rows}`);

  const totalPaddingWidth = (cols - 1) * PADDING;
  const totalPaddingHeight = (rows - 1) * PADDING;
  const cellWidth = Math.floor((CANVAS_WIDTH - totalPaddingWidth) / cols);
  const cellHeight = Math.floor((CANVAS_HEIGHT - totalPaddingHeight) / rows);

  if (__DEV__) console.log(`[generateClothingGrid] Cell dimensions: ${cellWidth}x${cellHeight}`);

  // Load all images
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        if (__DEV__) console.log(`[generateClothingGrid] Loaded image ${i + 1}/${imageUrls.length}: ${image.width}x${image.height}`);
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error(`Failed to load image ${i + 1}: ${imageUrls[i]}`));
      };
      image.src = imageUrls[i];
    });
    images.push(img);
  }

  // Pre-process: Trim whitespace
  if (__DEV__) console.log(`[generateClothingGrid] Trimming whitespace from ${images.length} images...`);
  const trimmedCanvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < images.length; i++) {
    const trimmedCanvas = await trimImageWhitespace(images[i], 15, false);
    trimmedCanvases.push(trimmedCanvas);
    if (__DEV__) console.log(`[generateClothingGrid] Trimmed image ${i + 1}/${images.length}: ${trimmedCanvas.width}x${trimmedCanvas.height}`);
  }

  // Create the canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context for grid generation');
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const SAFETY_MARGIN = 1.0;
  const { itemIds = null, layoutByItemId = null } = options;
  const hasCustomLayout =
    !!layoutByItemId &&
    !!itemIds &&
    Array.isArray(itemIds) &&
    itemIds.length === trimmedCanvases.length;

  const getDefaultCenter = (index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      centerX: (col * (cellWidth + PADDING) + cellWidth / 2) / CANVAS_WIDTH,
      centerY: (row * (cellHeight + PADDING) + cellHeight / 2) / CANVAS_HEIGHT,
    };
  };

  if (hasCustomLayout) {
    const layeredItems = trimmedCanvases.map((trimmedCanvas, index) => {
      const itemId = itemIds![index];
      const customLayout = layoutByItemId![itemId] || null;
      return {
        trimmedCanvas,
        index,
        layout: customLayout,
        zIndex: typeof customLayout?.zIndex === 'number' ? customLayout.zIndex : index,
      };
    });

    layeredItems.sort((a, b) => a.zIndex - b.zIndex);

    for (const entry of layeredItems) {
      const trimmedCanvas = entry.trimmedCanvas;
      const trimmedWidth = trimmedCanvas.width;
      const trimmedHeight = trimmedCanvas.height;
      const defaultCenter = getDefaultCenter(entry.index);
      const centerX = Math.max(0.05, Math.min(0.95, entry.layout?.centerX ?? defaultCenter.centerX));
      const centerY = Math.max(0.05, Math.min(0.95, entry.layout?.centerY ?? defaultCenter.centerY));
      const userScale = Math.max(0.55, Math.min(2.2, entry.layout?.scale ?? 1));

      const baseScale = Math.min(cellWidth / trimmedWidth, cellHeight / trimmedHeight) * SAFETY_MARGIN;
      const scale = baseScale * userScale;
      const dstWidth = trimmedWidth * scale;
      const dstHeight = trimmedHeight * scale;

      const x = centerX * CANVAS_WIDTH - dstWidth / 2;
      const y = centerY * CANVAS_HEIGHT - dstHeight / 2;

      ctx.drawImage(trimmedCanvas, 0, 0, trimmedWidth, trimmedHeight, x, y, dstWidth, dstHeight);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64String = dataUrl.split(',')[1];
    if (__DEV__) console.log(`[generateClothingGrid] Custom-layout canvas created, base64 length: ${base64String.length}`);
    return base64String;
  }

  for (let i = 0; i < trimmedCanvases.length; i++) {
    const trimmedCanvas = trimmedCanvases[i];
    const trimmedWidth = trimmedCanvas.width;
    const trimmedHeight = trimmedCanvas.height;

    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = col * (cellWidth + PADDING);
    const cellY = row * (cellHeight + PADDING);

    const scale = Math.min(cellWidth / trimmedWidth, cellHeight / trimmedHeight) * SAFETY_MARGIN;
    const dstWidth = trimmedWidth * scale;
    const dstHeight = trimmedHeight * scale;

    const x = cellX + (cellWidth - dstWidth) / 2;
    const y = cellY + (cellHeight - dstHeight) / 2;

    if (__DEV__) console.log(`[generateClothingGrid] Drawing trimmed item ${i + 1} at (${col}, ${row}) -> (${x.toFixed(0)}, ${y.toFixed(0)}), size: ${dstWidth.toFixed(0)}x${dstHeight.toFixed(0)} (from ${trimmedWidth}x${trimmedHeight}, scale=${scale.toFixed(2)})`);

    ctx.drawImage(trimmedCanvas, 0, 0, trimmedWidth, trimmedHeight, x, y, dstWidth, dstHeight);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  const base64String = dataUrl.split(',')[1];

  if (__DEV__) console.log(`[generateClothingGrid] Grid canvas created, base64 length: ${base64String.length}`);

  return base64String;
}
