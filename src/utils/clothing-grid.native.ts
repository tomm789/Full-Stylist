/**
 * Clothing Grid Generator (Native — Skia)
 * Creates a 3:4 portrait aspect ratio grid of clothing items for AI outfit rendering.
 * Platform-specific counterpart of clothing-grid.js (web).
 *
 * Metro loads this file on iOS/Android. The web version uses HTML5 Canvas APIs.
 */

import { Skia, ImageFormat, type SkImage } from '@shopify/react-native-skia';
// Direct import of native module — TypeScript resolves to .native.ts,
// Metro resolves the same on iOS/Android at runtime.
import { trimImageWhitespace } from './canvasTrimmer.native';
import { calculateGridLayout } from '@/lib/outfits/canvasLayout';

const CANVAS_WIDTH = 1536;
const CANVAS_HEIGHT = 2048;
const PADDING = 20;
const SAFETY_MARGIN = 1.0;
const JPEG_QUALITY = 80;

// ── Image loading ───────────────────────────────────────────────────────────

async function loadSkImage(url: string): Promise<SkImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const data = Skia.Data.fromBytes(new Uint8Array(arrayBuffer));
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error(`Failed to decode image: ${url}`);
  }
  return image;
}

// ── Main grid generator ─────────────────────────────────────────────────────

interface GridOptions {
  itemIds?: string[] | null;
  layoutByItemId?: Record<string, {
    centerX?: number;
    centerY?: number;
    scale?: number;
    zIndex?: number;
  }> | null;
}

/**
 * Creates a composite grid image of clothing items with a fixed 3:4 portrait aspect ratio.
 * Images are arranged in a grid layout on a white background, with each image resized
 * to "contain" within its grid cell (no cropping, centered).
 *
 * @param imageUrls - Array of image URLs to load and composite
 * @param options - Optional custom layout overrides
 * @returns Base64 encoded JPEG string (quality 80)
 */
export async function generateClothingGrid(
  imageUrls: string[],
  options: GridOptions = {}
): Promise<string> {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided for grid generation');
  }

  console.log(`[generateClothingGrid:native] Creating grid for ${imageUrls.length} items`);

  // Calculate grid layout
  const { cols, rows } = calculateGridLayout(imageUrls.length);
  console.log(`[generateClothingGrid:native] Grid layout: ${cols}x${rows}`);

  // Calculate cell dimensions (accounting for padding)
  const totalPaddingWidth = (cols - 1) * PADDING;
  const totalPaddingHeight = (rows - 1) * PADDING;
  const cellWidth = Math.floor((CANVAS_WIDTH - totalPaddingWidth) / cols);
  const cellHeight = Math.floor((CANVAS_HEIGHT - totalPaddingHeight) / rows);

  console.log(`[generateClothingGrid:native] Cell dimensions: ${cellWidth}x${cellHeight}`);

  // Load all images in parallel
  const images = await Promise.all(
    imageUrls.map(async (url, i) => {
      const img = await loadSkImage(url);
      console.log(
        `[generateClothingGrid:native] Loaded image ${i + 1}/${imageUrls.length}: ${img.width()}x${img.height()}`
      );
      return img;
    })
  );

  // Trim whitespace from all images in parallel
  console.log(
    `[generateClothingGrid:native] Trimming whitespace from ${images.length} images...`
  );
  const trimmedImages = await Promise.all(
    images.map(async (img, i) => {
      const trimmed = await trimImageWhitespace(img, 15);
      console.log(
        `[generateClothingGrid:native] Trimmed image ${i + 1}/${images.length}: ${trimmed.width()}x${trimmed.height()}`
      );
      return trimmed;
    })
  );

  // Release original images — trimmed copies are all we need from here
  for (const img of images) {
    img.dispose();
  }

  // Create the offscreen surface
  const surface = Skia.Surface.Make(CANVAS_WIDTH, CANVAS_HEIGHT);
  if (!surface) {
    throw new Error('Failed to create Skia surface for grid generation');
  }
  const canvas = surface.getCanvas();

  // Fill with white background
  const bgPaint = Skia.Paint();
  bgPaint.setColor(Skia.Color('#FFFFFF'));
  canvas.drawRect(Skia.XYWHRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT), bgPaint);

  // Check for custom layout
  const { itemIds = null, layoutByItemId = null } = options;
  const hasCustomLayout =
    !!layoutByItemId &&
    !!itemIds &&
    Array.isArray(itemIds) &&
    itemIds.length === trimmedImages.length;

  const drawPaint = Skia.Paint();

  const getDefaultCenter = (index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      centerX: (col * (cellWidth + PADDING) + cellWidth / 2) / CANVAS_WIDTH,
      centerY: (row * (cellHeight + PADDING) + cellHeight / 2) / CANVAS_HEIGHT,
    };
  };

  if (hasCustomLayout) {
    // Custom layout: sort by zIndex and draw with user-specified positions/scales
    const layeredItems = trimmedImages.map((img, index) => {
      const itemId = itemIds![index];
      const customLayout = layoutByItemId![itemId] || null;
      return {
        image: img,
        index,
        layout: customLayout,
        zIndex: typeof customLayout?.zIndex === 'number' ? customLayout.zIndex : index,
      };
    });

    layeredItems.sort((a, b) => a.zIndex - b.zIndex);

    for (const entry of layeredItems) {
      const img = entry.image;
      const imgWidth = img.width();
      const imgHeight = img.height();
      const defaultCenter = getDefaultCenter(entry.index);

      const centerX = Math.max(0.05, Math.min(0.95, entry.layout?.centerX ?? defaultCenter.centerX));
      const centerY = Math.max(0.05, Math.min(0.95, entry.layout?.centerY ?? defaultCenter.centerY));
      const userScale = Math.max(0.55, Math.min(2.2, entry.layout?.scale ?? 1));

      const baseScale =
        Math.min(cellWidth / imgWidth, cellHeight / imgHeight) * SAFETY_MARGIN;
      const scale = baseScale * userScale;
      const dstWidth = imgWidth * scale;
      const dstHeight = imgHeight * scale;

      const x = centerX * CANVAS_WIDTH - dstWidth / 2;
      const y = centerY * CANVAS_HEIGHT - dstHeight / 2;

      const srcRect = Skia.XYWHRect(0, 0, imgWidth, imgHeight);
      const dstRect = Skia.XYWHRect(x, y, dstWidth, dstHeight);
      canvas.drawImageRect(img, srcRect, dstRect, drawPaint);
    }

    const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, JPEG_QUALITY);

    // Release trimmed images
    for (const img of trimmedImages) {
      img.dispose();
    }

    console.log(
      `[generateClothingGrid:native] Custom-layout grid created, base64 length: ${base64.length}`
    );
    return base64;
  }

  // Standard grid layout: draw each image in its grid cell
  for (let i = 0; i < trimmedImages.length; i++) {
    const img = trimmedImages[i];
    const imgWidth = img.width();
    const imgHeight = img.height();

    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = col * (cellWidth + PADDING);
    const cellY = row * (cellHeight + PADDING);

    // Scale to "contain" within cell
    const scale =
      Math.min(cellWidth / imgWidth, cellHeight / imgHeight) * SAFETY_MARGIN;
    const dstWidth = imgWidth * scale;
    const dstHeight = imgHeight * scale;

    // Center within cell
    const x = cellX + (cellWidth - dstWidth) / 2;
    const y = cellY + (cellHeight - dstHeight) / 2;

    console.log(
      `[generateClothingGrid:native] Drawing item ${i + 1} at (${col}, ${row}) -> (${x.toFixed(0)}, ${y.toFixed(0)}), size: ${dstWidth.toFixed(0)}x${dstHeight.toFixed(0)} (from ${imgWidth}x${imgHeight}, scale=${scale.toFixed(2)})`
    );

    const srcRect = Skia.XYWHRect(0, 0, imgWidth, imgHeight);
    const dstRect = Skia.XYWHRect(x, y, dstWidth, dstHeight);
    canvas.drawImageRect(img, srcRect, dstRect, drawPaint);
  }

  // Encode to JPEG base64
  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, JPEG_QUALITY);

  // Release trimmed images
  for (const img of trimmedImages) {
    img.dispose();
  }

  console.log(
    `[generateClothingGrid:native] Grid created, base64 length: ${base64.length}`
  );

  return base64;
}
