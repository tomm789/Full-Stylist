"use strict";

// This module defines the logic for processing "auto_tag" jobs. It
// downloads the image associated with the wardrobe item, constructs
// prompts to pass to the Gemini model, parses the AI response, and
// writes the resulting attributes back into the database. Extracting
// this logic into its own file simplifies the main job runner and
// allows for easier testing and maintenance.

const { PROMPTS } = require("../prompts");
const { downloadImageFromStorage, callGeminiAPI, getGeminiApiVersion, resolveModelFromSettings } = require("../utils");

/**
 * Process an auto-tag job by analyzing a clothing item image and
 * extracting attributes. The function writes new attributes and
 * updates to the wardrobe item into Supabase.
 *
 * @param {object} input - Job input containing wardrobe_item_id and image_ids
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - The Supabase client
 * @param {object} perfTracker - Optional performance tracker for timing measurements
 * @param {object} timingTracker - Optional timing tracker for detailed step-by-step timing
 * @param {object} preDownloadedImageData - Optional pre-downloaded image data { base64, mimeType } to avoid redundant downloads
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<object>} A summary of the AI result and any updates applied
 */
async function processAutoTag(input, supabase, perfTracker = null, timingTracker = null, preDownloadedImageData = null, jobId = null) {
  const { wardrobe_item_id, image_ids } = input;
  if (!wardrobe_item_id || !image_ids?.length) {
    throw new Error("Missing ID or images");
  }
  
  // Use pre-downloaded image if provided, otherwise download from storage
  // Fetch the primary image (or use pre-downloaded) and necessary metadata concurrently
  let imageB64Promise;
  if (preDownloadedImageData && preDownloadedImageData.base64) {
    // Use the pre-downloaded image data to avoid redundant storage download
    console.log(`[processAutoTag] Using pre-downloaded image (skipping storage download, saving ~5s)`);
    imageB64Promise = Promise.resolve(preDownloadedImageData);
  } else {
    // Download from storage if no pre-downloaded data provided
    console.log(`[processAutoTag] Downloading image from storage (image_id: ${image_ids[0]})...`);
    imageB64Promise = downloadImageFromStorage(supabase, image_ids[0], timingTracker);
  }
  
  const [imageResult, catRes, subRes, attrRes, itemRes] = await Promise.all([
    imageB64Promise,
    supabase.from("wardrobe_categories").select("id, name").order("sort_order"),
    supabase.from("wardrobe_subcategories").select("id, name, category_id").order("sort_order"),
    supabase.from("attribute_definitions").select("id, key, name"),
    supabase.from("wardrobe_items").select("owner_user_id").eq("id", wardrobe_item_id).single()
  ]);
  const categories = catRes.data || [];
  const subcategories = subRes.data || [];
  const catList = categories.map((c) => c.name).join(", ");
  const subList = subcategories.map((s) => s.name).join(", ");
  const prompt = PROMPTS.AUTO_TAG(catList, subList);
  // Resolve model from user settings (respect ai_model_auto_tag preference)
  let model = "gemini-2.5-flash-image";
  const ownerId = itemRes.data?.owner_user_id;
  if (ownerId) {
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("ai_model_preference, ai_model_auto_tag")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (userSettings) {
      model = resolveModelFromSettings(userSettings, "ai_model_auto_tag", "gemini-2.5-flash-image");
    }
  }
  const apiVersion = getGeminiApiVersion(model);
  console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, apiVersion });
  const textResult = await callGeminiAPI(prompt, [imageResult], model, "TEXT", perfTracker, timingTracker);
  console.log("[Gemini] CALL COMPLETE", { job_id: jobId });
  let result;
  try {
    // Remove possible code fences around the JSON response
    const cleaned = textResult
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    result = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to parse AI JSON response");
  }
  // Build a map of attribute definition keys to IDs for quick lookup
  const defMap = new Map((attrRes.data || []).map((d) => [d.key, d.id]));

  // Collect all (defId, value) pairs from the AI result
  const valuePairs = [];
  for (const attr of result.attributes || []) {
    const defId = defMap.get(attr.key);
    if (!defId) continue;
    for (const val of attr.values || []) {
      valuePairs.push({ defId, value: val.value, confidence: val.confidence });
    }
  }

  const attributesToInsert = [];
  if (valuePairs.length > 0) {
    // Batch-fetch all existing attribute values in one query
    const defIds = [...new Set(valuePairs.map((p) => p.defId))];
    const { data: existingValues } = await supabase
      .from("attribute_values")
      .select("id, definition_id, value")
      .in("definition_id", defIds);

    // Build lookup map: "defId|lowercase_value" → id
    const valueMap = new Map();
    for (const ev of existingValues || []) {
      valueMap.set(`${ev.definition_id}|${ev.value.toLowerCase()}`, ev.id);
    }

    // Identify missing values and batch-insert them
    const missingValues = valuePairs
      .filter((p) => !valueMap.has(`${p.defId}|${p.value.toLowerCase()}`))
      .map((p) => ({ definition_id: p.defId, value: p.value }));

    // Deduplicate missing values by defId+lowercase value
    const seen = new Set();
    const uniqueMissing = missingValues.filter((mv) => {
      const key = `${mv.definition_id}|${mv.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueMissing.length > 0) {
      const { data: inserted } = await supabase
        .from("attribute_values")
        .upsert(uniqueMissing, { onConflict: "definition_id,value", ignoreDuplicates: true })
        .select("id, definition_id, value");

      for (const iv of inserted || []) {
        valueMap.set(`${iv.definition_id}|${iv.value.toLowerCase()}`, iv.id);
      }
    }

    // Build entity_attributes rows
    for (const pair of valuePairs) {
      const valueId = valueMap.get(`${pair.defId}|${pair.value.toLowerCase()}`);
      if (valueId) {
        attributesToInsert.push({
          entity_type: "wardrobe_item",
          entity_id: wardrobe_item_id,
          definition_id: pair.defId,
          value_id: valueId,
          raw_value: pair.value,
          confidence: pair.confidence,
          source: "ai"
        });
      }
    }
  }

  // Insert any new attributes into the entity_attributes table
  if (attributesToInsert.length) {
    await supabase.from("entity_attributes").insert(attributesToInsert);
  }
  // Determine updates to the wardrobe item record based on AI output
  const updates = {};
  if (result.suggested_title) updates.title = result.suggested_title;
  if (result.suggested_notes) updates.description = result.suggested_notes;
  const colorAttr = result.attributes?.find((a) => a.key === "color");
  if (colorAttr?.values?.[0]) updates.color_primary = colorAttr.values[0].value;
  if (result.recognized_category) {
    const matchedCat = categories.find(
      (c) => c.name.toLowerCase() === result.recognized_category.toLowerCase()
    );
    if (matchedCat) {
      updates.category_id = matchedCat.id;
      if (result.recognized_subcategory) {
        const matchedSub = subcategories.find(
          (s) =>
            s.name.toLowerCase() === result.recognized_subcategory.toLowerCase() &&
            s.category_id === matchedCat.id
        );
        updates.subcategory_id = matchedSub ? matchedSub.id : null;
      } else {
        updates.subcategory_id = null;
      }
    }
  }
  // Apply updates to the wardrobe item record
  if (Object.keys(updates).length > 0) {
    await supabase.from("wardrobe_items").update(updates).eq("id", wardrobe_item_id);
  }
  return { ...result, updates_applied: updates };
}

module.exports = { processAutoTag };
