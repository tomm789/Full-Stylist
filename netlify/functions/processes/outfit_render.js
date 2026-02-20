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
  DEFAULT_IMAGE_MODEL
} = require("../utils");

/**
 * Generates a description for an outfit based on its items
 * Runs in parallel with image generation for fast user feedback
 */
async function generateOutfitDescription(outfitId, itemDetails, supabase, perfTracker = null, jobId = null) {
  console.log(`[OutfitDescription] Starting description generation for outfit ${outfitId}`);
  const startTime = Date.now();
  
  try {
    // Build the description prompt
    const itemsList = itemDetails.map(item => {
      const parts = [];
      if (item.category) parts.push(item.category);
      if (item.title) parts.push(item.title);
      if (item.color_primary) parts.push(`(${item.color_primary})`);
      if (item.brand) parts.push(`by ${item.brand}`);
      return `- ${parts.join(' ')}`;
    }).join('\n');

    const prompt = `You are a professional fashion stylist. Analyze this outfit and provide a JSON response.

OUTFIT ITEMS:
${itemsList}

Provide a JSON response with this exact structure:
{
  "title": "A short outfit title (max 25 characters)",
  "description": "A 2-3 sentence description of the overall outfit style and aesthetic",
  "occasions": ["occasion1", "occasion2", "occasion3"],
  "style_tags": ["tag1", "tag2", "tag3"],
  "season": "spring|summer|fall|winter|all-season"
}

Guidelines:
- Title must be 25 characters or fewer (short, punchy, no quotes). If uncertain, keep it very short.
- Description should be engaging and highlight how the pieces work together
- Occasions should be specific (e.g., "casual brunch", "business meeting", "date night")
- Provide exactly 3 occasions
- Use Title Case for occasions (e.g., "Casual Brunch")
- Style tags should describe the overall vibe (e.g., "minimalist", "preppy", "streetwear")
- Provide exactly 3 style tags
- Use Title Case for style tags (e.g., "Minimalist")
- Keep it concise and actionable

Respond with ONLY the JSON object, no additional text.`;

    // Call Gemini with text-only model (much faster than image generation)
    const model = "gemini-2.5-flash";
    const apiVersion = getGeminiApiVersion(model);
    console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, apiVersion });
    const response = await callGeminiAPI(
      prompt,
      [], // No images needed for description
      model,
      "TEXT",
      perfTracker,
      null
    );
    console.log("[Gemini] CALL COMPLETE", { job_id: jobId });

    // Parse the JSON response
    const description = parseDescriptionResponse(response);
    
    const { data: outfitRow } = await supabase
      .from('outfits')
      .select('title')
      .eq('id', outfitId)
      .maybeSingle();

    const existingTitle = (outfitRow?.title || '').trim();
    const isDefaultTitle =
      existingTitle === '' ||
      existingTitle.toLowerCase() === 'generated outfit' ||
      existingTitle.toLowerCase() === 'untitled outfit';

    const updates = {
      description: description.description,
      occasions: description.occasions,
      style_tags: description.styleTags,
      season: description.season,
      description_generated_at: new Date().toISOString()
    };

    if (description.title && isDefaultTitle) {
      updates.title = description.title;
    }

    // Save to database immediately
    const { error: updateError } = await supabase
      .from('outfits')
      .update(updates)
      .eq('id', outfitId);

    if (updateError) {
      console.error(`[OutfitDescription] Failed to save description:`, updateError);
      throw updateError;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[OutfitDescription] Description saved in ${(elapsed / 1000).toFixed(2)}s`);

    return description;
  } catch (error) {
    console.error(`[OutfitDescription] Error generating description:`, error);
    // Don't fail the entire job if description fails
    return null;
  }
}

/**
 * Parse the AI response and extract structured description data
 */
function parseDescriptionResponse(apiResponse) {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = apiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const rawTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const safeTitle = rawTitle ? rawTitle.slice(0, 25) : '';

    return {
      title: safeTitle,
      description: parsed.description || '',
      occasions: normalizeLabelList(parsed.occasions).slice(0, 3),
      styleTags: normalizeLabelList(parsed.style_tags).slice(0, 3),
      season: parsed.season || 'all-season',
    };
  } catch (error) {
    console.error('[OutfitDescription] Failed to parse JSON:', error);
    // Fallback to extracting what we can from raw text
    return {
      title: '',
      description: apiResponse.substring(0, 500).trim(),
      occasions: [],
      styleTags: [],
      season: 'all-season',
    };
  }
}

function normalizeLabel(value) {
  if (typeof value !== 'string') return '';
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  const lower = collapsed.toLowerCase();
  return lower.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function normalizeLabelList(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const normalized = [];

  for (const value of values) {
    const label = normalizeLabel(value);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }

  return normalized;
}

function calculateGridLayout(itemCount) {
  if (itemCount <= 1) return { cols: 1, rows: 1 };
  if (itemCount === 2) return { cols: 2, rows: 1 };
  if (itemCount <= 4) return { cols: 2, rows: 2 };
  if (itemCount <= 6) return { cols: 2, rows: 3 };
  if (itemCount <= 9) return { cols: 3, rows: 3 };
  if (itemCount <= 12) return { cols: 3, rows: 4 };
  const cols = Math.ceil(Math.sqrt(itemCount));
  return { cols, rows: Math.ceil(itemCount / cols) };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizeTrimBounds(rawBounds) {
  const left = clamp(Number(rawBounds?.left ?? 0), 0, 1);
  const top = clamp(Number(rawBounds?.top ?? 0), 0, 1);
  const right = clamp(Number(rawBounds?.right ?? 1), left + 0.001, 1);
  const bottom = clamp(Number(rawBounds?.bottom ?? 1), top + 0.001, 1);
  return { left, top, right, bottom };
}

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
 * Fetch outfit item details for description generation
 */
async function fetchOutfitItemDetails(outfitId, supabase, userId) {
  console.log(`[OutfitDescription] Fetching item details for outfit ${outfitId}`);
  
  try {
    // Use the existing function to get outfit items with wardrobe details
    const { data, error } = await supabase
  .rpc('get_outfit_items_with_details', {
    p_outfit_id: outfitId,
    p_viewer_id: userId,
  });

    if (error) {
      console.error(`[OutfitDescription] Error fetching items:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`[OutfitDescription] No items found for outfit ${outfitId}`);
      return [];
    }

    // Extract wardrobe item details from the JSONB column
    const itemDetails = data.map(row => {
      const item = row.wardrobe_item;
      
      return {
        title: item.name || item.title || 'Unknown item',
        brand: item.brand || null,
        color_primary: item.color || item.color_primary || null,
        category: null, // Category name would need separate lookup if needed
      };
    });

    console.log(`[OutfitDescription] Found ${itemDetails.length} items`);
    return itemDetails;
  } catch (error) {
    console.error(`[OutfitDescription] Exception fetching items:`, error);
    return [];
  }
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
