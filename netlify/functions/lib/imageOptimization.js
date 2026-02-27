"use strict";

const sharp = require('sharp');

/**
 * Optimizes an image before sending it to Gemini.
 * This reduces upload payload size and can lower generation latency.
 *
 * @param {{base64: string, mimeType?: string}|string} imageInput
 * @param {{maxWidth?: number, maxHeight?: number, quality?: number}} options
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
async function optimizeGeminiInput(imageInput, options = {}) {
  const {
    maxWidth = 1536,
    maxHeight = 2048,
    quality = 82
  } = options;

  try {
    let base64;
    let mimeType = "image/jpeg";

    if (typeof imageInput === "string") {
      base64 = imageInput;
    } else if (imageInput && typeof imageInput === "object" && imageInput.base64) {
      base64 = imageInput.base64;
      mimeType = imageInput.mimeType || mimeType;
    } else {
      throw new Error("Invalid image input");
    }

    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    const inputBuffer = Buffer.from(rawBase64, "base64");
    const optimizedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality,
        mozjpeg: true,
      })
      .toBuffer();

    const optimizedBase64 = optimizedBuffer.toString("base64");
    console.log(
      `[optimizeGeminiInput] ${mimeType} -> image/jpeg | bytes ${inputBuffer.length} -> ${optimizedBuffer.length}`
    );
    return {
      base64: optimizedBase64,
      mimeType: "image/jpeg",
    };
  } catch (error) {
    console.warn("[optimizeGeminiInput] Failed, using original input:", error.message || error);
    if (typeof imageInput === "string") {
      return { base64: imageInput, mimeType: "image/jpeg" };
    }
    return {
      base64: imageInput?.base64 || "",
      mimeType: imageInput?.mimeType || "image/jpeg",
    };
  }
}

/**
 * Optimizes a Gemini-generated image by resizing and compressing it.
 * Converts the base64 input to a Buffer, resizes to max width 1024px (maintaining aspect ratio),
 * converts to JPEG with quality 80 and mozjpeg compression, then returns as base64 string.
 * 
 * @param {string} base64String - Base64 encoded image string from Gemini API
 * @returns {Promise<string>} Optimized base64 encoded JPEG image string
 */
async function optimizeGeminiOutput(base64String) {
  console.log('[optimizeGeminiOutput] Starting optimization...');
  
  try {
    // Convert base64 to buffer
    const rawBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(rawBase64, 'base64');
    
    console.log(`[optimizeGeminiOutput] Input size: ${inputBuffer.length} bytes (${(inputBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Get original metadata
    const originalMetadata = await sharp(inputBuffer).metadata();
    console.log(`[optimizeGeminiOutput] Original dimensions: ${originalMetadata.width}x${originalMetadata.height}`);
    
    // Optimize with sharp: resize to max width 1024px, convert to JPEG with quality 80 and mozjpeg
    const optimizedBuffer = await sharp(inputBuffer)
      .resize(1024, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({
        quality: 80,
        mozjpeg: true
      })
      .toBuffer();
    
    console.log(`[optimizeGeminiOutput] Optimized size: ${optimizedBuffer.length} bytes (${(optimizedBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Get optimized metadata
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    console.log(`[optimizeGeminiOutput] Optimized dimensions: ${optimizedMetadata.width}x${optimizedMetadata.height}`);
    
    const sizeReduction = ((1 - optimizedBuffer.length / inputBuffer.length) * 100).toFixed(1);
    console.log(`[optimizeGeminiOutput] Size reduction: ${sizeReduction}%`);
    
    // Convert back to base64 string
    const optimizedBase64 = optimizedBuffer.toString('base64');
    console.log('[optimizeGeminiOutput] Optimization complete');
    
    return optimizedBase64;
  } catch (error) {
    console.error('[optimizeGeminiOutput] Optimization failed:', error);
    // Return original if optimization fails
    console.warn('[optimizeGeminiOutput] Returning original image due to error');
    return base64String;
  }
}

module.exports = {
  optimizeGeminiInput,
  optimizeGeminiOutput,
};
