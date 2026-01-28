/**
 * Canvas Trimming Utility
 * Removes whitespace from images by detecting content bounding boxes
 */

/**
 * Trims whitespace from an image by detecting the content bounding box.
 * A pixel is considered "empty" if its RGB channels are all above (255 - threshold).
 * Transparent pixels are treated as empty.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement|string} imageSource - Image source to trim
 * @param {number} threshold - Brightness threshold (0-255). Pixels with R,G,B all > (255 - threshold) are considered empty. Default: 15
 * @param {boolean} debug - If true, draws a red border around the edges of the trimmed canvas. Default: false
 * @returns {Promise<HTMLCanvasElement>} Canvas element containing the trimmed image (always cropped to bounding box)
 */
export async function trimImageWhitespace(imageSource, threshold = 15, debug = false) {
  // Create a temporary canvas to draw the source image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Could not get canvas context for trimming');
  }

  // Load the image if it's a URL string
  let image;
  if (typeof imageSource === 'string') {
    image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${imageSource}`));
      img.src = imageSource;
    });
  } else {
    image = imageSource;
  }

  // Set canvas size to match image
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;

  // Log start of trim operation
  console.log(`[trimImageWhitespace] Start Trim: ${image.width} x ${image.height}`);

  // Draw the image onto the temporary canvas
  tempCtx.drawImage(image, 0, 0);

  // Get image data for pixel scanning
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  const width = tempCanvas.width;
  const height = tempCanvas.height;

  // Calculate the threshold value
  const minChannelValue = 255 - threshold;

  // Find bounding box by scanning pixels
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let foundContent = false;

  // Scan all pixels to find content boundaries
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      // Check if pixel is "empty":
      // - Alpha is 0 (transparent), OR
      // - All RGB channels are above the threshold (white/light)
      const isEmpty = a === 0 || (r > minChannelValue && g > minChannelValue && b > minChannelValue);

      if (!isEmpty) {
        // Found content pixel
        foundContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Log detected bounding box
  const boundingBox = {
    top: minY,
    bottom: maxY,
    left: minX,
    right: maxX
  };
  console.log(`[trimImageWhitespace] Detected bounding box:`, boundingBox);

  // Safety check: if no content found, return original image (as safety fallback)
  if (!foundContent || minX >= maxX || minY >= maxY) {
    console.log('[trimImageWhitespace] No content found - returning original image');
    const originalCanvas = document.createElement('canvas');
    const originalCtx = originalCanvas.getContext('2d');
    originalCanvas.width = image.width;
    originalCanvas.height = image.height;
    
    // Enable high-quality rendering
    originalCtx.imageSmoothingEnabled = true;
    originalCtx.imageSmoothingQuality = 'high';
    
    originalCtx.drawImage(image, 0, 0);
    
    // In debug mode, draw red border around the entire canvas
    if (debug) {
      originalCtx.strokeStyle = '#FF0000';
      originalCtx.lineWidth = 4;
      originalCtx.strokeRect(0, 0, originalCanvas.width, originalCanvas.height);
      console.log('[trimImageWhitespace] Debug mode: Red border drawn around original canvas (no content found)');
    }
    
    return originalCanvas;
  }

  // Calculate trimmed dimensions
  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  console.log(`[trimImageWhitespace] Final Size: ${trimmedWidth} x ${trimmedHeight}`);
  console.log(`[trimImageWhitespace] Trimmed from ${width}x${height} to ${trimmedWidth}x${trimmedHeight} (bounds: ${minX},${minY} to ${maxX},${maxY})`);

  // Create new canvas with trimmed dimensions (always cropped)
  const trimmedCanvas = document.createElement('canvas');
  const trimmedCtx = trimmedCanvas.getContext('2d');
  
  if (!trimmedCtx) {
    throw new Error('Could not get canvas context for trimmed canvas');
  }

  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  // Enable high-quality rendering
  trimmedCtx.imageSmoothingEnabled = true;
  trimmedCtx.imageSmoothingQuality = 'high';

  // Draw the trimmed region from the source image onto the new canvas
  trimmedCtx.drawImage(
    image,
    minX, minY, trimmedWidth, trimmedHeight, // Source region
    0, 0, trimmedWidth, trimmedHeight        // Destination (full canvas)
  );

  // Debug mode: draw red border around the edges of the trimmed canvas
  if (debug) {
    trimmedCtx.strokeStyle = '#FF0000';
    trimmedCtx.lineWidth = 4;
    trimmedCtx.strokeRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
    console.log(`[trimImageWhitespace] Debug mode: Red border drawn around trimmed canvas edges (${trimmedWidth}x${trimmedHeight})`);
  }

  return trimmedCanvas;
}
