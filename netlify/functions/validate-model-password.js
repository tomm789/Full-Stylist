"use strict";

/**
 * Validates password for accessing advanced AI models (e.g., Gemini 3 Pro)
 * This keeps the password secure on the server side
 */

const { supabaseAdmin } = require("./supabaseClient");

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Get password from environment variable
    const expectedPassword = process.env.AI_MODEL_PASSWORD || "";
    
    if (!expectedPassword) {
      console.error("[validate-model-password] AI_MODEL_PASSWORD not set in environment");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Password validation not configured" }),
      };
    }

    // Parse request body
    const { password, userId } = JSON.parse(event.body || "{}");

    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Password is required" }),
      };
    }

    // Validate password
    const isValid = password === expectedPassword;

    if (!isValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          valid: false,
          error: "Incorrect password" 
        }),
      };
    }

    // Password is valid - optionally log the validation (without exposing password)
    if (userId) {
      console.log(`[validate-model-password] Valid password provided for user ${userId}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        valid: true 
      }),
    };
  } catch (error) {
    console.error("[validate-model-password] Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Internal server error",
        message: error.message 
      }),
    };
  }
};
