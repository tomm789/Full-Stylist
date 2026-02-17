"use strict";

// This module centralizes the creation of the Supabase client so that it can
// be shared across all Netlify functions. It reads the Supabase URL and
// service role key from environment variables, falling back to the Expo
// public configuration if necessary. The client created here does not
// automatically refresh tokens or persist sessions.

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Find the actual project root by looking for netlify.toml
let projectRoot = __dirname;
while (projectRoot !== "/" && !fs.existsSync(path.join(projectRoot, "netlify.toml"))) {
  projectRoot = path.dirname(projectRoot);
}

const envFiles = [".env.local", ".env"];
for (const fileName of envFiles) {
  const fullPath = path.join(projectRoot, fileName);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: true });
  }
}

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL) {
  throw new Error(
    "Missing Supabase URL. Set SUPABASE_URL (recommended) or EXPO_PUBLIC_SUPABASE_URL in server env."
  );
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in server env.");
}

// Create a single Supabase client instance to be reused throughout the
// application. Using one shared client avoids unnecessary re-instantiation
// and ensures consistent configuration.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { supabaseAdmin };
