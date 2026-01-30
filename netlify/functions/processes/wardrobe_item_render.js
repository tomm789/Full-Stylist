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
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<object>} { item_id, image_id, storage_key, base64_result? }
 */
async function processWardrobeItemRender(input, supabase, userId, perfTracker = null, timingTracker = null, jobId = null) {
  const setupStart = Date.now();
  const { item_id, source_image_id } = input;
  const wardrobe_item_id = item_id;

  if (!wardrobe_item_id || !source_image_id) {
    throw new Error("wardrobe_item_render requires item_id and source_image_id");
  }

  // Download source image once
  console.log(`[WardrobeItemRender] Downloading source image (source_image_id: ${source_image_id})...`);
  const imageResult = await downloadImageFromStorage(supabase, source_image_id, timingTracker);
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

  // Persist pointers: bump existing sort_order, insert new product_shot at sort_order=0
  const { data: existingImages } = await supabase
    .from("wardrobe_item_images")
    .select("id, sort_order")
    .eq("wardrobe_item_id", wardrobe_item_id)
    .order("sort_order", { ascending: false });

  for (const img of existingImages || []) {
    await supabase
      .from("wardrobe_item_images")
      .update({ sort_order: (img.sort_order || 0) + 1 })
      .eq("id", img.id);
  }

  await supabase.from("wardrobe_item_images").insert({
    wardrobe_item_id,
    image_id: imageId,
    type: "product_shot",
    sort_order: 0
  });

  const totalMs = Date.now() - setupStart;
  console.log(`[WardrobeItemRender] Total duration: ${totalMs} ms`);

  // Result for client fast-path (base64_result optional but cheap — we have optimizedB64)
  return {
    item_id: wardrobe_item_id,
    image_id: imageId,
    storage_key: storageKey,
    base64_result: optimizedB64
  };
}

module.exports = { processWardrobeItemRender };
