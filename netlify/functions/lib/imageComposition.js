"use strict";

const sharp = require('sharp');

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
    return { cols: 1, rows: 2 };
  }
  
  if (itemCount === 3) {
    return { cols: 2, rows: 2 };
  }
  
  if (itemCount === 4) {
    return { cols: 2, rows: 2 };
  }
  
  if (itemCount <= 6) {
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
 * to "contain" within its grid cell (no cropping).
 * 
 * @param {Array<Buffer|string>} imageInputs - Array of image buffers or base64 strings
 * @returns {Promise<string>} Base64 encoded JPEG image string
 */
async function compositeOutfitGrid(imageInputs) {
  if (!imageInputs || imageInputs.length === 0) {
    throw new Error('No images provided for compositing');
  }

  const CANVAS_WIDTH = 1536;
  const CANVAS_HEIGHT = 2048;
  const BACKGROUND_COLOR = '#FFFFFF';
  const PADDING = 20; // Padding between grid cells

  console.log(`[compositeOutfitGrid] Creating grid for ${imageInputs.length} items`);

  // Calculate grid layout
  const { cols, rows } = calculateGridLayout(imageInputs.length);
  console.log(`[compositeOutfitGrid] Grid layout: ${cols}x${rows}`);

  // Calculate cell dimensions (accounting for padding)
  const totalPaddingWidth = (cols - 1) * PADDING;
  const totalPaddingHeight = (rows - 1) * PADDING;
  const cellWidth = Math.floor((CANVAS_WIDTH - totalPaddingWidth) / cols);
  const cellHeight = Math.floor((CANVAS_HEIGHT - totalPaddingHeight) / rows);

  console.log(`[compositeOutfitGrid] Cell dimensions: ${cellWidth}x${cellHeight}`);

  // Create white background canvas
  const canvas = sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: BACKGROUND_COLOR
    }
  });

  // Process each image and prepare composite operations
  const composites = [];
  
  for (let i = 0; i < imageInputs.length; i++) {
    const imageInput = imageInputs[i];
    
    // Calculate grid position
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = col * (cellWidth + PADDING);
    const y = row * (cellHeight + PADDING);
    
    console.log(`[compositeOutfitGrid] Processing item ${i + 1}/${imageInputs.length} at position (${col}, ${row}) -> (${x}, ${y})`);

    try {
      // Convert input to buffer if it's a base64 string
      let imageBuffer;
      if (typeof imageInput === 'string') {
        // Assume it's base64
        const rawBase64 = imageInput.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(rawBase64, 'base64');
      } else {
        imageBuffer = imageInput;
      }

      // Load and resize image to fit within cell (contain mode - no cropping)
      const resizedImage = await sharp(imageBuffer)
        .resize(cellWidth, cellHeight, {
          fit: 'contain',
          background: BACKGROUND_COLOR
        })
        .toBuffer();

      // Get actual dimensions of resized image (may be smaller than cell)
      const metadata = await sharp(resizedImage).metadata();
      const actualWidth = metadata.width;
      const actualHeight = metadata.height;

      // Center the image within the cell
      const offsetX = x + Math.floor((cellWidth - actualWidth) / 2);
      const offsetY = y + Math.floor((cellHeight - actualHeight) / 2);

      composites.push({
        input: resizedImage,
        left: offsetX,
        top: offsetY
      });

      console.log(`[compositeOutfitGrid] Item ${i + 1} resized to ${actualWidth}x${actualHeight}, positioned at (${offsetX}, ${offsetY})`);
    } catch (error) {
      console.error(`[compositeOutfitGrid] Error processing image ${i + 1}:`, error);
      throw new Error(`Failed to process image ${i + 1}: ${error.message}`);
    }
  }

  // Composite all images onto the canvas
  console.log(`[compositeOutfitGrid] Compositing ${composites.length} images...`);
  const finalImage = await canvas
    .composite(composites)
    .jpeg({ quality: 95 })
    .toBuffer();

  // Convert to base64
  const base64 = finalImage.toString('base64');
  console.log(`[compositeOutfitGrid] Composite complete, base64 length: ${base64.length}`);

  return base64;
}

/**
 * Composes a draw mask directly onto a portrait so Gemini receives one image
 * with guides already aligned to facial features.
 *
 * @param {{base64: string, mimeType?: string}} selfieImage
 * @param {{base64: string, mimeType?: string}} maskImage
 * @param {{fit?: "cover"|"contain", width?: number, height?: number}} options
 * @returns {Promise<{base64: string, mimeType: "image/png"}>}
 */
async function composeHeadshotWithMask(selfieImage, maskImage, options = {}) {
  const fit = options.fit === "contain" ? "contain" : "cover";

  if (!selfieImage?.base64 || !maskImage?.base64) {
    throw new Error("composeHeadshotWithMask requires selfie and mask base64 data");
  }

  const selfieBuffer = Buffer.from(selfieImage.base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const maskBuffer = Buffer.from(maskImage.base64.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const maskMeta = await sharp(maskBuffer).metadata();
  const targetWidth = Number.isFinite(options.width) && options.width > 0
    ? Math.max(1, Math.round(options.width))
    : (maskMeta.width || 0);
  const targetHeight = Number.isFinite(options.height) && options.height > 0
    ? Math.max(1, Math.round(options.height))
    : (maskMeta.height || 0);

  if (!targetWidth || !targetHeight) {
    throw new Error("Unable to resolve composite dimensions for headshot mask overlay");
  }

  const normalizedSelfie = await sharp(selfieBuffer)
    .rotate()
    .resize(targetWidth, targetHeight, {
      fit,
      position: "center",
    })
    .png()
    .toBuffer();

  const rawMask = await sharp(maskBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = rawMask;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // make black backdrop transparent, keep user guide strokes opaque
    if (r <= 8 && g <= 8 && b <= 8) {
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
    }
  }

  const transparentMask = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .png()
    .toBuffer();

  const composed = await sharp(normalizedSelfie)
    .composite([{ input: transparentMask, left: 0, top: 0 }])
    .png()
    .toBuffer();

  return {
    base64: composed.toString("base64"),
    mimeType: "image/png",
  };
}

module.exports = {
  calculateGridLayout,
  compositeOutfitGrid,
  composeHeadshotWithMask,
};
