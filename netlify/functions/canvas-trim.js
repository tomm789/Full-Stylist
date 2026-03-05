"use strict";

const sharp = require("sharp");
const { supabaseAdmin } = require("./supabaseClient");

const CACHE_TTL_MS = 10 * 60 * 1000;
const trimCache = new Map();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function readCache(key) {
  const hit = trimCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    trimCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  trimCache.set(key, { ts: Date.now(), value });
}

async function detectTrimBoundsFromBuffer(buffer, threshold = 15) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const minChannelValue = 255 - threshold;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      const isEmpty = a === 0 || (r > minChannelValue && g > minChannelValue && b > minChannelValue);
      if (!isEmpty) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found || minX > maxX || minY > maxY) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }

  const trimWidth = Math.max(1, maxX - minX + 1);
  const trimHeight = Math.max(1, maxY - minY + 1);

  return {
    bounds: {
      left: clamp(minX / width, 0, 1),
      top: clamp(minY / height, 0, 1),
      right: clamp((maxX + 1) / width, 0, 1),
      bottom: clamp((maxY + 1) / height, 0, 1),
    },
    trimWidthRatio: clamp(trimWidth / width, 0.001, 1),
    trimHeightRatio: clamp(trimHeight / height, 0.001, 1),
    aspectRatioAfterTrim: trimWidth / trimHeight,
  };
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Missing authorization header" }) };
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid token" }) };
    }

    const userId = authData.user.id;
    const body = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];
    const threshold = typeof body.threshold === "number" ? body.threshold : 15;
    if (items.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ trims: {} }) };
    }

    const trims = {};
    for (const item of items) {
      const itemId = typeof item?.itemId === "string" ? item.itemId : null;
      const storageKey = typeof item?.storageKey === "string" ? item.storageKey : null;
      if (!itemId || !storageKey) continue;

      // Verify the storage key belongs to the authenticated user
      if (!storageKey.startsWith(userId + "/")) {
        continue;
      }

      const cacheKey = `${storageKey}|${threshold}`;
      const cached = readCache(cacheKey);
      if (cached) {
        trims[itemId] = cached;
        continue;
      }

      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from("media")
        .download(storageKey);

      if (downloadError || !blob) {
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const metadata = await detectTrimBoundsFromBuffer(buffer, threshold);
      trims[itemId] = metadata;
      writeCache(cacheKey, metadata);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ trims }),
    };
  } catch (error) {
    console.error("[canvas-trim] error", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || "Internal server error" }),
    };
  }
};

