"use strict";

// Module for generating a full body studio portrait. This function
// composites the user's head reference (headshot or selfie) onto a full-body
// reference image using Gemini, ensuring realistic proportions and proper
// studio lighting.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  resolveModelFromSettings,
  getGeminiApiVersion,
  DEFAULT_BODY_MODEL
} = require("../utils");

/**
 * Generates a body shot by blending a head reference onto a body
 * reference image. Supports either a selfie + mirror selfie pair
 * or a headshot + body photo flow. If no head reference is provided,
 * it falls back to the user's stored headshot. The resulting image is
 * uploaded and the user's settings are updated accordingly.
 *
 * @param {object} input - Job input including body_photo_image_id and optionally headshot_image_id
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - The user's ID
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<{image_id: number, storage_key: string}>} New body shot info
 */
async function processBodyShotGenerate(input, supabase, userId, perfTracker = null, timingTracker = null, jobId = null) {
  const {
    body_photo_image_id,
    headshot_image_id,
    selfie_image_id,
    mirror_selfie_image_id
  } = input;

  const useSelfiePair = !!(selfie_image_id && mirror_selfie_image_id);
  const bodyId = useSelfiePair ? mirror_selfie_image_id : body_photo_image_id;

  if (!bodyId) {
    throw new Error("Missing body reference image");
  }

  // Determine the head reference: selfie override or stored headshot
  let headId = useSelfiePair ? selfie_image_id : headshot_image_id;
  if (!headId && !useSelfiePair) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("headshot_image_id")
      .eq("user_id", userId)
      .single();
    headId = settings?.headshot_image_id;
  }
  if (!headId) {
    throw new Error("Missing head reference image");
  }
  // Download head and body images concurrently
  const [headResult, bodyResult] = await Promise.all([
    downloadImageFromStorage(supabase, headId, timingTracker),
    downloadImageFromStorage(supabase, bodyId, timingTracker)
  ]);
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("ai_model_preference, ai_model_body_shot_generate")
    .eq("user_id", userId)
    .single();
  // Generate the composite body shot - pass full result objects to include mime-types
  const model = resolveModelFromSettings(
    userSettings,
    "ai_model_body_shot_generate",
    DEFAULT_BODY_MODEL
  );
  const apiVersion = getGeminiApiVersion(model);
  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, apiVersion });
  const studioModelB64 = await callGeminiAPI(
    PROMPTS.BODY_COMPOSITE,
    [headResult, bodyResult],
    model,
    "IMAGE",
    perfTracker,
    timingTracker
  );
  console.log("[Gemini] CALL COMPLETE", { job_id: jobId });
  // Upload the new body shot image
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/body_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    studioModelB64,
    storagePath
  );
  // Update the user's settings to reference the new body shot
  await supabase
    .from("user_settings")
    .update({ body_shot_image_id: imageId })
    .eq("user_id", userId);
  return { image_id: imageId, storage_key: storageKey };
}

module.exports = { processBodyShotGenerate };
