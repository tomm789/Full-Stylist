"use strict";

// Main Netlify function for processing AI jobs. This handler
// authenticates the request using the Supabase JWT, retrieves the
// referenced job from the database and dispatches processing to the
// appropriate module based on the job type. Each job type is defined
// in a separate module under ./processes to improve modularity.

const { supabaseAdmin } = require("./supabaseClient");
const { processAutoTag } = require("./processes/auto_tag");
const { processProductShot } = require("./processes/product_shot");
const { processHeadshotGenerate } = require("./processes/headshot_generate");
const { processBodyShotGenerate } = require("./processes/body_shot_generate");
const { processOutfitRender } = require("./processes/outfit_render");
const { processOutfitMannequin } = require("./processes/outfit_mannequin");
const { processOutfitSuggest } = require("./processes/outfit_suggest");
const { processReferenceMatch } = require("./processes/reference_match");

/**
 * Netlify function handler. Validates the HTTP method and the
 * Authorization header, retrieves the job from Supabase, and queues it
 * for asynchronous processing. Returns immediately with a 202 status.
 *
 * @param {object} event - The incoming request context
 * @param {object} context - The Lambda context provided by Netlify
 * @returns {Promise<object>} HTTP response object
 */
exports.handler = async (event, context) => {
  // Netlify runs all functions in a single Lambda; prevent waiting on
  // asynchronous tasks to finish before returning
  context.callbackWaitsForEmptyEventLoop = false;
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
    // Update job status to running and queue asynchronous processing
    await supabaseAdmin
      .from("ai_jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", job_id);
    processJobAsync(job, user.id).catch((err) => {
      console.error(`[AIJobRunner] Async processing error for ${job_id}:`, err);
    });
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Job queued for processing",
        job_id
      })
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
 * Catches errors and records them on the job record. On success,
 * updates the job record with the result. This function is run
 * asynchronously and does not block the HTTP response.
 *
 * @param {object} job - The job record from the database
 * @param {string} userId - ID of the job owner
 */
async function processJobAsync(job, userId) {
  const job_id = job.id;
  let result;
  let error = null;
  try {
    const input = job.input;
    switch (job.job_type) {
      case "auto_tag":
        result = await processAutoTag(input, supabaseAdmin);
        break;
      case "product_shot":
        result = await processProductShot(input, supabaseAdmin, userId);
        break;
      case "headshot_generate":
        result = await processHeadshotGenerate(input, supabaseAdmin, userId);
        break;
      case "body_shot_generate":
        result = await processBodyShotGenerate(input, supabaseAdmin, userId);
        break;
      case "outfit_suggest":
        result = await processOutfitSuggest(input, supabaseAdmin, userId);
        break;
      case "reference_match":
        result = await processReferenceMatch(input, supabaseAdmin, userId);
        break;
      case "outfit_mannequin":
        result = await processOutfitMannequin(input, supabaseAdmin, userId);
        break;
      case "outfit_render":
        result = await processOutfitRender(input, supabaseAdmin, userId);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
  } catch (err) {
    error = err.message || "Unknown error";
    console.error(`[AIJobRunner] Error processing ${job.job_type} job ${job_id}:`, err);
  }
  // Build the update payload based on success or failure
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
}