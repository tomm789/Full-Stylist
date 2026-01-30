"use strict";

// Handler for rendering an outfit on the user's body.
// Now supports parallel description generation for fast user feedback.

const sharp = require('sharp');
const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  optimizeGeminiOutput
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
  "description": "A 2-3 sentence description of the overall outfit style and aesthetic",
  "occasions": ["occasion1", "occasion2", "occasion3"],
  "style_tags": ["tag1", "tag2", "tag3"],
  "season": "spring|summer|fall|winter|all-season"
}

Guidelines:
- Description should be engaging and highlight how the pieces work together
- Occasions should be specific (e.g., "casual brunch", "business meeting", "date night")
- Provide exactly 3 occasions
- Style tags should describe the overall vibe (e.g., "minimalist", "preppy", "streetwear")
- Provide exactly 3 style tags
- Keep it concise and actionable

Respond with ONLY the JSON object, no additional text.`;

    // Call Gemini with text-only model (much faster than image generation)
    const model = "gemini-2.5-flash";
    console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model });
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
    
    // Save to database immediately
    const { error: updateError } = await supabase
      .from('outfits')
      .update({
        description: description.description,
        occasions: description.occasions,
        style_tags: description.styleTags,
        season: description.season,
        description_generated_at: new Date().toISOString()
      })
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
    
    return {
      description: parsed.description || '',
      occasions: Array.isArray(parsed.occasions) ? parsed.occasions.slice(0, 3) : [],
      styleTags: Array.isArray(parsed.style_tags) ? parsed.style_tags.slice(0, 3) : [],
      season: parsed.season || 'all-season',
    };
  } catch (error) {
    console.error('[OutfitDescription] Failed to parse JSON:', error);
    // Fallback to extracting what we can from raw text
    return {
      description: apiResponse.substring(0, 500).trim(),
      occasions: [],
      styleTags: [],
      season: 'all-season',
    };
  }
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
    headshot_image_id
  } = input;

  if (!outfit_id) {
    throw new Error("Missing outfit_id");
  }

  // Require either stacked_image_id OR selected items
  if (!stacked_image_id && (!selected || selected.length === 0)) {
    throw new Error("Missing stacked_image_id or selected items");
  }

  const useStackedImage = !!stacked_image_id;
  console.log(`[OutfitRender] Processing outfit ${outfit_id}, using ${useStackedImage ? 'pre-stacked' : 'individual'} images`);

  // Retrieve user settings for default head/body shots, model preference, and headshot inclusion setting
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("headshot_image_id, body_shot_image_id, ai_model_preference, include_headshot_in_generation")
    .eq("user_id", userId)
    .single();

  const bodyId = userSettings?.body_shot_image_id;
  const includeHeadshot = userSettings?.include_headshot_in_generation ?? false;
  const headId = includeHeadshot ? (headshot_image_id || userSettings?.headshot_image_id) : null;

  if (!bodyId) {
    throw new Error("Missing body shot");
  }

  // Only require headshot if the setting is enabled
  if (includeHeadshot && !headId) {
    throw new Error("Missing headshot (required when include_headshot_in_generation is enabled)");
  }

  const preferredModel = userSettings?.ai_model_preference || "gemini-2.5-flash-image";

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
    const stackedItemsB64 = itemImageResults.map(result => result.base64);
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

  const [{ stackedItemsB64, itemCount }, { bodyResult, headResult }] = await Promise.all([
    outfitImagePromise,
    bodyImagePromise
  ]);

  // Prepare all inputs for Gemini
  let allInputs = [bodyResult];
  if (includeHeadshot && headResult) {
    allInputs.push(headResult);
  }
  
  if (Array.isArray(stackedItemsB64)) {
    const stackedInputs = stackedItemsB64.map(b64 => 
      typeof b64 === 'string' ? { base64: b64, mimeType: 'image/jpeg' } : b64
    );
    allInputs = [...allInputs, ...stackedInputs];
  } else {
    allInputs.push({ base64: stackedItemsB64, mimeType: 'image/jpeg' });
  }

  console.log(`[OutfitRender] Total images being sent to AI: ${allInputs.length}`);

  // Use existing prompt system from prompts.js
  const renderPrompt = useStackedImage
    ? PROMPTS.OUTFIT_FINAL_STACKED(prompt || "Style this outfit naturally", itemCount, includeHeadshot)
    : PROMPTS.OUTFIT_FINAL(prompt || "Style this outfit naturally", itemCount, includeHeadshot);

  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model: preferredModel });
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
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/outfits/${outfit_id}/${timestamp}.jpg`;
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
      used_stacked_image: useStackedImage
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