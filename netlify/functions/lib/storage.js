"use strict";

// Determines whether the provided Base64 data corresponds to a PNG. This
// check relies on the well‑known PNG file signature (iVBORw0KGgo). If the
// data does not start with this signature, JPEG is assumed.
function isPngBase64(data) {
  return data.startsWith("iVBORw0KGgo");
}

/**
 * Downloads an image from Supabase storage given its image record ID. The
 * function queries the `images` table to retrieve the storage bucket and
 * key, then generates a public URL via Supabase's storage API. It fetches
 * the image and returns its contents as a Base64 string (without any data
 * URL prefix).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - The Supabase client
 * @param {number} imageId - The ID of the image record in the `images` table
 * @param {object} timingTracker - Optional timing tracker to record download and conversion times
 * @returns {Promise<string>} A promise resolving to a Base64 representation of the image
 */
async function downloadImageFromStorage(supabase, imageId, timingTracker = null) {
  // Diagnostic logging for region mismatch detection
  const awsRegion = process.env.AWS_REGION || process.env.NETLIFY_REGION || 'not set';
  const supabaseUrlEnv = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'not set';
  
  // Try to access Supabase client URL from various possible properties
  let supabaseClientUrl = 'not accessible';
  if (supabase) {
    supabaseClientUrl = supabase.supabaseUrl || 
                       supabase.url || 
                       (supabase.rest && supabase.rest.supabaseUrl) ||
                       (supabase.storage && supabase.storage.supabaseUrl) ||
                       'accessible but URL not found in expected properties';
  }
  
  // Extract hostname from URL for additional diagnostics
  let supabaseHostname = 'unknown';
  try {
    const url = supabaseUrlEnv !== 'not set' ? new URL(supabaseUrlEnv) : null;
    supabaseHostname = url ? url.hostname : 'invalid URL';
  } catch (e) {
    supabaseHostname = 'URL parse error';
  }
  
  console.log(`[downloadImageFromStorage] REGION DIAGNOSTICS:`, {
    computeRegion: awsRegion,
    supabaseUrlFromEnv: supabaseUrlEnv,
    supabaseClientUrl: supabaseClientUrl,
    supabaseHostname: supabaseHostname,
    hasSupabaseClient: !!supabase,
    clientProperties: supabase ? Object.keys(supabase).filter(k => !k.startsWith('_')).join(', ') : 'N/A',
  });
  
  console.log(`[downloadImageFromStorage] Starting download for imageId: ${imageId}`);
  
  const { data: image, error } = await supabase
    .from("images")
    .select("storage_bucket, storage_key, mime_type")
    .eq("id", imageId)
    .single();
    
  if (error || !image) {
    console.error(`[downloadImageFromStorage] Image not found: ${imageId}`, error);
    throw new Error(`Image not found: ${imageId}`);
  }
  
  console.log(`[downloadImageFromStorage] Found image record: bucket=${image.storage_bucket}, key=${image.storage_key}`);
  
  const bucket = image.storage_bucket || "media";
  
  // Generate signed URL for direct CDN/S3 access (bypasses API middleware)
  const signedUrlStart = performance.now();
  console.log(`[downloadImageFromStorage] Generating signed URL for direct download...`);
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(image.storage_key, 60); // 60 second expiry
  
  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error(`[downloadImageFromStorage] Failed to create signed URL:`, signedUrlError);
    throw new Error(`Failed to create signed URL: ${signedUrlError?.message || 'Unknown error'}`);
  }
  
  const signedUrlEnd = performance.now();
  const signedUrlDuration = signedUrlEnd - signedUrlStart;
  console.log(`[downloadImageFromStorage] Signed URL generated in ${(signedUrlDuration / 1000).toFixed(2)}s: ${signedUrlData.signedUrl.substring(0, 80)}...`);
  
  // Track storage download time
  const downloadStart = performance.now();
  console.log(`[downloadImageFromStorage] Downloading directly from signed URL (CDN/S3 path)...`);
  
  // Use fetch() to download directly from signed URL (routes through CDN/S3, faster than API)
  const fetchResponse = await fetch(signedUrlData.signedUrl);
  
  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text().catch(() => 'Unknown error');
    console.error(`[downloadImageFromStorage] Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`, errorText);
    throw new Error(`Failed to download image from signed URL: ${fetchResponse.status} ${fetchResponse.statusText}`);
  }
  
  const arrayBuffer = await fetchResponse.arrayBuffer();
  const downloadEnd = performance.now();
  const downloadDuration = downloadEnd - downloadStart;
  
  if (timingTracker) {
    timingTracker.addStorageDownload(downloadDuration);
  }
  console.log(`[downloadImageFromStorage] Direct download completed in ${(downloadDuration / 1000).toFixed(2)}s, size: ${arrayBuffer.byteLength} bytes`);
  
  // Validate it's actually image data
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPNG = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  
  // WebP files start with "RIFF" (0x52 0x49 0x46 0x46) and have "WEBP" at offset 8
  const isWebP = firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46;
  // Optionally verify WEBP signature at offset 8 for extra validation
  let isWebPConfirmed = false;
  if (isWebP && arrayBuffer.byteLength >= 12) {
    const webpBytes = new Uint8Array(arrayBuffer.slice(8, 12));
    isWebPConfirmed = webpBytes[0] === 0x57 && webpBytes[1] === 0x45 && webpBytes[2] === 0x42 && webpBytes[3] === 0x50;
  }
  
  if (!isJPEG && !isPNG && !isWebP) {
    console.error(`[downloadImageFromStorage] Not a valid image! First bytes: ${Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    throw new Error("Downloaded file is not a valid image");
  }
  
  // Determine image format and mime-type
  let imageFormat = 'unknown';
  let mimeType = image.mime_type || 'image/jpeg'; // Default to JPEG if not in DB
  
  if (isJPEG) {
    imageFormat = 'JPEG';
    mimeType = 'image/jpeg';
  } else if (isPNG) {
    imageFormat = 'PNG';
    mimeType = 'image/png';
  } else if (isWebP) {
    imageFormat = isWebPConfirmed ? 'WebP (confirmed)' : 'WebP (RIFF header detected)';
    mimeType = 'image/webp';
  }
  
  // Trust the file signature over database mime_type if they don't match
  if (image.mime_type && image.mime_type !== mimeType) {
    console.log(`[downloadImageFromStorage] Mime-type mismatch: DB has ${image.mime_type}, detected ${mimeType}. Using detected format.`);
  }
  
  console.log(`[downloadImageFromStorage] Valid ${imageFormat} image detected (mime-type: ${mimeType})`);
  
  // Track base64 conversion time
  const conversionStart = performance.now();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const conversionEnd = performance.now();
  const conversionDuration = conversionEnd - conversionStart;
  
  if (timingTracker) {
    timingTracker.addBase64Conversion(conversionDuration);
  }
  console.log(`[downloadImageFromStorage] Base64 conversion completed in ${(conversionDuration / 1000).toFixed(2)}s, length: ${base64.length}`);
  
  // Return both base64 and mime-type for downstream processing
  return { base64, mimeType };
}
async function uploadImageToStorage(supabase, userId, base64Data, storagePath) {
  // Determine MIME type based on Base64 prefix
  const isPng = isPngBase64(base64Data);
  const mimeType = isPng ? "image/png" : "image/jpeg";
  const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(rawBase64, "base64");
  const blob = new Blob([buffer], { type: mimeType });
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType
    });
  if (uploadError || !uploadData) {
    throw new Error(`Failed to upload: ${uploadError?.message}`);
  }
  const { data: imageRecord, error: imageError } = await supabase
    .from("images")
    .insert({
      owner_user_id: userId,
      storage_bucket: "media",
      storage_key: uploadData.path,
      mime_type: mimeType,
      source: "ai_generated"
    })
    .select()
    .single();
  if (imageError || !imageRecord) {
    throw new Error(`Failed to create DB record: ${imageError?.message}`);
  }
  return { imageId: imageRecord.id, storageKey: uploadData.path };
}

module.exports = {
  isPngBase64,
  downloadImageFromStorage,
  uploadImageToStorage,
};
