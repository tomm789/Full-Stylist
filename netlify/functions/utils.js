"use strict";

// Utility functions shared by multiple Netlify functions. These helpers
// encapsulate the common logic for downloading and uploading images to
// Supabase storage as well as calling the Gemini API. They are extracted
// into a separate module to avoid duplication and keep the individual
// function handlers focused on their specific job logic.

const sharp = require('sharp');
// STATELESS: Use native fetch if available (Node 18+), otherwise lazy-load node-fetch per call
// This ensures no shared state or connection pooling that could serialize parallel requests
let fetchFn = null;
async function getFetch() {
  if (typeof fetch !== 'undefined') {
    return fetch; // Native fetch (Node 18+)
  }
  if (!fetchFn) {
    const nodeFetch = await import('node-fetch');
    fetchFn = nodeFetch.default;
  }
  return fetchFn;
}

/**
 * Creates a detailed timing tracker for step-by-step performance analysis.
 * Tracks storage downloads, base64 conversions, and API calls separately.
 * 
 * @returns {object} Timing tracker object with methods to record timing
 */
function createTimingTracker() {
  const tracker = {
    storageDownloadTime: 0,
    base64ConversionTime: 0,
    apiCallTime: 0,
    jobStartTime: null,
    batchAIGenerationTime: null, // For batch jobs: actual parallel execution time
    
    /**
     * Start tracking a job
     */
    startJob() {
      this.jobStartTime = performance.now();
    },
    
    /**
     * Add storage download time
     */
    addStorageDownload(durationMs) {
      this.storageDownloadTime += durationMs;
    },
    
    /**
     * Add base64 conversion time
     */
    addBase64Conversion(durationMs) {
      this.base64ConversionTime += durationMs;
    },
    
    /**
     * Add API call time
     */
    addApiCall(durationMs) {
      this.apiCallTime += durationMs;
    },
    
    /**
     * Set batch AI generation time (for parallel execution)
     * This overrides the accumulated apiCallTime for batch jobs
     */
    setBatchAIGenerationTime(durationMs) {
      this.batchAIGenerationTime = durationMs;
    },
    
    /**
     * Get total job time
     */
    getTotalTime() {
      if (!this.jobStartTime) return 0;
      return performance.now() - this.jobStartTime;
    },
    
    /**
     * Get setup time (download + conversion)
     */
    getSetupTime() {
      return this.storageDownloadTime + this.base64ConversionTime;
    },
    
    /**
     * Get AI generation time (batch time if set, otherwise accumulated)
     */
    getAIGenerationTime() {
      return this.batchAIGenerationTime !== null ? this.batchAIGenerationTime : this.apiCallTime;
    },
    
    /**
     * Format duration in seconds
     */
    formatSeconds(ms) {
      return (ms / 1000).toFixed(2);
    },
    
    /**
     * Log timing breakdown
     */
    logBreakdown(jobType) {
      const total = this.getTotalTime();
      const setup = this.getSetupTime();
      const aiGen = this.getAIGenerationTime();
      
      console.log(
        `[TIMING_BREAKDOWN] Job: ${jobType} | ` +
        `Setup: ${this.formatSeconds(setup)}s | ` +
        `AI Generation: ${this.formatSeconds(aiGen)}s | ` +
        `Total: ${this.formatSeconds(total)}s`
      );
    }
  };
  
  return tracker;
}

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_BODY_MODEL = "gemini-3-pro-image";

function resolveModelFromSettings(settings, field, fallback = DEFAULT_IMAGE_MODEL) {
  if (settings && field && settings[field]) {
    return settings[field];
  }
  if (settings && settings.ai_model_preference) {
    return settings.ai_model_preference;
  }
  return fallback;
}

/**
 * Creates a performance tracker for comparing text vs image generation.
 * Generates a unique request ID and tracks timing for each generation type.
 * 
 * @returns {object} Performance tracker object with methods to record timing
 */
function createPerformanceTracker() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tracker = {
    requestId,
    textGenStart: null,
    textGenEnd: null,
    imageGenStart: null,
    imageGenEnd: null,
    imageCount: 0,
    
    /**
     * Record the start of text generation
     */
    startTextGen(imageCount) {
      this.textGenStart = Date.now();
      this.imageCount = imageCount || this.imageCount;
    },
    
    /**
     * Record the end of text generation
     */
    endTextGen() {
      this.textGenEnd = Date.now();
    },
    
    /**
     * Record the start of image generation
     */
    startImageGen(imageCount) {
      this.imageGenStart = Date.now();
      this.imageCount = imageCount || this.imageCount;
    },
    
    /**
     * Record the end of image generation
     */
    endImageGen() {
      this.imageGenEnd = Date.now();
    },
    
    /**
     * Get text generation duration in milliseconds
     */
    getTextDuration() {
      if (!this.textGenStart || !this.textGenEnd) return null;
      return this.textGenEnd - this.textGenStart;
    },
    
    /**
     * Get image generation duration in milliseconds
     */
    getImageDuration() {
      if (!this.imageGenStart || !this.imageGenEnd) return null;
      return this.imageGenEnd - this.imageGenStart;
    },
    
    /**
     * Log the performance comparison
     */
    logComparison() {
      const textTime = this.getTextDuration();
      const imageTime = this.getImageDuration();
      
      if (textTime === null && imageTime === null) {
        // No generation calls recorded
        return;
      }
      
      const textTimeStr = textTime !== null ? `${textTime}ms` : 'N/A';
      const imageTimeStr = imageTime !== null ? `${imageTime}ms` : 'N/A';
      
      let deltaStr = 'N/A';
      if (textTime !== null && imageTime !== null) {
        const delta = imageTime - textTime;
        deltaStr = `${delta >= 0 ? '+' : ''}${delta}ms`;
      }
      
      console.log(
        `[PERF_COMPARE] ReqID: ${this.requestId} | ` +
        `Inputs: ${this.imageCount} img | ` +
        `TextGen: ${textTimeStr} | ` +
        `ImageGen: ${imageTimeStr} | ` +
        `Delta: ${deltaStr}`
      );
    }
  };
  
  return tracker;
}

// Determines whether the provided Base64 data corresponds to a PNG. This
// check relies on the well‑known PNG file signature (iVBORw0KGgo). If the
// data does not start with this signature, JPEG is assumed.
function isPngBase64(data) {
  return data.startsWith("iVBORw0KGgo");
}

/**
 * Downloads an image from Supabase storage given its image record ID. The
 * function queries the `images` table to retrieve the storage bucket and
 * key, then generates a public URL via Supabase's storage API. It fetches
 * the image and returns its contents as a Base64 string (without any data
 * URL prefix).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - The Supabase client
 * @param {number} imageId - The ID of the image record in the `images` table
 * @param {object} timingTracker - Optional timing tracker to record download and conversion times
 * @returns {Promise<string>} A promise resolving to a Base64 representation of the image
 */
async function downloadImageFromStorage(supabase, imageId, timingTracker = null) {
  // Diagnostic logging for region mismatch detection
  const awsRegion = process.env.AWS_REGION || process.env.NETLIFY_REGION || 'not set';
  const supabaseUrlEnv = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'not set';
  
  // Try to access Supabase client URL from various possible properties
  let supabaseClientUrl = 'not accessible';
  if (supabase) {
    supabaseClientUrl = supabase.supabaseUrl || 
                       supabase.url || 
                       (supabase.rest && supabase.rest.supabaseUrl) ||
                       (supabase.storage && supabase.storage.supabaseUrl) ||
                       'accessible but URL not found in expected properties';
  }
  
  // Extract hostname from URL for additional diagnostics
  let supabaseHostname = 'unknown';
  try {
    const url = supabaseUrlEnv !== 'not set' ? new URL(supabaseUrlEnv) : null;
    supabaseHostname = url ? url.hostname : 'invalid URL';
  } catch (e) {
    supabaseHostname = 'URL parse error';
  }
  
  console.log(`[downloadImageFromStorage] REGION DIAGNOSTICS:`, {
    computeRegion: awsRegion,
    supabaseUrlFromEnv: supabaseUrlEnv,
    supabaseClientUrl: supabaseClientUrl,
    supabaseHostname: supabaseHostname,
    hasSupabaseClient: !!supabase,
    clientProperties: supabase ? Object.keys(supabase).filter(k => !k.startsWith('_')).join(', ') : 'N/A',
  });
  
  console.log(`[downloadImageFromStorage] Starting download for imageId: ${imageId}`);
  
  const { data: image, error } = await supabase
    .from("images")
    .select("storage_bucket, storage_key, mime_type")
    .eq("id", imageId)
    .single();
    
  if (error || !image) {
    console.error(`[downloadImageFromStorage] Image not found: ${imageId}`, error);
    throw new Error(`Image not found: ${imageId}`);
  }
  
  console.log(`[downloadImageFromStorage] Found image record: bucket=${image.storage_bucket}, key=${image.storage_key}`);
  
  const bucket = image.storage_bucket || "media";
  
  // Generate signed URL for direct CDN/S3 access (bypasses API middleware)
  const signedUrlStart = performance.now();
  console.log(`[downloadImageFromStorage] Generating signed URL for direct download...`);
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(image.storage_key, 60); // 60 second expiry
  
  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error(`[downloadImageFromStorage] Failed to create signed URL:`, signedUrlError);
    throw new Error(`Failed to create signed URL: ${signedUrlError?.message || 'Unknown error'}`);
  }
  
  const signedUrlEnd = performance.now();
  const signedUrlDuration = signedUrlEnd - signedUrlStart;
  console.log(`[downloadImageFromStorage] Signed URL generated in ${(signedUrlDuration / 1000).toFixed(2)}s: ${signedUrlData.signedUrl.substring(0, 80)}...`);
  
  // Track storage download time
  const downloadStart = performance.now();
  console.log(`[downloadImageFromStorage] Downloading directly from signed URL (CDN/S3 path)...`);
  
  // Use fetch() to download directly from signed URL (routes through CDN/S3, faster than API)
  const fetchResponse = await fetch(signedUrlData.signedUrl);
  
  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text().catch(() => 'Unknown error');
    console.error(`[downloadImageFromStorage] Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`, errorText);
    throw new Error(`Failed to download image from signed URL: ${fetchResponse.status} ${fetchResponse.statusText}`);
  }
  
  const arrayBuffer = await fetchResponse.arrayBuffer();
  const downloadEnd = performance.now();
  const downloadDuration = downloadEnd - downloadStart;
  
  if (timingTracker) {
    timingTracker.addStorageDownload(downloadDuration);
  }
  console.log(`[downloadImageFromStorage] Direct download completed in ${(downloadDuration / 1000).toFixed(2)}s, size: ${arrayBuffer.byteLength} bytes`);
  
  // Validate it's actually image data
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPNG = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  
  // WebP files start with "RIFF" (0x52 0x49 0x46 0x46) and have "WEBP" at offset 8
  const isWebP = firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46;
  // Optionally verify WEBP signature at offset 8 for extra validation
  let isWebPConfirmed = false;
  if (isWebP && arrayBuffer.byteLength >= 12) {
    const webpBytes = new Uint8Array(arrayBuffer.slice(8, 12));
    isWebPConfirmed = webpBytes[0] === 0x57 && webpBytes[1] === 0x45 && webpBytes[2] === 0x42 && webpBytes[3] === 0x50;
  }
  
  if (!isJPEG && !isPNG && !isWebP) {
    console.error(`[downloadImageFromStorage] Not a valid image! First bytes: ${Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    throw new Error("Downloaded file is not a valid image");
  }
  
  // Determine image format and mime-type
  let imageFormat = 'unknown';
  let mimeType = image.mime_type || 'image/jpeg'; // Default to JPEG if not in DB
  
  if (isJPEG) {
    imageFormat = 'JPEG';
    mimeType = 'image/jpeg';
  } else if (isPNG) {
    imageFormat = 'PNG';
    mimeType = 'image/png';
  } else if (isWebP) {
    imageFormat = isWebPConfirmed ? 'WebP (confirmed)' : 'WebP (RIFF header detected)';
    mimeType = 'image/webp';
  }
  
  // Trust the file signature over database mime_type if they don't match
  if (image.mime_type && image.mime_type !== mimeType) {
    console.log(`[downloadImageFromStorage] Mime-type mismatch: DB has ${image.mime_type}, detected ${mimeType}. Using detected format.`);
  }
  
  console.log(`[downloadImageFromStorage] Valid ${imageFormat} image detected (mime-type: ${mimeType})`);
  
  // Track base64 conversion time
  const conversionStart = performance.now();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const conversionEnd = performance.now();
  const conversionDuration = conversionEnd - conversionStart;
  
  if (timingTracker) {
    timingTracker.addBase64Conversion(conversionDuration);
  }
  console.log(`[downloadImageFromStorage] Base64 conversion completed in ${(conversionDuration / 1000).toFixed(2)}s, length: ${base64.length}`);
  
  // Return both base64 and mime-type for downstream processing
  return { base64, mimeType };
}
async function uploadImageToStorage(supabase, userId, base64Data, storagePath) {
  // Determine MIME type based on Base64 prefix
  const isPng = isPngBase64(base64Data);
  const mimeType = isPng ? "image/png" : "image/jpeg";
  const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(rawBase64, "base64");
  const blob = new Blob([buffer], { type: mimeType });
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType
    });
  if (uploadError || !uploadData) {
    throw new Error(`Failed to upload: ${uploadError?.message}`);
  }
  const { data: imageRecord, error: imageError } = await supabase
    .from("images")
    .insert({
      owner_user_id: userId,
      storage_bucket: "media",
      storage_key: uploadData.path,
      mime_type: mimeType,
      source: "ai_generated"
    })
    .select()
    .single();
  if (imageError || !imageRecord) {
    throw new Error(`Failed to create DB record: ${imageError?.message}`);
  }
  return { imageId: imageRecord.id, storageKey: uploadData.path };
}

/**
 * Calls the Gemini API for either text or image generation. It accepts a
 * prompt and an array of Base64 encoded images that will be sent as
 * inline_data. The model and response type can be configured. For image
 * generation, the response is returned as a Base64 encoded image string.
 * For text generation, the returned string contains the generated text.
 * 
 * **STATELESS DESIGN:** This function is completely stateless - each call
 * creates a fresh HTTP request with no shared state, model instances, or
 * chat sessions. This allows true parallel execution when called from
 * Promise.all() without any serialization or queuing.
 *
 * @param {string} prompt - The prompt to send to the API
 * @param {string[]} images - Array of Base64 encoded images
 * @param {string} model - The name of the Gemini model to use
 * @param {"TEXT"|"IMAGE"} responseType - Desired response type
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @returns {Promise<string>} The generated text or Base64 image data
 */
async function callGeminiAPI(prompt, images, model = "gemini-2.5-flash-image", responseType = "IMAGE", perfTracker = null, timingTracker = null) {
  // STATELESS: Each call reads the API key fresh - no shared state
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }

  if (typeof model === "string") {
    const normalizedModel = model.toLowerCase();
    if (normalizedModel.startsWith("imagen-") || normalizedModel.startsWith("veo-")) {
      throw new Error(
        `Model ${model} requires a different API endpoint (not supported by Gemini generateContent in this integration yet).`
      );
    }
  }
  
  // Record start time for performance tracking
  const imageCount = Array.isArray(images) ? images.length : (images ? 1 : 0);
  if (perfTracker) {
    if (responseType === "TEXT") {
      perfTracker.startTextGen(imageCount);
    } else {
      perfTracker.startImageGen(imageCount);
    }
  }
  
  // Track external API call time (separate from perfTracker)
  const apiCallStart = performance.now();
  
  // STATELESS: Build request payload fresh for each call - no shared state
  const parts = [{ text: prompt }];
  for (const imageInput of images) {
    // Support both string (backward compatible) and object { base64, mimeType } formats
    let imageB64, mimeType;
    if (typeof imageInput === 'string') {
      imageB64 = imageInput;
      mimeType = 'image/jpeg'; // Default for backward compatibility
    } else if (imageInput && typeof imageInput === 'object' && imageInput.base64) {
      imageB64 = imageInput.base64;
      mimeType = imageInput.mimeType || 'image/jpeg';
    } else {
      throw new Error("Invalid image input - must be string or { base64, mimeType } object");
    }
    
    // Validate base64 data
    if (!imageB64 || typeof imageB64 !== 'string' || imageB64.length === 0) {
      throw new Error("Invalid base64 image data");
    }
    // Check if base64 is valid (basic check)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(imageB64)) {
      throw new Error("Invalid base64 format");
    }
    // Use the detected mime-type (WebP, PNG, or JPEG)
    parts.push({ inline_data: { mime_type: mimeType, data: imageB64 } });
  }
  
  // STATELESS: Create fresh config object for each call
  const generationConfig = {
    temperature: responseType === "TEXT" ? 0.3 : 0.4
  };
  if (responseType === "IMAGE") {
    generationConfig.response_modalities = ["IMAGE"];
  }
  
  // STATELESS: Each call makes a completely independent HTTP request
  // No shared model instances, chat sessions, or connection pooling that could serialize requests
  // Each request uses a fresh fetch instance to ensure true parallelism
  const fetchFn = await getFetch();
  
  const response = await fetchFn(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      })
    }
  );
  
  const data = await response.json();
  if (!response.ok || data.error) {
    console.error("[GeminiAPI] Error response:", JSON.stringify(data.error || data, null, 2));
    const firstImage = Array.isArray(images) ? images[0] : images;
    let firstImageLength = 0;
    let firstImagePreview = "N/A";
    if (typeof firstImage === "string") {
      firstImageLength = firstImage.length;
      firstImagePreview = firstImage.substring(0, 100);
    } else if (firstImage && typeof firstImage === "object" && firstImage.base64) {
      firstImageLength = firstImage.base64.length;
      firstImagePreview = firstImage.base64.substring(0, 100);
    }
    console.error("[GeminiAPI] Request details:", {
      model,
      responseType,
      promptLength: prompt.length,
      imageCount: images.length,
      firstImageLength,
      firstImagePreview
    });
    const errorMessage = data.error?.message || data.error || "Gemini API Error";
    // Preserve the original error message from Gemini
    throw new Error(errorMessage);
  }
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates returned");
  }
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Generation blocked: ${candidate.finishReason} - ${candidate.finishMessage || ""}`);
  }
  const responseParts = candidate.content?.parts || [];
  
  // Record end time for performance tracking
  const apiCallEnd = performance.now();
  const apiCallDuration = apiCallEnd - apiCallStart;
  
  // Record API call time in timing tracker
  if (timingTracker) {
    timingTracker.addApiCall(apiCallDuration);
  }
  console.log(`[callGeminiAPI] External API call completed in ${(apiCallDuration / 1000).toFixed(2)}s (${responseType})`);
  
  if (perfTracker) {
    if (responseType === "TEXT") {
      perfTracker.endTextGen();
    } else {
      perfTracker.endImageGen();
    }
  }
  
  if (responseType === "TEXT") {
    const text = responseParts.find((p) => p.text)?.text;
    if (!text) {
      throw new Error("No text response from API");
    }
    return text.trim();
  } else {
    const imagePart = responseParts.find((p) => p.inline_data || p.inlineData);
    const imageData = imagePart?.inline_data?.data || imagePart?.inlineData?.data;
    if (!imageData) {
      throw new Error("No image data in API response");
    }
    return imageData;
  }
}

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
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  compositeOutfitGrid,
  optimizeGeminiOutput,
  createPerformanceTracker,
  createTimingTracker,
  resolveModelFromSettings,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_BODY_MODEL
};
