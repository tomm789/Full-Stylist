"use strict";

// Critical-path job: generate product shot for a wardrobe item and persist it.
// Image-only; tagging (auto_tag) runs as a separate follow-up job.
// Matches outfit_render pattern: download → Gemini → optimize → upload → DB → job succeeded.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  optimizeGeminiOutput
} = require("../utils");

/**
 * Renders a product shot for a wardrobe item (critical path: image only).
 * Input: item_id, source_image_id (original upload image record id).
 *
 * @param {object} input - { item_id, source_image_id }
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - ID of the user
 * @param {object} perfTracker - Optional performance tracker
 * @param {object} timingTracker - Optional timing tracker
 * @param {object} preDownloadedImageData - Optional { base64, mimeType } to skip download
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<object>} { item_id, image_id, storage_key, base64_result? }
 */
async function processWardrobeItemRender(input, supabase, userId, perfTracker = null, timingTracker = null, preDownloadedImageData = null, jobId = null) {
  const setupStart = Date.now();
  const { item_id, source_image_id } = input;
  const wardrobe_item_id = item_id;

  if (!wardrobe_item_id || !source_image_id) {
    throw new Error("wardrobe_item_render requires item_id and source_image_id");
  }

  let imageResult;
  if (preDownloadedImageData && preDownloadedImageData.base64) {
    console.log(`[WardrobeItemRender] Using pre-downloaded image (skipping storage download)`);
    imageResult = preDownloadedImageData;
  } else {
    console.log(`[WardrobeItemRender] Downloading source image (source_image_id: ${source_image_id})...`);
    imageResult = await downloadImageFromStorage(supabase, source_image_id, timingTracker);
  }
  const setupMs = Date.now() - setupStart;
  console.log(`[WardrobeItemRender] Setup/download took: ${setupMs} ms`);

  // Gemini IMAGE model (same as product_shot)
  const geminiStart = Date.now();
  const model = "gemini-2.5-flash-image";
  console.log("[WardrobeItemRender] Gemini call start", { job_id: jobId, model });
  const productShotB64 = await callGeminiAPI(
    PROMPTS.PRODUCT_SHOT,
    [imageResult],
    model,
    "IMAGE",
    perfTracker,
    timingTracker
  );
  const geminiMs = Date.now() - geminiStart;
  console.log(`[WardrobeItemRender] Gemini took: ${geminiMs} ms`);

  // Optimize output (same as outfit_render)
  const optimizeStart = Date.now();
  const optimizedB64 = await optimizeGeminiOutput(productShotB64);
  const optimizeMs = Date.now() - optimizeStart;
  console.log(`[WardrobeItemRender] Optimize took: ${optimizeMs} ms`);

  // Upload to Supabase storage (same convention as product_shot)
  const uploadStart = Date.now();
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/product_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    optimizedB64,
    storagePath
  );
  const uploadMs = Date.now() - uploadStart;
  console.log(`[WardrobeItemRender] Upload took: ${uploadMs} ms`);

  // Persist pointers: atomic bump + insert under advisory lock (avoids duplicate sort_order=0)
  const { error: rpcErr } = await supabase.rpc("bump_and_insert_product_shot", {
    p_wardrobe_item_id: wardrobe_item_id,
    p_image_id: imageId,
    p_type: "product_shot",
  });
  if (rpcErr) throw rpcErr;

  const totalMs = Date.now() - setupStart;
  console.log(`[WardrobeItemRender] Total duration: ${totalMs} ms`);

  // Result for client fast-path (base64_result + mime_type for data URI)
  return {
    item_id: wardrobe_item_id,
    image_id: imageId,
    storage_key: storageKey,
    base64_result: optimizedB64,
    mime_type: "image/jpeg",
  };
}

module.exports = { processWardrobeItemRender };
