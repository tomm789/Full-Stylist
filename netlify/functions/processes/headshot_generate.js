"use strict";

// Function for generating a professional headshot from a selfie. It
// constructs a prompt using optional hair and makeup styles, then
// uploads the resulting image and updates the user's headshot setting.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  composeHeadshotWithMask,
  resolveModelFromSettings,
  getGeminiApiVersion,
  DEFAULT_IMAGE_MODEL
} = require("../utils");

/**
 * Generates a headshot for the given selfie. Optional hair and makeup
 * styles can override the defaults. The generated image is stored and
 * the user's settings are updated to point to the new headshot.
 *
 * @param {object} input - Job input including selfie_image_id, optional hair/makeup or prompt_text
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - The user's ID
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<{image_id: number, storage_key: string}>} New headshot info
 */
async function processHeadshotGenerate(input, supabase, userId, perfTracker = null, timingTracker = null, jobId = null) {
  console.log(`[processHeadshotGenerate] Starting for userId: ${userId}`, input);
  const {
    selfie_image_id,
    hair_style,
    makeup_style,
    prompt_text,
    output_folder,
    skip_user_settings_update,
    mask_storage_path,
    mask_storage_bucket,
    mask_color_map,
    mask_render_fit,
    mask_render_width,
    mask_render_height,
  } = input;
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
  
  // Download mask from storage if a drawing mask was provided
  let maskResult = null;
  if (mask_storage_path && mask_storage_bucket) {
    console.log(`[processHeadshotGenerate] Downloading mask from storage: ${mask_storage_bucket}/${mask_storage_path}`);
    const { data: maskBlob, error: maskError } = await supabase.storage
      .from(mask_storage_bucket)
      .download(mask_storage_path);
    if (maskError || !maskBlob) {
      throw new Error(`Failed to download mask: ${maskError?.message || "unknown error"}`);
    } else {
      const maskBuffer = Buffer.from(await maskBlob.arrayBuffer());
      const maskBase64 = maskBuffer.toString('base64');
      maskResult = { base64: maskBase64, mimeType: 'image/png' };
      console.log(`[processHeadshotGenerate] Mask downloaded, base64 length: ${maskBase64.length}`);
    }
  }

  const hair = hair_style || "Keep original hair";
  const makeup = makeup_style || "Natural look";
  let prompt = prompt_text
    ? PROMPTS.HEADSHOT_PRESET(prompt_text)
    : PROMPTS.HEADSHOT(hair, makeup);

  // Append mask instructions when a semantic mask is present
  if (maskResult) {
    const colorLines = Array.isArray(mask_color_map) && mask_color_map.length > 0
      ? mask_color_map
          .map(({ hex, customPrompt }) => {
            const promptForColor = (customPrompt || '').trim();
            if (!promptForColor) {
              return `  - ${hex}: no specific instruction was provided for this color; make minimal, conservative edits only in this region`;
            }
            return `  - ${hex}: "${promptForColor}" (apply this only where the ${hex} guide color is drawn on the portrait)`;
          })
          .join('\n')
      : '  - All colored guide regions: apply the requested changes only in those marked areas';

    prompt += `\n\nThe input portrait already includes the user's color guide strokes drawn directly on top of the face and hair:\n${colorLines}\nTreat these strokes as rough spatial guidance, not precise boundaries. Apply only the requested edits in the corresponding colored regions, and keep all unmarked areas unchanged.`;
  }

  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("ai_model_preference, ai_model_headshot_generate")
    .eq("user_id", userId)
    .single();
  const model = resolveModelFromSettings(
    userSettings,
    "ai_model_headshot_generate",
    DEFAULT_IMAGE_MODEL
  );
  const apiVersion = getGeminiApiVersion(model);
  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, apiVersion });
  console.log(`[processHeadshotGenerate] Calling Gemini API with prompt length: ${prompt.length}`);
  // Build a single Gemini input image. If mask exists, hard-fail on any compose issue.
  let geminiInputImage = selfieResult;
  if (maskResult) {
    console.log("[processHeadshotGenerate] Compositing mask onto selfie before Gemini call");
    geminiInputImage = await composeHeadshotWithMask(selfieResult, maskResult, {
      fit: mask_render_fit,
      width: mask_render_width,
      height: mask_render_height,
    });
  }
  const geminiImages = [geminiInputImage];

  // Generate the headshot via Gemini - pass full result object to include mime-type
  const headshotB64 = await callGeminiAPI(
    prompt,
    geminiImages,
    model,
    "IMAGE",
    perfTracker,
    timingTracker
  );
  console.log("[Gemini] CALL COMPLETE", { job_id: jobId });
  console.log(`[processHeadshotGenerate] Gemini API returned, headshot base64 length: ${headshotB64?.length || 0}`);
  // Upload and store the headshot
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const headshotKey = jobId ? `headshot-${jobId}` : `headshot-${stamp}`;
  const outputFolder = output_folder || "headshots";
  const storagePath = `${userId}/ai/${outputFolder}/${headshotKey}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    headshotB64,
    storagePath
  );
  // Update the user's settings to reference the new headshot
  if (!skip_user_settings_update) {
    await supabase
      .from("user_settings")
      .update({ headshot_image_id: imageId })
      .eq("user_id", userId);
  }
  return { image_id: imageId, storage_key: storageKey };
}

module.exports = { processHeadshotGenerate };
