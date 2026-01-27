"use strict";

// This module centralizes the creation of the Supabase client so that it can
// be shared across all Netlify functions. It reads the Supabase URL and
// service role key from environment variables, falling back to the Expo
// public configuration if necessary. The client created here does not
// automatically refresh tokens or persist sessions.

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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