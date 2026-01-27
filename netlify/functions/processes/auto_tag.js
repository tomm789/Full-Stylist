"use strict";

// This module defines the logic for processing "auto_tag" jobs. It
// downloads the image associated with the wardrobe item, constructs
// prompts to pass to the Gemini model, parses the AI response, and
// writes the resulting attributes back into the database. Extracting
// this logic into its own file simplifies the main job runner and
// allows for easier testing and maintenance.

const { PROMPTS } = require("../prompts");
const { downloadImageFromStorage, callGeminiAPI } = require("../utils");

/**
 * Process an auto-tag job by analyzing a clothing item image and
 * extracting attributes. The function writes new attributes and
 * updates to the wardrobe item into Supabase.
 *
 * @param {object} input - Job input containing wardrobe_item_id and image_ids
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - The Supabase client
 * @returns {Promise<object>} A summary of the AI result and any updates applied
 */
async function processAutoTag(input, supabase) {
  const { wardrobe_item_id, image_ids } = input;
  if (!wardrobe_item_id || !image_ids?.length) {
    throw new Error("Missing ID or images");
  }
  // Fetch the primary image and necessary metadata concurrently
  const [imageB64, catRes, subRes, attrRes] = await Promise.all([
    downloadImageFromStorage(supabase, image_ids[0]),
    supabase.from("wardrobe_categories").select("id, name").order("sort_order"),
    supabase.from("wardrobe_subcategories").select("id, name, category_id").order("sort_order"),
    supabase.from("attribute_definitions").select("id, key, name")
  ]);
  const categories = catRes.data || [];
  const subcategories = subRes.data || [];
  const catList = categories.map((c) => c.name).join(", ");
  const subList = subcategories.map((s) => s.name).join(", ");
  const prompt = PROMPTS.AUTO_TAG(catList, subList);
  // Call the Gemini API with the clothing image to extract JSON attributes
  const textResult = await callGeminiAPI(prompt, [imageB64], "gemini-2.5-flash-image", "TEXT");
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
  const attributesToInsert = [];
  for (const attr of result.attributes || []) {
    const defId = defMap.get(attr.key);
    if (!defId) continue;
    for (const val of attr.values || []) {
      // Look up existing attribute values (case‑insensitive)
      let { data: value } = await supabase
        .from("attribute_values")
        .select("id")
        .eq("definition_id", defId)
        .ilike("value", val.value)
        .single();
      // Insert new value if it doesn't exist
      if (!value) {
        const { data: newValue } = await supabase
          .from("attribute_values")
          .insert({ definition_id: defId, value: val.value })
          .select("id")
          .single();
        value = newValue;
      }
      if (value?.id) {
        attributesToInsert.push({
          entity_type: "wardrobe_item",
          entity_id: wardrobe_item_id,
          definition_id: defId,
          value_id: value.id,
          raw_value: val.value,
          confidence: val.confidence,
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