/**
 * Canvas Trimming Utility (Native — Skia)
 * Removes whitespace from images by detecting content bounding boxes.
 * Platform-specific counterpart of canvasTrimmer.js (web).
 *
 * Metro loads this file on iOS/Android. The web version uses HTML5 Canvas APIs.
 */

import {
  Skia,
  ColorType,
  AlphaType,
  type SkImage,
} from '@shopify/react-native-skia';

/**
 * Trims whitespace from a Skia image by detecting the content bounding box.
 * A pixel is considered "empty" if its RGB channels are all above (255 - threshold).
 * Transparent pixels are treated as empty.
 *
 * @param imageSource - SkImage to trim
 * @param threshold - Brightness threshold (0-255). Default: 15
 * @param _debug - Unused on native (kept for API parity with web)
 * @returns Trimmed SkImage (cropped to bounding box)
 */
export async function trimImageWhitespace(
  imageSource: SkImage,
  threshold: number = 15,
  _debug: boolean = false
): Promise<SkImage> {
  const width = imageSource.width();
  const height = imageSource.height();

    if (__DEV__) console.log(`[trimImageWhitespace:native] Start Trim: ${width} x ${height}`);

  // Read RGBA_8888 pixel data (4 bytes per pixel: R, G, B, A)
  const pixels = imageSource.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels) {
        if (__DEV__) console.warn('[trimImageWhitespace:native] readPixels returned null — returning original');
    return imageSource;
  }

  // Ensure we have a Uint8Array for byte-level access
  const data = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer);

  const minChannelValue = 255 - threshold;

  // Scan all pixels to find content boundaries
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

      // Check if pixel is "empty":
      // - Alpha is 0 (transparent), OR
      // - All RGB channels are above the threshold (white/light)
      const isEmpty =
        a === 0 || (r > minChannelValue && g > minChannelValue && b > minChannelValue);

      if (!isEmpty) {
        foundContent = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

    if (__DEV__) console.log(`[trimImageWhitespace:native] Detected bounding box:`, {
    top: minY,
    bottom: maxY,
    left: minX,
    right: maxX,
  });

  // Safety check: if no content found, return original image
  if (!foundContent || minX >= maxX || minY >= maxY) {
        if (__DEV__) console.log('[trimImageWhitespace:native] No content found — returning original');
    return imageSource;
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

    if (__DEV__) console.log(
    `[trimImageWhitespace:native] Trimmed from ${width}x${height} to ${trimmedWidth}x${trimmedHeight}`
  );

  // Create new surface at trimmed dimensions and draw the cropped region
  const surface = Skia.Surface.Make(trimmedWidth, trimmedHeight);
  if (!surface) {
        if (__DEV__) console.warn('[trimImageWhitespace:native] Failed to create surface — returning original');
    return imageSource;
  }

  const canvas = surface.getCanvas();
  const srcRect = Skia.XYWHRect(minX, minY, trimmedWidth, trimmedHeight);
  const dstRect = Skia.XYWHRect(0, 0, trimmedWidth, trimmedHeight);
  canvas.drawImageRect(imageSource, srcRect, dstRect, Skia.Paint());

  return surface.makeImageSnapshot();
}
