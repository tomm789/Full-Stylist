"use strict";

// Handler for generating a product photography shot from a wardrobe item image.
// This function uses the PROMPTS.PRODUCT_SHOT template to instruct Gemini
// to produce a square, professionally lit product photo. The resulting
// image is uploaded to Supabase storage and linked to the wardrobe item.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI
} = require("../utils");

/**
 * Generates a product shot for a given wardrobe item and stores the result
 * back into Supabase. It also ensures the new image appears first in the
 * wardrobe item's image ordering by incrementing existing sort orders.
 *
 * @param {object} input - Job input with image_id and wardrobe_item_id
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - ID of the user requesting the image
 * @returns {Promise<{image_id: number, storage_key: string}>} New image record details
 */
async function processProductShot(input, supabase, userId) {
  const { image_id, wardrobe_item_id } = input;
  if (!image_id || !wardrobe_item_id) {
    throw new Error("Missing ID or wardrobe_item_id");
  }
  // Download the original item image
  const imageB64 = await downloadImageFromStorage(supabase, image_id);
  // Generate a product shot using Gemini
  const productShotB64 = await callGeminiAPI(
    PROMPTS.PRODUCT_SHOT,
    [imageB64],
    "gemini-2.5-flash-image",
    "IMAGE"
  );
  // Upload the generated image to storage
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/product_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    productShotB64,
    storagePath
  );
  // Adjust existing images' sort orders to ensure the new shot appears first
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
  // Insert the new product shot as sort_order=0
  await supabase.from("wardrobe_item_images").insert({
    wardrobe_item_id,
    image_id: imageId,
    type: "product_shot",
    sort_order: 0
  });
  return { image_id: imageId, storage_key: storageKey };
}

module.exports = { processProductShot };