"use strict";

// Function to generate a ghost mannequin representation for an outfit. This
// intermediate step is used when rendering outfits that contain more
// items than the model can accept in a single call. The mannequin
// image can later be composited with the user's body and head.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI
} = require("../utils");

/**
 * Generates a mannequin image for the selected wardrobe items. It fetches
 * the top image for each item, invokes Gemini to produce a ghost
 * mannequin render, and stores the resulting image. The returned
 * mannequin_image_id can be used later for compositing.
 *
 * @param {object} input - Job input including outfit_id, selected items, prompt and settings
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<{mannequin_image_id: number, storage_key: string, settings: object}>} Mannequin image info
 */
async function processOutfitMannequin(input, supabase, userId) {
  const { outfit_id, selected, prompt, settings } = input;
  if (!outfit_id || !selected?.length) {
    throw new Error("Missing outfit_id or selected items");
  }
  const wardrobeItemIds = selected.map((s) => s.wardrobe_item_id);
  const { data: allLinks, error: linksError } = await supabase
    .from("wardrobe_item_images")
    .select("wardrobe_item_id, type, sort_order, image_id")
    .in("wardrobe_item_id", wardrobeItemIds);
  if (linksError) {
    throw new Error(`Failed to load wardrobe item images: ${linksError.message}`);
  }
  const linksByItem = new Map();
  (allLinks || []).forEach((link) => {
    if (!linksByItem.has(link.wardrobe_item_id)) linksByItem.set(link.wardrobe_item_id, []);
    linksByItem.get(link.wardrobe_item_id).push(link);
  });
  const imageIdsToDownload = [];
  wardrobeItemIds.forEach((itemId) => {
    const links = linksByItem.get(itemId);
    if (!links?.length) return;
    links.sort((a, b) => {
      if (a.type === "product_shot" && b.type !== "product_shot") return -1;
      if (b.type === "product_shot" && a.type !== "product_shot") return 1;
      return (a.sort_order || 999) - (b.sort_order || 999);
    });
    if (links[0]?.image_id) {
      imageIdsToDownload.push(links[0].image_id);
    }
  });
  if (!imageIdsToDownload.length) {
    throw new Error("No valid images found for outfit items");
  }
  // Download item images for the mannequin generation
  const itemImages = await Promise.all(
    imageIdsToDownload.map((id) => downloadImageFromStorage(supabase, id))
  );
  // Determine the model to use
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("ai_model_preference")
    .eq("user_id", userId)
    .single();
  const preferredModel = userSettings?.ai_model_preference || "gemini-2.5-flash-image";
  const mannequinPrompt = PROMPTS.OUTFIT_MANNEQUIN(
    itemImages.length,
    prompt || "No additional details"
  );
  // Generate the mannequin image
  const mannequinB64 = await callGeminiAPI(
    mannequinPrompt,
    itemImages,
    preferredModel,
    "IMAGE"
  );
  // Upload the mannequin render
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/outfits/${outfit_id}/mannequin/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    mannequinB64,
    storagePath
  );
  return {
    mannequin_image_id: imageId,
    storage_key: storageKey,
    settings: settings || {}
  };
}

module.exports = { processOutfitMannequin };