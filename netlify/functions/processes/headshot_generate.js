"use strict";

// Function for generating a professional headshot from a selfie. It
// constructs a prompt using optional hair and makeup styles, then
// uploads the resulting image and updates the user's headshot setting.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI
} = require("../utils");

/**
 * Generates a headshot for the given selfie. Optional hair and makeup
 * styles can override the defaults. The generated image is stored and
 * the user's settings are updated to point to the new headshot.
 *
 * @param {object} input - Job input including selfie_image_id, hair_style and makeup_style
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - The user's ID
 * @returns {Promise<{image_id: number, storage_key: string}>} New headshot info
 */
async function processHeadshotGenerate(input, supabase, userId) {
  const { selfie_image_id, hair_style, makeup_style } = input;
  if (!selfie_image_id) {
    throw new Error("Missing selfie_image_id");
  }
  // Download the selfie used as input
  const selfieB64 = await downloadImageFromStorage(supabase, selfie_image_id);
  const hair = hair_style || "Keep original hair";
  const makeup = makeup_style || "Natural look";
  const prompt = PROMPTS.HEADSHOT(hair, makeup);
  // Generate the headshot via Gemini
  const headshotB64 = await callGeminiAPI(
    prompt,
    [selfieB64],
    "gemini-2.5-flash-image",
    "IMAGE"
  );
  // Upload and store the headshot
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/headshots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    headshotB64,
    storagePath
  );
  // Update the user's settings to reference the new headshot
  await supabase
    .from("user_settings")
    .update({ headshot_image_id: imageId })
    .eq("user_id", userId);
  return { image_id: imageId, storage_key: storageKey };
}

module.exports = { processHeadshotGenerate };