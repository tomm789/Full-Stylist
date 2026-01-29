"use strict";

// Placeholder for the reference_match job type. This is reserved for
// future use and currently returns a message indicating that it has
// not been implemented yet.

async function processReferenceMatch(input, supabase, userId, perfTracker = null, timingTracker = null, jobId = null) {
  return { message: "Not implemented" };
}

module.exports = { processReferenceMatch };