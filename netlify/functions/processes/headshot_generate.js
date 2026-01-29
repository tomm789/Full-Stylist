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
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<{image_id: number, storage_key: string}>} New headshot info
 */
async function processHeadshotGenerate(input, supabase, userId, perfTracker = null, timingTracker = null, jobId = null) {
  console.log(`[processHeadshotGenerate] Starting for userId: ${userId}`, input);
  const { selfie_image_id, hair_style, makeup_style } = input;
  if (!selfie_image_id) {
    throw new Error("Missing selfie_image_id");
  }
  // Download the selfie used as input
  console.log(`[processHeadshotGenerate] Downloading selfie image: ${selfie_image_id}`);
  const selfieResult = await downloadImageFromStorage(supabase, selfie_image_id, timingTracker);
  console.log(`[processHeadshotGenerate] Downloaded selfie, base64 length: ${selfieResult.base64.length}`);
  
  // Validate base64
  if (!selfieResult.base64 || selfieResult.base64.length === 0) {
    throw new Error("Downloaded image is empty");
  }
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(selfieResult.base64)) {
    console.error(`[processHeadshotGenerate] Invalid base64 format, first 100 chars: ${selfieResult.base64.substring(0, 100)}`);
    throw new Error("Invalid base64 image format");
  }
  
  const hair = hair_style || "Keep original hair";
  const makeup = makeup_style || "Natural look";
  const prompt = PROMPTS.HEADSHOT(hair, makeup);
  const model = "gemini-2.5-flash-image";
  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model });
  console.log(`[processHeadshotGenerate] Calling Gemini API with prompt length: ${prompt.length}`);
  // Generate the headshot via Gemini - pass full result object to include mime-type
  const headshotB64 = await callGeminiAPI(
    prompt,
    [selfieResult],
    model,
    "IMAGE",
    perfTracker,
    timingTracker
  );
  console.log("[Gemini] CALL COMPLETE", { job_id: jobId });
  console.log(`[processHeadshotGenerate] Gemini API returned, headshot base64 length: ${headshotB64?.length || 0}`);
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