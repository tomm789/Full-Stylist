"use strict";

// Handler for rendering an outfit on the user's body.
// Now supports parallel description generation for fast user feedback.

const sharp = require('sharp');
const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  optimizeGeminiOutput,
  resolveModelFromSettings,
  getGeminiApiVersion,
  DEFAULT_IMAGE_MODEL,
} = require("../utils");
const { calculateGridLayout } = require("../lib/imageComposition");
const { generateOutfitDescription, fetchOutfitItemDetails } = require("./outfit_description");
const { clamp, normalizeTrimBounds } = require("./outfit_helpers");

async function composeCustomCanvasGrid(itemImageResults, wardrobeItemIds, settings = {}) {
  const CANVAS_WIDTH = 1536;
  const CANVAS_HEIGHT = 2048;
  const PADDING = 20;
  const canvasLayout = settings.canvas_layout || {};
  const canvasTrimMap = settings.canvas_trim_map || {};
  const { cols, rows } = calculateGridLayout(itemImageResults.length);
  const cellWidth = Math.floor((CANVAS_WIDTH - (cols - 1) * PADDING) / cols);
  const cellHeight = Math.floor((CANVAS_HEIGHT - (rows - 1) * PADDING) / rows);

  const getDefaultCenter = (index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      centerX: (col * (cellWidth + PADDING) + cellWidth / 2) / CANVAS_WIDTH,
      centerY: (row * (cellHeight + PADDING) + cellHeight / 2) / CANVAS_HEIGHT,
    };
  };

  const layers = await Promise.all(
    itemImageResults.map(async (result, index) => {
      const itemId = wardrobeItemIds[index];
      const imageBuffer = Buffer.from(result.base64, "base64");
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 1;
      const height = metadata.height || 1;
      const trim = normalizeTrimBounds(canvasTrimMap[itemId]?.bounds || null);
      const left = Math.floor(trim.left * width);
      const top = Math.floor(trim.top * height);
      const right = Math.ceil(trim.right * width);
      const bottom = Math.ceil(trim.bottom * height);
      const extractWidth = Math.max(1, right - left);
      const extractHeight = Math.max(1, bottom - top);
      const croppedBuffer = await sharp(imageBuffer)
        .extract({ left, top, width: extractWidth, height: extractHeight })
        .png()
        .toBuffer();

      const itemLayout = canvasLayout[itemId] || {};
      const defaultCenter = getDefaultCenter(index);
      const centerX = clamp(Number(itemLayout.centerX ?? defaultCenter.centerX), 0.05, 0.95);
      const centerY = clamp(Number(itemLayout.centerY ?? defaultCenter.centerY), 0.05, 0.95);
      const userScale = clamp(Number(itemLayout.scale ?? 1), 0.55, 2.2);
      const zIndex = Number.isFinite(itemLayout.zIndex) ? itemLayout.zIndex : index;

      const baseScale = Math.min(cellWidth / extractWidth, cellHeight / extractHeight);
      const finalWidth = Math.max(1, Math.round(extractWidth * baseScale * userScale));
      const finalHeight = Math.max(1, Math.round(extractHeight * baseScale * userScale));
      const leftPx = Math.round(centerX * CANVAS_WIDTH - finalWidth / 2);
      const topPx = Math.round(centerY * CANVAS_HEIGHT - finalHeight / 2);

      const renderedBuffer = await sharp(croppedBuffer)
        .resize(finalWidth, finalHeight, { fit: "fill" })
        .png()
        .toBuffer();

      return { input: renderedBuffer, left: leftPx, top: topPx, zIndex };
    })
  );

  layers.sort((a, b) => a.zIndex - b.zIndex);
  const composedBuffer = await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: "#FFFFFF",
    },
  })
    .composite(layers.map((layer) => ({ input: layer.input, left: layer.left, top: layer.top })))
    .jpeg({ quality: 92 })
    .toBuffer();

  return composedBuffer.toString("base64");
}

/**
 * Renders an outfit on the user's body shot. Supports two input modes:
 * 1. stacked_image_id: Pre-stacked wardrobe items (recommended, faster)
 * 2. selected: Array of wardrobe items to fetch individually (legacy)
 *
 * NOW WITH PARALLEL DESCRIPTION GENERATION for fast user feedback!
 *
 * @param {object} input - Job input including outfit_id, stacked_image_id or selected items
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - The ID of the user
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<{renders: Array<{image_id: number, storage_key: string}>}>} Render results
 */
async function processOutfitRender(input, supabase, userId, perfTracker = null, timingTracker = null, jobId = null) {
  const {
    outfit_id,
    stacked_image_id,
    selected,
    prompt,
    settings,
    headshot_image_id,
    reference_image_id
  } = input;

  if (!outfit_id) {
    throw new Error("Missing outfit_id");
  }

  const useReferenceImage = !!reference_image_id;

  // Require either reference image OR stacked_image_id OR selected items
  if (!useReferenceImage && !stacked_image_id && (!selected || selected.length === 0)) {
    throw new Error("Missing reference image, stacked_image_id, or selected items");
  }

  const useStackedImage = !useReferenceImage && !!stacked_image_id;
  if (settings?.custom_layout_enabled) {
    const customLayoutCount = settings?.canvas_layout
      ? Object.keys(settings.canvas_layout).length
      : 0;
    console.log(`[OutfitRender] Custom canvas layout enabled (${customLayoutCount} item overrides)`);
  }
  const modeLabel = useReferenceImage
    ? 'reference'
    : useStackedImage
      ? 'pre-stacked'
      : 'individual';
  console.log(`[OutfitRender] Processing outfit ${outfit_id}, using ${modeLabel} images`);

  // Retrieve user settings for default head/body shots, model preference, and headshot inclusion setting
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("headshot_image_id, body_shot_image_id, ai_model_preference, ai_model_outfit_render, include_headshot_in_generation")
    .eq("user_id", userId)
    .single();

  const bodyId = userSettings?.body_shot_image_id;
  const includeHeadshot =
    !useReferenceImage && (userSettings?.include_headshot_in_generation ?? false);
  const headId = includeHeadshot ? (headshot_image_id || userSettings?.headshot_image_id) : null;

  if (!bodyId) {
    throw new Error("Missing body shot");
  }

  // Only require headshot if the setting is enabled
  if (includeHeadshot && !headId) {
    throw new Error("Missing headshot (required when include_headshot_in_generation is enabled)");
  }

  const preferredModel = resolveModelFromSettings(
    userSettings,
    "ai_model_outfit_render",
    DEFAULT_IMAGE_MODEL
  );

  // START PARALLEL OPERATIONS
  // 1. Description (fast: 1-3s) — fire-and-forget until end
  // 2. Outfit image(s) — stacked or legacy
  // 3. Body (+ optional headshot) — required for AI
  const descriptionPromise = (async () => {
    const itemDetails = await fetchOutfitItemDetails(outfit_id, supabase, userId);
    if (itemDetails.length > 0) {
      return await generateOutfitDescription(outfit_id, itemDetails, supabase, perfTracker, jobId);
    }
    return null;
  })();

  const outfitImagePromise = (async () => {
    if (useReferenceImage) {
      console.log(`[OutfitRender] Downloading reference image from storage: ${reference_image_id}`);
      const referenceResult = await downloadImageFromStorage(
        supabase,
        reference_image_id,
        timingTracker
      );
      return { referenceResult, itemCount: selected?.length || 0 };
    }

    if (useStackedImage) {
      console.log(`[OutfitRender] Downloading pre-stacked image from storage: ${stacked_image_id}`);
      const { data: stackedBlob, error: downloadError } = await supabase
        .storage
        .from('media')
        .download(stacked_image_id);
      if (downloadError) {
        console.error(`[OutfitRender] Storage download error:`, downloadError);
        throw new Error(`Failed to download stacked image: ${downloadError.message}`);
      }
      if (!stackedBlob) {
        throw new Error('Downloaded blob is null or undefined');
      }
      console.log(`[OutfitRender] Downloaded blob size: ${stackedBlob.size} bytes, type: ${stackedBlob.type}`);
      const buffer = await stackedBlob.arrayBuffer();
      console.log(`[OutfitRender] Converted to ArrayBuffer, length: ${buffer.byteLength}`);
      const stackedItemsB64 = Buffer.from(buffer).toString('base64');
      console.log(`[OutfitRender] Converted to base64, length: ${stackedItemsB64.length} chars`);
      const itemCount = settings?.items_count || selected?.length || 0;
      console.log(`[OutfitRender] Pre-stacked image contains ${itemCount} items`);
      return { stackedItemsB64, itemCount };
    }
    // Legacy mode: fetch individual items
    console.log(`[OutfitRender] Legacy mode: fetching ${selected.length} individual items`);
    const wardrobeItemIds = selected.map((s) => s.wardrobe_item_id);
    const { data: allLinks } = await supabase
      .from("wardrobe_item_images")
      .select("wardrobe_item_id, type, sort_order, image_id")
      .in("wardrobe_item_id", wardrobeItemIds);
    const linksByItem = new Map();
    (allLinks || []).forEach((link) => {
      if (!linksByItem.has(link.wardrobe_item_id)) {
        linksByItem.set(link.wardrobe_item_id, []);
      }
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
    console.log(`[OutfitRender] Legacy mode: downloading ${imageIdsToDownload.length} images: ${imageIdsToDownload.join(', ')}`);
    const itemImageResults = await Promise.all(
      imageIdsToDownload.map(id => {
        console.log(`[OutfitRender] Downloading item image: ${id}`);
        return downloadImageFromStorage(supabase, id, timingTracker);
      })
    );
    console.log(`[OutfitRender] Downloaded ${itemImageResults.length} item images`);
    let stackedItemsB64 = itemImageResults.map(result => result.base64);
    if (settings?.custom_layout_enabled && wardrobeItemIds.length === itemImageResults.length) {
      try {
        stackedItemsB64 = await composeCustomCanvasGrid(itemImageResults, wardrobeItemIds, settings);
        console.log(`[OutfitRender] Composed custom layout grid for ${wardrobeItemIds.length} items`);
      } catch (composeError) {
        console.warn("[OutfitRender] Failed custom layout composition, falling back to legacy item inputs", composeError);
      }
    }
    const itemCount = imageIdsToDownload.length;
    return { stackedItemsB64, itemCount };
  })();

  const bodyImagePromise = (async () => {
    console.log(`[OutfitRender] Downloading body image${includeHeadshot ? ' and headshot' : ''}`);
    const downloadPromises = [downloadImageFromStorage(supabase, bodyId, timingTracker)];
    if (includeHeadshot && headId) {
      downloadPromises.push(downloadImageFromStorage(supabase, headId, timingTracker));
    }
    const downloadedImageResults = await Promise.all(downloadPromises);
    const bodyResult = downloadedImageResults[0];
    const headResult = includeHeadshot && downloadedImageResults[1] ? downloadedImageResults[1] : null;
    if (includeHeadshot && headResult) {
      console.log(`[OutfitRender] Downloaded head (${headResult.base64.length} chars) and body (${bodyResult.base64.length} chars)`);
    } else {
      console.log(`[OutfitRender] Downloaded body (${bodyResult.base64.length} chars), headshot excluded`);
    }
    return { bodyResult, headResult };
  })();

  const [{ stackedItemsB64, referenceResult, itemCount }, { bodyResult, headResult }] = await Promise.all([
    outfitImagePromise,
    bodyImagePromise
  ]);

  // Prepare all inputs for Gemini
  let allInputs = [bodyResult];
  if (includeHeadshot && headResult) {
    allInputs.push(headResult);
  }

  if (useReferenceImage && referenceResult) {
    allInputs = [bodyResult, referenceResult];
  } else if (Array.isArray(stackedItemsB64)) {
    const stackedInputs = stackedItemsB64.map(b64 =>
      typeof b64 === 'string' ? { base64: b64, mimeType: 'image/jpeg' } : b64
    );
    allInputs = [...allInputs, ...stackedInputs];
  } else {
    allInputs.push({ base64: stackedItemsB64, mimeType: 'image/jpeg' });
  }

  console.log(`[OutfitRender] Total images being sent to AI: ${allInputs.length}`);

  // Use existing prompt system from prompts.js
  const renderPrompt = useReferenceImage
    ? PROMPTS.OUTFIT_REFERENCE(prompt || "Match the outfit exactly")
    : useStackedImage
      ? PROMPTS.OUTFIT_FINAL_STACKED(prompt || "Style this outfit naturally", itemCount, includeHeadshot)
      : PROMPTS.OUTFIT_FINAL(prompt || "Style this outfit naturally", itemCount, includeHeadshot);

  const apiVersion = getGeminiApiVersion(preferredModel);
  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model: preferredModel, apiVersion });
  console.log(`[OutfitRender] Generating outfit with model: ${preferredModel}`);

  // Generate the outfit image
  const finalImageB64 = await callGeminiAPI(
    renderPrompt,
    allInputs,
    preferredModel,
    "IMAGE",
    perfTracker,
    timingTracker
  );

  console.log("[Gemini] CALL COMPLETE", { job_id: jobId });
  console.log(`[OutfitRender] AI generation complete, result length: ${finalImageB64.length} chars`);

  // Optimize the generated image (with timing for latency debugging)
  console.log(`[OutfitRender] Optimizing generated image...`);
  const optStart = Date.now();
  const optimizedImageB64 = await optimizeGeminiOutput(finalImageB64);
  const optMs = Date.now() - optStart;
  console.log(`[Perf] Optimization took: ${optMs} ms`);
  console.log(`[OutfitRender] Image optimization complete`);

  // Upload the optimized final composite (with timing for latency debugging)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const renderKey = jobId ? `render-${jobId}` : `render-${stamp}`;
  const storagePath = `${userId}/ai/outfits/${outfit_id}/${renderKey}.jpg`;
  const uploadStart = Date.now();
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    optimizedImageB64,
    storagePath
  );
  const uploadMs = Date.now() - uploadStart;
  console.log(`[Perf] Upload to Supabase took: ${uploadMs} ms`);
  console.log(`[OutfitRender] Uploaded final image: ${storageKey}`);

  // Record the render and update the outfit cover image
  await supabase.from("outfit_renders").insert({
    outfit_id,
    image_id: imageId,
    prompt: prompt || null,
    settings: { 
      ...(settings || {}), 
      items_count: itemCount,
      used_stacked_image: useStackedImage,
      used_reference_image: useReferenceImage
    },
    status: "succeeded"
  });

  await supabase
    .from("outfits")
    .update({ cover_image_id: imageId })
    .eq("id", outfit_id);

  console.log(`[OutfitRender] Outfit render complete`);

  // Wait for description to complete (it should be done by now)
  try {
    await descriptionPromise;
    console.log(`[OutfitRender] Description generation completed`);
  } catch (error) {
    console.error(`[OutfitRender] Description generation failed, but continuing:`, error);
  }

  // Job result: include outfit_id and render pointer so client can show image immediately
  return {
    outfit_id: outfit_id,
    image_id: imageId,
    storage_key: storageKey,
    renders: [{ image_id: imageId, storage_key: storageKey }],
    items_count: itemCount,
    used_stacked_image: useStackedImage,
    base64_result: optimizedImageB64,
    mime_type: "image/jpeg",
  };
}

module.exports = { processOutfitRender };
