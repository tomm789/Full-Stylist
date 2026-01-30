"use strict";

// Follow-up job: run auto_tag for a wardrobe item (title, description, attributes).
// Triggered after wardrobe_item_render succeeds. Not on the critical path for image display.

const { processAutoTag } = require("./auto_tag");

/**
 * Process a wardrobe_item_tag job. Input: item_id, image_ids (array of image record ids to analyze).
 * Delegates to existing auto_tag logic.
 *
 * @param {object} input - { item_id, image_ids } (item_id = wardrobe_item_id)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {object} perfTracker - Optional performance tracker
 * @param {object} timingTracker - Optional timing tracker
 * @param {string} [jobId] - Optional job ID for logging
 * @returns {Promise<object>} Same as processAutoTag
 */
async function processWardrobeItemTag(input, supabase, perfTracker = null, timingTracker = null, jobId = null) {
  const { item_id, image_ids } = input;
  const wardrobe_item_id = item_id;
  if (!wardrobe_item_id || !image_ids?.length) {
    throw new Error("wardrobe_item_tag requires item_id and image_ids array");
  }
  return processAutoTag(
    { wardrobe_item_id, image_ids },
    supabase,
    perfTracker,
    timingTracker,
    null,
    jobId
  );
}

module.exports = { processWardrobeItemTag };
