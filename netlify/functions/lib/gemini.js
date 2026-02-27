"use strict";

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

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_BODY_MODEL = "gemini-3-pro-image-preview";

function resolveModelFromSettings(settings, field, fallback = DEFAULT_IMAGE_MODEL) {
  if (settings && field && settings[field]) {
    return settings[field];
  }
  if (settings && settings.ai_model_preference) {
    return settings.ai_model_preference;
  }
  return fallback;
}

function getGeminiApiVersion(model) {
  return "v1beta";
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

  let modelId = model;
  if (typeof modelId === "string" && modelId.startsWith("models/")) {
    modelId = modelId.slice("models/".length);
  }

  const apiVersion = getGeminiApiVersion(modelId);
  
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
  if (responseType === "IMAGE" && apiVersion !== "v1") {
    generationConfig.response_modalities = ["IMAGE"];
  }
  
  // STATELESS: Each call makes a completely independent HTTP request
  // No shared model instances, chat sessions, or connection pooling that could serialize requests
  // Each request uses a fresh fetch instance to ensure true parallelism
  const fetchFn = await getFetch();
  
  const response = await fetchFn(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
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
      model: modelId,
      apiVersion,
      responseType,
      promptLength: prompt.length,
      imageCount,
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

module.exports = {
  callGeminiAPI,
  resolveModelFromSettings,
  getGeminiApiVersion,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_BODY_MODEL,
};
