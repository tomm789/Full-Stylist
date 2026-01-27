"use strict";

// Utility functions shared by multiple Netlify functions. These helpers
// encapsulate the common logic for downloading and uploading images to
// Supabase storage as well as calling the Gemini API. They are extracted
// into a separate module to avoid duplication and keep the individual
// function handlers focused on their specific job logic.

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
 * @returns {Promise<string>} A promise resolving to a Base64 representation of the image
 */
async function downloadImageFromStorage(supabase, imageId) {
  const { data: image, error } = await supabase
    .from("images")
    .select("storage_bucket, storage_key")
    .eq("id", imageId)
    .single();
  if (error || !image) {
    throw new Error(`Image not found: ${imageId}`);
  }
  const bucket = image.storage_bucket || "media";
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(image.storage_key);
  const response = await fetch(urlData.publicUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Uploads a Base64 encoded image into Supabase storage. It detects the
 * mime type based on the file signature and writes the raw bytes into the
 * `media` bucket. After upload, it inserts a record into the `images`
 * table associating the uploaded file with the owner user. The function
 * returns the newly created image ID and storage key.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - The Supabase client
 * @param {string} userId - The ID of the user owning the image
 * @param {string} base64Data - Base64 encoded image data (may include data URL prefix)
 * @param {string} storagePath - The desired storage path within the bucket
 * @returns {Promise<{imageId: number, storageKey: string}>} The ID and storage key of the uploaded image
 */
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
 * @param {string} prompt - The prompt to send to the API
 * @param {string[]} images - Array of Base64 encoded images
 * @param {string} model - The name of the Gemini model to use
 * @param {"TEXT"|"IMAGE"} responseType - Desired response type
 * @returns {Promise<string>} The generated text or Base64 image data
 */
async function callGeminiAPI(prompt, images, model = "gemini-2.5-flash-image", responseType = "IMAGE") {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }
  const parts = [{ text: prompt }];
  for (const imageB64 of images) {
    // Always send images as JPEG. If necessary, the model will infer the actual format.
    parts.push({ inline_data: { mime_type: "image/jpeg", data: imageB64 } });
  }
  // Adjust temperature: lower for text, slightly higher for images
  const generationConfig = {
    temperature: responseType === "TEXT" ? 0.3 : 0.4
  };
  if (responseType === "IMAGE") {
    generationConfig.response_modalities = ["IMAGE"];
  }
  const response = await fetch(
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
    console.error("[GeminiAPI] Error:", JSON.stringify(data.error || data, null, 2));
    throw new Error(data.error?.message || "Gemini API Error");
  }
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates returned");
  }
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Generation blocked: ${candidate.finishReason} - ${candidate.finishMessage || ""}`);
  }
  const responseParts = candidate.content?.parts || [];
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
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI
};