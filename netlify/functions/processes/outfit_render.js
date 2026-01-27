"use strict";

// Handler for rendering an outfit on the user's body.
// Now supports client-side stacked images via stacked_image_id input.
// When stacked_image_id is provided, we download only 3 images total:
// body + head + stacked_items, which fits well under all model limits.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI
} = require("../utils");

/**
 * Renders an outfit on the user's body shot. Supports two input modes:
 * 1. stacked_image_id: Pre-stacked wardrobe items (recommended, faster)
 * 2. selected: Array of wardrobe items to fetch individually (legacy)
 *
 * @param {object} input - Job input including outfit_id, stacked_image_id or selected items
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - The ID of the user
 * @returns {Promise<{renders: Array<{image_id: number, storage_key: string}>}>} Render results
 */
async function processOutfitRender(input, supabase, userId) {
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

  // Retrieve user settings for default head/body shots and model preference
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("headshot_image_id, body_shot_image_id, ai_model_preference")
    .eq("user_id", userId)
    .single();

  const bodyId = userSettings?.body_shot_image_id;
  const headId = headshot_image_id || userSettings?.headshot_image_id;

  if (!bodyId || !headId) {
    throw new Error("Missing body shot or headshot");
  }

  const preferredModel = userSettings?.ai_model_preference || "gemini-2.5-flash-image";

  let stackedItemsB64;
  let itemCount;

  if (useStackedImage) {
    // Client-side stacked image - download from storage using the path!
    console.log(`[OutfitRender] Downloading pre-stacked image from storage: ${stacked_image_id}`);
    
    // stacked_image_id is actually a storage path like "user-id/ai/stacked/stacked-123.jpg"
    const { data: stackedBlob, error: downloadError } = await supabase
      .storage
      .from('media')
      .download(stacked_image_id);
    
    if (downloadError || !stackedBlob) {
      throw new Error(`Failed to download stacked image: ${downloadError?.message}`);
    }
    
    // Convert blob to base64
    const buffer = await stackedBlob.arrayBuffer();
    stackedItemsB64 = Buffer.from(buffer).toString('base64');
    
    itemCount = settings?.items_count || selected?.length || 0;
    console.log(`[OutfitRender] Pre-stacked image contains ${itemCount} items`);
  } else {
    // Legacy mode: fetch individual items (this shouldn't happen with client-side stacking)
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

    // For legacy mode with multiple items, we'd need server-side stacking here
    // For now, just take the first image as a fallback
    console.warn(`[OutfitRender] WARNING: Legacy mode with ${imageIdsToDownload.length} items. Consider using client-side stacking.`);
    stackedItemsB64 = await downloadImageFromStorage(supabase, imageIdsToDownload[0]);
    itemCount = imageIdsToDownload.length;
  }

  // Download head and body
  console.log(`[OutfitRender] Downloading body and head images`);
  const [headB64, bodyB64] = await Promise.all([
    downloadImageFromStorage(supabase, headId),
    downloadImageFromStorage(supabase, bodyId)
  ]);

  // Now we have exactly 3 images: body, head, stacked_items
  console.log(`[OutfitRender] Generating outfit with model: ${preferredModel}`);
  console.log(`[OutfitRender] Total images being sent to AI: 3 (body + head + stacked_items)`);

  // Use the stacked image prompt
  const finalPrompt = PROMPTS.OUTFIT_FINAL_STACKED(
    prompt || "No additional details",
    itemCount
  );

  // Send to AI: body, head, and stacked clothing items
  const allInputs = [bodyB64, headB64, stackedItemsB64];
  
  const finalImageB64 = await callGeminiAPI(
    finalPrompt,
    allInputs,
    preferredModel,
    "IMAGE"
  );

  console.log(`[OutfitRender] AI generation complete`);

  // Upload the final composite
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/outfits/${outfit_id}/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(
    supabase,
    userId,
    finalImageB64,
    storagePath
  );

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

  return { 
    renders: [{ image_id: imageId, storage_key: storageKey }],
    items_count: itemCount,
    used_stacked_image: useStackedImage
  };
}

module.exports = { processOutfitRender };
