"use strict";

// Main Netlify function for processing AI jobs. This handler
// authenticates the request using the Supabase JWT, retrieves the
// referenced job from the database and dispatches processing to the
// appropriate module based on the job type. Each job type is defined
// in a separate module under ./processes to improve modularity.

const { supabaseAdmin } = require("./supabaseClient");
const { createPerformanceTracker, createTimingTracker, downloadImageFromStorage } = require("./utils");
const { processAutoTag } = require("./processes/auto_tag");
const { processProductShot } = require("./processes/product_shot");
const { processHeadshotGenerate } = require("./processes/headshot_generate");
const { processBodyShotGenerate } = require("./processes/body_shot_generate");
const { processOutfitRender } = require("./processes/outfit_render");
const { processOutfitMannequin } = require("./processes/outfit_mannequin");
const { processOutfitSuggest } = require("./processes/outfit_suggest");
const { processReferenceMatch } = require("./processes/reference_match");
const { processWardrobeItemRender } = require("./processes/wardrobe_item_render");
const { processWardrobeItemTag } = require("./processes/wardrobe_item_tag");
const { processWardrobeItemGenerate } = require("./processes/wardrobe_item_generate");

/**
 * Netlify function handler. Validates the HTTP method and the
 * Authorization header, retrieves the job from Supabase, and runs it
 * synchronously. Returns 200 on success or 500 on failure after processing completes.
 *
 * @param {object} event - The incoming request context
 * @param {object} context - The Lambda context provided by Netlify
 * @returns {Promise<object>} HTTP response object
 */
exports.handler = async (event, context) => {
  const handlerStartTime = Date.now();
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    // Extract and verify JWT from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Missing authorization header" })
      };
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token" })
      };
    }
    // Parse the job ID from the request body
    const body = JSON.parse(event.body || "{}");
    const { job_id } = body;
    if (!job_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "job_id is required" })
      };
    }
    // Retrieve the job record and verify ownership
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ai_jobs")
      .select("*")
      .eq("id", job_id)
      .eq("owner_user_id", user.id)
      .single();
    if (jobError || !job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Job not found" })
      };
    }
    if (job.status === "running") {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: "Job already running" })
      };
    }

    console.log("[AIJobRunner] HANDLER START", { job_id, job_type: job.job_type });

    // Update job status to running
    await supabaseAdmin
      .from("ai_jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", job_id);

    console.log("[AIJobRunner] BEFORE await processJob", { job_id, job_type: job.job_type });

    let outcome;
    try {
      outcome = await processJobAsync(job, user.id);
    } catch (err) {
      console.error("[AIJobRunner] processJobAsync threw:", err);
      outcome = { result: null, error: err.message || "Unknown error" };
    }

    console.log("[AIJobRunner] AFTER await processJob", { job_id, job_type: job.job_type });

    const duration_ms = Date.now() - handlerStartTime;
    const status = outcome.error ? "failed" : "succeeded";
    console.log("[AIJobRunner] RETURNING", { job_id, status, duration_ms });

    if (outcome.error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, job_id, error: outcome.error })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, job_id, status: "succeeded" })
    };
  } catch (err) {
    console.error("Handler Critical Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Internal server error" })
    };
  }
};

/**
 * Dispatches the job to the appropriate processor based on its type.
 * Fully awaits the selected processor. Updates the job record exactly once
 * after processing completes. Returns { result, error } for handler response.
 *
 * @param {object} job - The job record from the database
 * @param {string} userId - ID of the job owner
 * @returns {Promise<{result: object|null, error: string|null}>}
 */
async function processJobAsync(job, userId) {
  const job_id = job.id;

  // Create performance tracker at the start of the request
  const perfTracker = createPerformanceTracker();
  console.log(`[AIJobRunner] Created performance tracker: ${perfTracker.requestId} for job ${job_id} (${job.job_type})`);

  // Create timing tracker for detailed step-by-step timing
  const timingTracker = createTimingTracker();
  timingTracker.startJob();
  console.log(`[AIJobRunner] Starting job ${job_id} (${job.job_type})`);

  let result;
  let error = null;
  try {
    const input = job.input;
    switch (job.job_type) {
      case "batch":
        result = await processBatchJob(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "auto_tag":
        result = await processAutoTag(input, supabaseAdmin, perfTracker, timingTracker, null, job_id);
        break;
      case "product_shot":
        result = await processProductShot(input, supabaseAdmin, userId, perfTracker, timingTracker, null, job_id);
        break;
      case "headshot_generate":
        result = await processHeadshotGenerate(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "body_shot_generate":
        result = await processBodyShotGenerate(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "outfit_suggest":
        result = await processOutfitSuggest(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "reference_match":
        result = await processReferenceMatch(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "outfit_mannequin":
        result = await processOutfitMannequin(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "outfit_render":
        result = await processOutfitRender(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      case "wardrobe_item_render":
        result = await processWardrobeItemRender(input, supabaseAdmin, userId, perfTracker, timingTracker, null, job_id);
        break;
      case "wardrobe_item_tag":
        result = await processWardrobeItemTag(input, supabaseAdmin, perfTracker, timingTracker, job_id);
        break;
      case "wardrobe_item_generate":
        result = await processWardrobeItemGenerate(input, supabaseAdmin, userId, perfTracker, timingTracker, job_id);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
  } catch (err) {
    error = err.message || "Unknown error";
    console.error(`[AIJobRunner] Error processing ${job.job_type} job ${job_id}:`, err);
  }

  // Log performance comparison at the end of the request
  perfTracker.logComparison();

  // Log detailed timing breakdown
  timingTracker.logBreakdown(job.job_type);

  // Build the update payload based on success or failure (exactly once after processing)
  const updateData = {
    updated_at: new Date().toISOString(),
    status: error ? "failed" : "succeeded"
  };
  if (error) {
    updateData.error = error;
  } else {
    updateData.result = result;
  }
  await supabaseAdmin.from("ai_jobs").update(updateData).eq("id", job_id);

  return { result: error ? null : result, error };
}

/**
 * Processes a batch job that runs multiple tasks on the same image in parallel.
 * Downloads the image once and passes it to all tasks to avoid redundant downloads.
 * 
 * Expected input format:
 * {
 *   imageId: string,
 *   tasks: ['product_shot', 'auto_tag'],
 *   wardrobe_item_id: string,
 *   image_ids: string[] (for auto_tag)
 * }
 * 
 * @param {object} input - Batch job input
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - ID of the job owner
 * @param {object} perfTracker - Performance tracker
 * @param {object} timingTracker - Timing tracker
 * @returns {Promise<object>} Combined results from all tasks
 */
async function processBatchJob(input, supabase, userId, perfTracker, timingTracker, jobId = null) {
  const { imageId, tasks, wardrobe_item_id, image_ids } = input;
  
  if (!imageId || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("Batch job requires imageId and tasks array");
  }
  
  if (!wardrobe_item_id) {
    throw new Error("Batch job requires wardrobe_item_id");
  }
  
  console.log(`[BatchJob] Starting batch processing for imageId: ${imageId}, tasks: ${tasks.join(', ')}`);
  
  // Download the image once to a buffer (returns { base64, mimeType } object)
  console.log(`[BatchJob] Downloading image once for shared use...`);
  const imageData = await downloadImageFromStorage(supabase, imageId, timingTracker);
  console.log(`[BatchJob] Image downloaded successfully, length: ${imageData.base64.length}, mimeType: ${imageData.mimeType}`);
  
  // Prepare inputs for both tasks
  const productShotInput = tasks.includes('product_shot') ? {
    image_id: imageId,
    wardrobe_item_id
  } : null;
  
  const autoTagInput = tasks.includes('auto_tag') ? {
    wardrobe_item_id,
    image_ids: image_ids || []
  } : null;
  
  // Validate auto_tag input if needed
  if (tasks.includes('auto_tag')) {
    if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
      throw new Error("auto_tag task requires image_ids array");
    }
  }
  
  // CRITICAL: Create both promises in the SAME synchronous block - no awaits between them
  // This ensures both async functions start executing immediately and run in parallel
  const batchStart = performance.now();
  console.log(`[BatchJob] Creating both promises simultaneously (parallel execution starts now)...`);
  
  // Create promise array and start BOTH tasks immediately without any await
  const taskPromises = [];
  
  // Create product_shot promise - function starts executing immediately (no await)
  if (productShotInput) {
    console.log(`[BatchJob] Creating product_shot promise (execution starts immediately)...`);
    const productShotPromise = processProductShot(
      productShotInput,
      supabase,
      userId,
      perfTracker,
      timingTracker,
      imageData,
      jobId
    ).then(result => {
      const elapsed = ((performance.now() - batchStart) / 1000).toFixed(2);
      console.log(`[BatchJob] product_shot completed in ${elapsed}s`);
      return { task: 'product_shot', result, error: null };
    }).catch(err => {
      const elapsed = ((performance.now() - batchStart) / 1000).toFixed(2);
      console.error(`[BatchJob] product_shot failed after ${elapsed}s:`, err.message);
      return { task: 'product_shot', result: null, error: err.message };
    });
    taskPromises.push(productShotPromise);
  }
  
  // Create auto_tag promise IMMEDIATELY after (no await) - both run in parallel
  if (autoTagInput) {
    console.log(`[BatchJob] Creating auto_tag promise (execution starts immediately, parallel with product_shot)...`);
    const autoTagPromise = processAutoTag(
      autoTagInput,
      supabase,
      perfTracker,
      timingTracker,
      imageData,
      jobId
    ).then(result => {
      const elapsed = ((performance.now() - batchStart) / 1000).toFixed(2);
      console.log(`[BatchJob] auto_tag completed in ${elapsed}s`);
      return { task: 'auto_tag', result, error: null };
    }).catch(err => {
      const elapsed = ((performance.now() - batchStart) / 1000).toFixed(2);
      console.error(`[BatchJob] auto_tag failed after ${elapsed}s:`, err.message);
      return { task: 'auto_tag', result: null, error: err.message };
    });
    taskPromises.push(autoTagPromise);
  }
  
  // Both promises are now created and executing in parallel
  // Only NOW do we await - Promise.all waits for BOTH to complete
  console.log(`[BatchJob] Both promises created. Awaiting ${taskPromises.length} promises with Promise.all() (both running in parallel)...`);
  const results = await Promise.all(taskPromises);
  
  // Capture end time after Promise.all() completes
  const batchEnd = performance.now();
  const batchDuration = ((batchEnd - batchStart) / 1000).toFixed(2);
  
  // Track the parallel execution time
  if (timingTracker && typeof timingTracker.setBatchAIGenerationTime === 'function') {
    timingTracker.setBatchAIGenerationTime(parseFloat(batchDuration) * 1000); // Convert to ms
  }
  
  console.log(`[BatchJob] All tasks completed in ${batchDuration}s (parallel execution - should be ~max of individual task times, not sum)`);
  
  // Organize results by task name
  const taskResults = {};
  for (const { task, result, error } of results) {
    if (error) {
      taskResults[task] = { error };
      console.error(`[BatchJob] Task ${task} failed:`, error);
    } else {
      taskResults[task] = result;
      console.log(`[BatchJob] Task ${task} completed successfully`);
    }
  }
  
  console.log(`[BatchJob] All tasks completed`);
  return taskResults;
}