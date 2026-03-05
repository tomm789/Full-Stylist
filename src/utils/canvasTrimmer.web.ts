/**
 * Canvas Trimming Utility (Web)
 * Removes whitespace from images by detecting content bounding boxes
 */

type ImageSource = HTMLImageElement | HTMLCanvasElement | string;

/**
 * Trims whitespace from an image by detecting the content bounding box.
 * A pixel is considered "empty" if its RGB channels are all above (255 - threshold).
 * Transparent pixels are treated as empty.
 */
export async function trimImageWhitespace(
  imageSource: ImageSource,
  threshold: number = 15,
  debug: boolean = false
): Promise<HTMLCanvasElement> {
  // Create a temporary canvas to draw the source image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    throw new Error('Could not get canvas context for trimming');
  }

  // Load the image if it's a URL string
  let image: HTMLImageElement | HTMLCanvasElement;
  if (typeof imageSource === 'string') {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
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

  if (__DEV__) console.log(`[trimImageWhitespace] Start Trim: ${image.width} x ${image.height}`);

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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      const isEmpty = a === 0 || (r > minChannelValue && g > minChannelValue && b > minChannelValue);

      if (!isEmpty) {
        foundContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (__DEV__) console.log(`[trimImageWhitespace] Detected bounding box:`, { top: minY, bottom: maxY, left: minX, right: maxX });

  // Safety check: if no content found, return original image
  if (!foundContent || minX >= maxX || minY >= maxY) {
    if (__DEV__) console.log('[trimImageWhitespace] No content found - returning original image');
    const originalCanvas = document.createElement('canvas');
    const originalCtx = originalCanvas.getContext('2d')!;
    originalCanvas.width = image.width;
    originalCanvas.height = image.height;

    originalCtx.imageSmoothingEnabled = true;
    originalCtx.imageSmoothingQuality = 'high';
    originalCtx.drawImage(image, 0, 0);

    if (debug) {
      originalCtx.strokeStyle = '#FF0000';
      originalCtx.lineWidth = 4;
      originalCtx.strokeRect(0, 0, originalCanvas.width, originalCanvas.height);
      if (__DEV__) console.log('[trimImageWhitespace] Debug mode: Red border drawn around original canvas (no content found)');
    }

    return originalCanvas;
  }

  // Calculate trimmed dimensions
  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  if (__DEV__) console.log(`[trimImageWhitespace] Final Size: ${trimmedWidth} x ${trimmedHeight}`);
  if (__DEV__) console.log(`[trimImageWhitespace] Trimmed from ${width}x${height} to ${trimmedWidth}x${trimmedHeight} (bounds: ${minX},${minY} to ${maxX},${maxY})`);

  // Create new canvas with trimmed dimensions
  const trimmedCanvas = document.createElement('canvas');
  const trimmedCtx = trimmedCanvas.getContext('2d');

  if (!trimmedCtx) {
    throw new Error('Could not get canvas context for trimmed canvas');
  }

  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  trimmedCtx.imageSmoothingEnabled = true;
  trimmedCtx.imageSmoothingQuality = 'high';

  trimmedCtx.drawImage(
    image,
    minX, minY, trimmedWidth, trimmedHeight,
    0, 0, trimmedWidth, trimmedHeight
  );

  if (debug) {
    trimmedCtx.strokeStyle = '#FF0000';
    trimmedCtx.lineWidth = 4;
    trimmedCtx.strokeRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
    if (__DEV__) console.log(`[trimImageWhitespace] Debug mode: Red border drawn around trimmed canvas edges (${trimmedWidth}x${trimmedHeight})`);
  }

  return trimmedCanvas;
}
