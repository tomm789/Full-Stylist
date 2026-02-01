"use strict";

// Unified job: generate product shot image AND text (title, description, attributes) in parallel.
// Single job produces both results; client polls once and receives combined payload.
// Matches outfit_render pattern: download once → parallel AI calls → persist both → job succeeded.

const { PROMPTS } = require("../prompts");
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  optimizeGeminiOutput,
} = require("../utils");

/**
 * Generates both product shot image and text (title, description, attributes) for a wardrobe item.
 * Runs image and text generation in parallel with one download.
 * Job succeeds only after BOTH branches persist successfully.
 *
 * @param {object} input - { item_id, source_image_id }
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - ID of the user
 * @param {object} perfTracker - Optional performance tracker
 * @param {object} timingTracker - Optional timing tracker
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<object>} Combined result with image + text fields
 */
async function processWardrobeItemGenerate(
  input,
  supabase,
  userId,
  perfTracker = null,
  timingTracker = null,
  jobId = null
) {
  const totalStart = Date.now();

  const { item_id, source_image_id } = input || {};
  const wardrobe_item_id = item_id;

  if (!wardrobe_item_id || !source_image_id) {
    throw new Error("wardrobe_item_generate requires item_id and source_image_id");
  }

  // Download source image once (shared by both branches)
  console.log(
    `[WardrobeItemGenerate] Downloading source image (source_image_id: ${source_image_id})...`
  );
  const setupStart = Date.now();
  const sourceImage = await downloadImageFromStorage(supabase, source_image_id, timingTracker);
  const setupMs = Date.now() - setupStart;
  console.log(`[WardrobeItemGenerate] Setup/download took: ${setupMs} ms`);

  // Start both branches in the same tick (no await between creating promises)
  console.log("[WardrobeItemGenerate] Starting image + text branches (parallel execution)");

  // Image branch: Gemini IMAGE → optimize → upload → DB
  const imageBranch = (async () => {
    const imageStart = Date.now();
    const model = "gemini-2.5-flash-image";

    console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, branch: "image" });
    const productShotB64 = await callGeminiAPI(
      PROMPTS.PRODUCT_SHOT,
      [sourceImage], // <-- IMPORTANT: pass the downloaded source image
      model,
      "IMAGE",
      perfTracker,
      timingTracker
    );
    console.log("[Gemini] CALL COMPLETE", { job_id: jobId, branch: "image" });

    // Optimize output (same as outfit_render and wardrobe_item_render)
    const optimizeStart = Date.now();
    const optimizedB64 = await optimizeGeminiOutput(productShotB64);
    const optimizeMs = Date.now() - optimizeStart;
    console.log(`[WardrobeItemGenerate] Image branch optimize took: ${optimizeMs} ms`);

    // Upload to Supabase storage
    const uploadStart = Date.now();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const shotKey = jobId
  ? `product-${wardrobe_item_id}-${jobId}`
  : `product-${wardrobe_item_id}-${stamp}`;
const storagePath = `${userId}/ai/product_shots/${shotKey}.jpg`;
    const { imageId, storageKey } = await uploadImageToStorage(
      supabase,
      userId,
      optimizedB64,
      storagePath
    );
    const uploadMs = Date.now() - uploadStart;
    console.log(`[WardrobeItemGenerate] Image branch upload took: ${uploadMs} ms`);

    // Persist pointers: atomic bump + insert under advisory lock (avoids duplicate sort_order=0)
    const { error: rpcErr } = await supabase.rpc("bump_and_insert_product_shot", {
      p_wardrobe_item_id: wardrobe_item_id,
      p_image_id: imageId,
      p_type: "product_shot",
    });
    if (rpcErr) throw rpcErr;

    const imageBranchMs = Date.now() - imageStart;
    console.log(`[WardrobeItemGenerate] Image branch complete in ${imageBranchMs} ms`);

    // Partial result so client can paint image before text branch completes (~12–13s vs ~17s)
    if (jobId) {
      const partialResult = {
        base64_result: optimizedB64,
        mime_type: "image/jpeg",
        image_id: imageId,
        storage_key: storageKey,
      };
      await supabase
        .from("ai_jobs")
        .update({ result: partialResult, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      console.log(`[WardrobeItemGenerate] Partial result written (image only), job_id: ${jobId}`);
    }

    return {
      image_id: imageId,
      storage_key: storageKey,
      base64_result: optimizedB64,
      mime_type: "image/jpeg",
    };
  })();

  // Text branch: fetch metadata + Gemini TEXT → parse → persist attributes + wardrobe_items
  const textBranch = (async () => {
    const textStart = Date.now();

    // Fetch categories/subcategories/attribute_definitions in parallel with image processing
    const [catRes, subRes, attrRes] = await Promise.all([
      supabase.from("wardrobe_categories").select("id, name").order("sort_order"),
      supabase.from("wardrobe_subcategories").select("id, name, category_id").order("sort_order"),
      supabase.from("attribute_definitions").select("id, key, name"),
    ]);

    if (catRes.error) throw catRes.error;
    if (subRes.error) throw subRes.error;
    if (attrRes.error) throw attrRes.error;

    const categories = catRes.data || [];
    const subcategories = subRes.data || [];

    const catList = categories.map((c) => c.name).join(", ");
    const subList = subcategories.map((s) => s.name).join(", ");
    const prompt = PROMPTS.AUTO_TAG(catList, subList);

    // Call Gemini TEXT with gemini-2.5-flash (not -image)
    const model = "gemini-2.5-flash";
    console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, branch: "text" });
    const rawText = await callGeminiAPI(
      prompt,
      [sourceImage], // <-- IMPORTANT: pass the downloaded source image
      model,
      "TEXT",
      perfTracker,
      timingTracker
    );
    console.log("[Gemini] CALL COMPLETE", { job_id: jobId, branch: "text" });

    // Parse JSON response
    let result;
    try {
      const cleaned = String(rawText)
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch (e) {
      throw new Error("Failed to parse AI JSON response");
    }

    // Build attribute map and insert entity_attributes
    const defMap = new Map((attrRes.data || []).map((d) => [d.key, d.id]));
    const attributesToInsert = [];

    for (const attr of result.attributes || []) {
      const defId = defMap.get(attr.key);
      if (!defId) continue;

      for (const val of attr.values || []) {
        const v = String(val.value || "").trim();
        if (!v) continue;

        // Look up existing attribute value (case-insensitive)
        let valueId = null;
        const { data: existingVal, error: valErr } = await supabase
          .from("attribute_values")
          .select("id")
          .eq("definition_id", defId)
          .ilike("value", v)
          .maybeSingle();

        if (valErr) throw valErr;

        if (existingVal?.id) {
          valueId = existingVal.id;
        } else {
          const { data: newVal, error: newValErr } = await supabase
            .from("attribute_values")
            .insert({ definition_id: defId, value: v })
            .select("id")
            .single();
          if (newValErr) throw newValErr;
          valueId = newVal?.id || null;
        }

        if (valueId) {
          attributesToInsert.push({
            entity_type: "wardrobe_item",
            entity_id: wardrobe_item_id,
            definition_id: defId,
            value_id: valueId,
            raw_value: v,
            confidence: val.confidence,
            source: "ai",
          });
        }
      }
    }

    // Insert attributes (optional: you may want to delete existing ai attributes first; left unchanged)
    if (attributesToInsert.length) {
      const { error: insertAttrErr } = await supabase
        .from("entity_attributes")
        .insert(attributesToInsert);
      if (insertAttrErr) throw insertAttrErr;
    }

    // Determine updates to wardrobe item record
    const updates = {};
    if (result.suggested_title) updates.title = result.suggested_title;
    if (result.suggested_notes) updates.description = result.suggested_notes;

    const colorAttr = (result.attributes || []).find((a) => a.key === "color");
    if (colorAttr?.values?.[0]?.value) updates.color_primary = colorAttr.values[0].value;

    if (result.recognized_category) {
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === String(result.recognized_category).toLowerCase()
      );
      if (matchedCat) {
        updates.category_id = matchedCat.id;

        if (result.recognized_subcategory) {
          const matchedSub = subcategories.find(
            (s) =>
              s.category_id === matchedCat.id &&
              s.name.toLowerCase() === String(result.recognized_subcategory).toLowerCase()
          );
          updates.subcategory_id = matchedSub ? matchedSub.id : null;
        } else {
          updates.subcategory_id = null;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from("wardrobe_items")
        .update(updates)
        .eq("id", wardrobe_item_id);
      if (updErr) throw updErr;
    }

    const textBranchMs = Date.now() - textStart;
    console.log(`[WardrobeItemGenerate] Text branch complete in ${textBranchMs} ms`);

    return {
      suggested_title: result.suggested_title,
      suggested_notes: result.suggested_notes,
      attributes: result.attributes,
      updates_applied: updates,
    };
  })();

  // Await both branches; if either fails, job fails (no partial success)
  const [imageResult, textResult] = await Promise.all([imageBranch, textBranch]);

  const totalMs = Date.now() - totalStart;
  console.log(`[WardrobeItemGenerate] Total duration: ${totalMs} ms`);

  // Return combined result payload (GENERATED image + generated text)
  return {
    item_id: wardrobe_item_id,

    // Generated product shot
    image_id: imageResult.image_id,
    storage_key: imageResult.storage_key,
    base64_result: imageResult.base64_result,
    mime_type: imageResult.mime_type || "image/jpeg",

    // Generated text payload
    suggested_title: textResult.suggested_title,
    suggested_notes: textResult.suggested_notes,
    attributes: textResult.attributes,
    updates_applied: textResult.updates_applied,

    // Optional: include source reference (useful for debugging)
    source_image_id,
  };
}

module.exports = { processWardrobeItemGenerate };