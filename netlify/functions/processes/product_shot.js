"use strict";

// Handler for generating a product photography shot from a wardrobe item image.
// This function uses the PROMPTS.PRODUCT_SHOT template to instruct Gemini
// to produce a square, professionally lit product photo. The resulting
// image is uploaded to Supabase storage and linked to the wardrobe item.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  resolveModelFromSettings,
  DEFAULT_IMAGE_MODEL
} = require("../utils");

/**
 * Generates a product shot for a given wardrobe item and stores the result
 * back into Supabase. It also ensures the new image appears first in the
 * wardrobe item's image ordering by incrementing existing sort orders.
 *
 * @param {object} input - Job input with image_id and wardrobe_item_id
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - ID of the user requesting the image
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @param {object} preDownloadedImageData - Optional pre-downloaded image data { base64, mimeType } to avoid redundant downloads
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<{image_id: number, storage_key: string, base64_result: string}>} New image record details with base64 for fast-path
 */
async function processProductShot(input, supabase, userId, perfTracker = null, timingTracker = null, preDownloadedImageData = null, jobId = null) {
  const { image_id, wardrobe_item_id } = input;
  if (!image_id || !wardrobe_item_id) {
    throw new Error("Missing ID or wardrobe_item_id");
  }
  
  // Use pre-downloaded image if provided, otherwise download from storage
  let imageResult;
  if (preDownloadedImageData && preDownloadedImageData.base64) {
    // Use the pre-downloaded image data to avoid redundant storage download
    console.log(`[processProductShot] Using pre-downloaded image (skipping storage download, saving ~5s)`);
    imageResult = preDownloadedImageData;
  } else {
    // Download from storage if no pre-downloaded data provided
    console.log(`[processProductShot] Downloading image from storage (image_id: ${image_id})...`);
    imageResult = await downloadImageFromStorage(supabase, image_id, timingTracker);
  }
  
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("ai_model_preference, ai_model_product_shot")
    .eq("user_id", userId)
    .single();
  // Generate a product shot using Gemini - pass full result object to include mime-type
  const model = resolveModelFromSettings(
    userSettings,
    "ai_model_product_shot",
    DEFAULT_IMAGE_MODEL
  );
  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model });
  const productShotB64 = await callGeminiAPI(
    PROMPTS.PRODUCT_SHOT,
    [imageResult],
    model,
    "IMAGE",
    perfTracker,
    timingTracker
  );
  console.log("[Gemini] CALL COMPLETE", { job_id: jobId });
  // Upload the generated image to storage
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const storagePath =
  `${userId}/ai/product_shots/` +
  `${jobId ? `product-${wardrobe_item_id}-${jobId}` : `product-${wardrobe_item_id}-${stamp}`}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    productShotB64,
    storagePath
  );
  // Atomic bump + insert under advisory lock (avoids duplicate sort_order=0)
  const { error: rpcErr } = await supabase.rpc("bump_and_insert_product_shot", {
    p_wardrobe_item_id: wardrobe_item_id,
    p_image_id: imageId,
    p_type: "product_shot",
  });
  if (rpcErr) throw rpcErr;
  // Return base64_result for fast-path rendering (raw base64 as produced, no optimization in this change)
  return { image_id: imageId, storage_key: storageKey, base64_result: productShotB64 };
}

module.exports = { processProductShot };
