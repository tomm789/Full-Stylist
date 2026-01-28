/**
 * Clothing Grid Generator
 * Creates a 3:4 portrait aspect ratio grid of clothing items for AI outfit rendering
 */

import { trimImageWhitespace } from './canvasTrimmer';

/**
 * Calculates optimal grid dimensions for a given number of items.
 * Returns { cols, rows } that best fits the items in a 3:4 portrait canvas.
 * 
 * @param {number} itemCount - Number of items to arrange
 * @returns {{ cols: number, rows: number }} Grid dimensions
 */
function calculateGridLayout(itemCount) {
  if (itemCount <= 0) {
    return { cols: 1, rows: 1 };
  }
  
  if (itemCount === 1) {
    return { cols: 1, rows: 1 };
  }
  
  if (itemCount === 2) {
    return { cols: 2, rows: 1 }; // Side-by-side
  }
  
  if (itemCount === 3 || itemCount === 4) {
    return { cols: 2, rows: 2 };
  }
  
  if (itemCount === 5 || itemCount === 6) {
    return { cols: 2, rows: 3 };
  }
  
  if (itemCount <= 9) {
    return { cols: 3, rows: 3 };
  }
  
  if (itemCount <= 12) {
    return { cols: 3, rows: 4 };
  }
  
  // For more items, calculate based on square root approximation
  const cols = Math.ceil(Math.sqrt(itemCount));
  const rows = Math.ceil(itemCount / cols);
  return { cols, rows };
}

/**
 * Creates a composite grid image of clothing items with a fixed 3:4 portrait aspect ratio.
 * Images are arranged in a grid layout on a white background, with each image resized
 * to "contain" within its grid cell (no cropping, centered).
 * 
 * @param {string[]} imageUrls - Array of image URLs to load and composite (CORS enabled)
 * @returns {Promise<string>} Base64 encoded JPEG string (quality 0.8)
 */
export async function generateClothingGrid(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided for grid generation');
  }

  const CANVAS_WIDTH = 1536;
  const CANVAS_HEIGHT = 2048;
  const BACKGROUND_COLOR = '#FFFFFF';
  const PADDING = 20; // Padding between grid cells

  console.log(`[generateClothingGrid] Creating grid for ${imageUrls.length} items`);

  // Calculate grid layout
  const { cols, rows } = calculateGridLayout(imageUrls.length);
  console.log(`[generateClothingGrid] Grid layout: ${cols}x${rows}`);

  // Calculate cell dimensions (accounting for padding)
  const totalPaddingWidth = (cols - 1) * PADDING;
  const totalPaddingHeight = (rows - 1) * PADDING;
  const cellWidth = Math.floor((CANVAS_WIDTH - totalPaddingWidth) / cols);
  const cellHeight = Math.floor((CANVAS_HEIGHT - totalPaddingHeight) / rows);

  console.log(`[generateClothingGrid] Cell dimensions: ${cellWidth}x${cellHeight}`);

  // Load all images asynchronously
  const images = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Enable CORS
      image.onload = () => {
        console.log(`[generateClothingGrid] Loaded image ${i + 1}/${imageUrls.length}: ${image.width}x${image.height}`);
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error(`Failed to load image ${i + 1}: ${imageUrls[i]}`));
      };
      image.src = imageUrls[i];
    });
    images.push(img);
  }

  // Pre-process: Trim whitespace from all images
  console.log(`[generateClothingGrid] Trimming whitespace from ${images.length} images...`);
  const trimmedCanvases = [];
  for (let i = 0; i < images.length; i++) {
    const trimmedCanvas = await trimImageWhitespace(images[i], 15, false);
    trimmedCanvases.push(trimmedCanvas);
    console.log(`[generateClothingGrid] Trimmed image ${i + 1}/${images.length}: ${trimmedCanvas.width}x${trimmedCanvas.height}`);
  }

  // Create the canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context for grid generation');
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Fill with white background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Enable high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw each trimmed canvas in its grid cell (scaled to fill cell)
  const SAFETY_MARGIN = 1.0; // 1.0 = fill cell; use e.g. 0.9 for margin so items don't touch edges

  for (let i = 0; i < trimmedCanvases.length; i++) {
    const trimmedCanvas = trimmedCanvases[i];
    const trimmedWidth = trimmedCanvas.width;
    const trimmedHeight = trimmedCanvas.height;

    // 1. Cell dimensions (width/height of current grid cell)
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = col * (cellWidth + PADDING);
    const cellY = row * (cellHeight + PADDING);

    // 2. Scale factor: fit image to cell, then apply safety margin
    const scale = Math.min(cellWidth / trimmedWidth, cellHeight / trimmedHeight) * SAFETY_MARGIN;
    const dstWidth = trimmedWidth * scale;
    const dstHeight = trimmedHeight * scale;

    // 3. Centered coordinates within the cell
    const x = cellX + (cellWidth - dstWidth) / 2;
    const y = cellY + (cellHeight - dstHeight) / 2;

    console.log(`[generateClothingGrid] Drawing trimmed item ${i + 1} at (${col}, ${row}) -> (${x.toFixed(0)}, ${y.toFixed(0)}), size: ${dstWidth.toFixed(0)}x${dstHeight.toFixed(0)} (from ${trimmedWidth}x${trimmedHeight}, scale=${scale.toFixed(2)})`);

    // 4. Draw scaled (full source rect → scaled, centered destination rect)
    ctx.drawImage(trimmedCanvas, 0, 0, trimmedWidth, trimmedHeight, x, y, dstWidth, dstHeight);
  }

  // Convert to JPEG base64 string with quality 0.8
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  
  // Extract base64 string (remove data URL prefix)
  const base64String = dataUrl.split(',')[1];
  
  console.log(`[generateClothingGrid] Grid canvas created, base64 length: ${base64String.length}`);
  
  return base64String;
}
