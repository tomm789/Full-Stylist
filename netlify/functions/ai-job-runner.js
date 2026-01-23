// Use require for CommonJS compatibility with Netlify Functions
const { createClient } = require('@supabase/supabase-js');
const { PROMPTS } = require('./prompts');

// --- CONFIGURATION & ENV ---
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Create Supabase admin client (service role)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// --- HANDLER ---
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    // 1. Auth Validation
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization header' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };

    // 2. Parse Body & Validate Job
    const body = JSON.parse(event.body || '{}');
    const { job_id } = body;

    if (!job_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'job_id is required' }) };

    const { data: job, error: jobError } = await supabaseAdmin
      .from('ai_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('owner_user_id', user.id)
      .single();

    if (jobError || !job) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Job not found' }) };
    if (job.status === 'running') return { statusCode: 409, headers, body: JSON.stringify({ error: 'Job already running' }) };

    // 3. Set Status Running
    await supabaseAdmin
      .from('ai_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    // 4. Execute Logic
    let result;
    let error = null;

    try {
      const input = job.input;
      switch (job.job_type) {
        case 'auto_tag':
          result = await processAutoTag(input, supabaseAdmin);
          break;
        case 'product_shot':
          result = await processProductShot(input, supabaseAdmin, user.id);
          break;
        case 'headshot_generate':
          result = await processHeadshotGenerate(input, supabaseAdmin, user.id);
          break;
        case 'body_shot_generate':
          result = await processBodyShotGenerate(input, supabaseAdmin, user.id);
          break;
        case 'outfit_suggest':
          result = await processOutfitSuggest(input, supabaseAdmin);
          break;
        case 'reference_match':
          result = await processReferenceMatch(input, supabaseAdmin);
          break;
        case 'outfit_mannequin':
          result = await processOutfitMannequin(input, supabaseAdmin, user.id);
          break;
        case 'outfit_render':
          result = await processOutfitRender(input, supabaseAdmin, user.id);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }
    } catch (err) {
      error = err.message || 'Unknown error';
      console.error(`[AIJobRunner] Error processing ${job.job_type} job ${job_id}:`, err);
    }

    // 5. Save Result
    const updateData = {
      updated_at: new Date().toISOString(),
      status: error ? 'failed' : 'succeeded',
    };
    if (error) updateData.error = error;
    else updateData.result = result;

    await supabaseAdmin.from('ai_jobs').update(updateData).eq('id', job_id);

    return {
      statusCode: error ? 500 : 200,
      headers,
      body: JSON.stringify({ success: !error, result, error }),
    };

  } catch (err) {
    console.error('Handler Critical Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal server error' }) };
  }
};

// --- HELPER FUNCTIONS ---

async function downloadImageFromStorage(supabase, imageId) {
  const { data: image, error } = await supabase
    .from('images')
    .select('storage_bucket, storage_key')
    .eq('id', imageId)
    .single();
  
  if (error || !image) throw new Error(`Image not found: ${imageId}`);
  
  const bucket = image.storage_bucket || 'media';
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(image.storage_key);
  
  const response = await fetch(urlData.publicUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function uploadImageToStorage(supabase, userId, base64Data, storagePath) {
  const isPng = base64Data.startsWith('iVBORw0KGgo');
  const mimeType = isPng ? 'image/png' : 'image/jpeg';
  const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');
  const blob = new Blob([buffer], { type: mimeType });
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType
    });
  
  if (uploadError || !uploadData) throw new Error(`Failed to upload: ${uploadError?.message}`);
  
  const { data: imageRecord, error: imageError } = await supabase
    .from('images')
    .insert({
      owner_user_id: userId,
      storage_bucket: 'media',
      storage_key: uploadData.path,
      mime_type: mimeType,
      source: 'ai_generated'
    })
    .select()
    .single();
  
  if (imageError || !imageRecord) throw new Error(`Failed to create DB record: ${imageError?.message}`);
  
  return { imageId: imageRecord.id, storageKey: uploadData.path };
}

async function callGeminiAPI(prompt, images, model = 'gemini-2.5-flash-image', responseType = 'IMAGE') {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  
  const parts = [{ text: prompt }];
  for (const imageB64 of images) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageB64 } });
  }

  const generationConfig = {
    temperature: responseType === 'TEXT' ? 0.3 : 0.4,
  };
  if (responseType === 'IMAGE') generationConfig.response_modalities = ['IMAGE'];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    }
  );

  const data = await response.json();
  
  if (!response.ok || data.error) {
    console.error('[GeminiAPI] Error:', JSON.stringify(data.error || data, null, 2));
    throw new Error(data.error?.message || 'Gemini API Error');
  }

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('No candidates returned');

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`Generation blocked: ${candidate.finishReason} - ${candidate.finishMessage || ''}`);
  }

  const responseParts = candidate.content?.parts || [];
  
  if (responseType === 'TEXT') {
    const text = responseParts.find(p => p.text)?.text;
    if (!text) throw new Error('No text response from API');
    return text.trim();
  } else {
    const imagePart = responseParts.find(p => p.inline_data || p.inlineData);
    const imageData = imagePart?.inline_data?.data || imagePart?.inlineData?.data;
    if (!imageData) throw new Error('No image data in API response');
    return imageData;
  }
}

// --- LOGIC FUNCTIONS ---

async function processAutoTag(input, supabase) {
  const { wardrobe_item_id, image_ids } = input;
  if (!wardrobe_item_id || !image_ids?.length) throw new Error('Missing ID or images');

  // Parallel Fetch (Optimization)
  const [imageB64, catRes, subRes, attrRes] = await Promise.all([
    downloadImageFromStorage(supabase, image_ids[0]),
    supabase.from('wardrobe_categories').select('id, name').order('sort_order'),
    supabase.from('wardrobe_subcategories').select('id, name, category_id').order('sort_order'),
    supabase.from('attribute_definitions').select('id, key, name')
  ]);

  const categories = catRes.data || [];
  const subcategories = subRes.data || [];
  
  const catList = categories.map(c => c.name).join(', ');
  const subList = subcategories.map(s => s.name).join(', ');
  const prompt = PROMPTS.AUTO_TAG(catList, subList);

  const textResult = await callGeminiAPI(prompt, [imageB64], 'gemini-2.5-flash-image', 'TEXT');
  
  let result;
  try {
    const cleaned = textResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Failed to parse AI JSON response');
  }

  // Bulk Attribute Insertion (Optimization)
  const defMap = new Map((attrRes.data || []).map(d => [d.key, d.id]));
  const attributesToInsert = [];
  
  for (const attr of (result.attributes || [])) {
    const defId = defMap.get(attr.key);
    if (!defId) continue;

    for (const val of (attr.values || [])) {
      // Note: Keeping sequential here for simplicity as Promise.all inside loop for upserts can be tricky 
      // without proper locking, but this is still faster due to reduced code overhead
      let { data: value } = await supabase
        .from('attribute_values')
        .select('id')
        .eq('definition_id', defId)
        .ilike('value', val.value)
        .single();

      if (!value) {
        const { data: newValue } = await supabase
          .from('attribute_values')
          .insert({ definition_id: defId, value: val.value })
          .select('id')
          .single();
        value = newValue;
      }

      if (value?.id) {
        attributesToInsert.push({
          entity_type: 'wardrobe_item',
          entity_id: wardrobe_item_id,
          definition_id: defId,
          value_id: value.id,
          raw_value: val.value,
          confidence: val.confidence,
          source: 'ai'
        });
      }
    }
  }

  if (attributesToInsert.length) {
    await supabase.from('entity_attributes').insert(attributesToInsert);
  }

  const updates = {};
  if (result.suggested_title) updates.title = result.suggested_title;
  if (result.suggested_notes) updates.description = result.suggested_notes;

  const colorAttr = result.attributes?.find(a => a.key === 'color');
  if (colorAttr?.values?.[0]) updates.color_primary = colorAttr.values[0].value;

  if (result.recognized_category) {
    const matchedCat = categories.find(c => c.name.toLowerCase() === result.recognized_category.toLowerCase());
    if (matchedCat) {
      updates.category_id = matchedCat.id;
      if (result.recognized_subcategory) {
        const matchedSub = subcategories.find(s => 
          s.name.toLowerCase() === result.recognized_subcategory.toLowerCase() && 
          s.category_id === matchedCat.id
        );
        updates.subcategory_id = matchedSub ? matchedSub.id : null;
      } else {
        updates.subcategory_id = null;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('wardrobe_items').update(updates).eq('id', wardrobe_item_id);
  }

  return { ...result, updates_applied: updates };
}

async function processProductShot(input, supabase, userId) {
  const { image_id, wardrobe_item_id } = input;
  if (!image_id || !wardrobe_item_id) throw new Error('Missing ID or wardrobe_item_id');

  const imageB64 = await downloadImageFromStorage(supabase, image_id);
  const productShotB64 = await callGeminiAPI(PROMPTS.PRODUCT_SHOT, [imageB64], 'gemini-2.5-flash-image', 'IMAGE');

  const timestamp = Date.now();
  const storagePath = `${userId}/ai/product_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, productShotB64, storagePath);

  const { data: existingImages } = await supabase
    .from('wardrobe_item_images')
    .select('id, sort_order')
    .eq('wardrobe_item_id', wardrobe_item_id)
    .order('sort_order', { ascending: false });

  for (const img of (existingImages || [])) {
    await supabase.from('wardrobe_item_images').update({ sort_order: (img.sort_order || 0) + 1 }).eq('id', img.id);
  }

  await supabase.from('wardrobe_item_images').insert({
    wardrobe_item_id,
    image_id: imageId,
    type: 'product_shot',
    sort_order: 0
  });

  return { image_id: imageId, storage_key: storageKey };
}

async function processHeadshotGenerate(input, supabase, userId) {
  const { selfie_image_id, hair_style, makeup_style } = input;
  if (!selfie_image_id) throw new Error('Missing selfie_image_id');

  const selfieB64 = await downloadImageFromStorage(supabase, selfie_image_id);
  // Default values logic from original code:
  const hair = hair_style || 'Keep original hair';
  const makeup = makeup_style || 'Natural look';
  
  const prompt = PROMPTS.HEADSHOT(hair, makeup);
  const headshotB64 = await callGeminiAPI(prompt, [selfieB64], 'gemini-2.5-flash-image', 'IMAGE');

  const timestamp = Date.now();
  const storagePath = `${userId}/ai/headshots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, headshotB64, storagePath);

  await supabase.from('user_settings').update({ headshot_image_id: imageId }).eq('user_id', userId);
  return { image_id: imageId, storage_key: storageKey };
}

async function processBodyShotGenerate(input, supabase, userId) {
  const { body_photo_image_id, headshot_image_id } = input;
  if (!body_photo_image_id) throw new Error('Missing body_photo_image_id');

  // Logic: Use input ID -> User Settings ID -> Error
  let headId = headshot_image_id;
  if (!headId) {
    const { data: settings } = await supabase.from('user_settings').select('headshot_image_id').eq('user_id', userId).single();
    headId = settings?.headshot_image_id;
  }
  if (!headId) throw new Error('No headshot available');

  // Optimization: Parallel Download
  const [headB64, bodyB64] = await Promise.all([
    downloadImageFromStorage(supabase, headId),
    downloadImageFromStorage(supabase, body_photo_image_id)
  ]);

  // Original model: gemini-3-pro-image-preview
  // Original Prompt logic: contained within PROMPTS.BODY_COMPOSITE
  const studioModelB64 = await callGeminiAPI(PROMPTS.BODY_COMPOSITE, [headB64, bodyB64], 'gemini-3-pro-image-preview', 'IMAGE');

  const timestamp = Date.now();
  const storagePath = `${userId}/ai/body_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, studioModelB64, storagePath);

  await supabase.from('user_settings').update({ body_shot_image_id: imageId }).eq('user_id', userId);
  return { image_id: imageId, storage_key: storageKey };
}

async function processOutfitRender(input, supabase, userId) {
  const { outfit_id, selected, prompt, settings, headshot_image_id, mannequin_image_id } = input;
  if (!outfit_id || !selected?.length) throw new Error('Missing outfit_id or selected items');

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('headshot_image_id, body_shot_image_id, ai_model_preference')
    .eq('user_id', userId)
    .single();

  const bodyId = userSettings?.body_shot_image_id;
  const headId = headshot_image_id || userSettings?.headshot_image_id;

  if (!bodyId || !headId) throw new Error('Missing body shot or headshot');

  // --- Optimization: Parallel Item Image Fetching ---
  const wardrobeItemIds = selected.map(s => s.wardrobe_item_id);
  const { data: allLinks } = await supabase
    .from('wardrobe_item_images')
    .select('wardrobe_item_id, type, sort_order, image_id')
    .in('wardrobe_item_id', wardrobeItemIds);

  const linksByItem = new Map();
  allLinks?.forEach(link => {
    if (!linksByItem.has(link.wardrobe_item_id)) linksByItem.set(link.wardrobe_item_id, []);
    linksByItem.get(link.wardrobe_item_id).push(link);
  });

  const imageIdsToDownload = [];
  wardrobeItemIds.forEach(itemId => {
    const links = linksByItem.get(itemId);
    if (!links?.length) return;
    
    links.sort((a, b) => {
      if (a.type === 'product_shot' && b.type !== 'product_shot') return -1;
      if (b.type === 'product_shot' && a.type !== 'product_shot') return 1;
      return (a.sort_order || 999) - (b.sort_order || 999);
    });
    
    if (links[0]?.image_id) imageIdsToDownload.push(links[0].image_id);
  });

  if (!imageIdsToDownload.length) throw new Error('No valid images found for outfit items');

  // --- Optimization: Parallel Download of ALL images ---
  const downloadPromises = [
    downloadImageFromStorage(supabase, headId),
    downloadImageFromStorage(supabase, bodyId),
    ...imageIdsToDownload.map(id => downloadImageFromStorage(supabase, id))
  ];

  const [headB64, bodyB64, ...itemImages] = await Promise.all(downloadPromises);

  // --- Logic matched to original ---
  const preferredModel = userSettings?.ai_model_preference || 'gemini-2.5-flash-image';
  const limit = preferredModel.includes('pro') ? 7 : 2;
  const useMannequin = itemImages.length > limit;

  let finalImageB64;

  if (mannequin_image_id) {
    const mannequinB64 = await downloadImageFromStorage(supabase, mannequin_image_id);
    const compositePrompt = PROMPTS.OUTFIT_COMPOSITE;
    finalImageB64 = await callGeminiAPI(compositePrompt, [bodyB64, mannequinB64, headB64], 'gemini-3-pro-image-preview', 'IMAGE');
  } else if (useMannequin) {
    // Stage 1: Mannequin
    // Uses preferredModel (e.g. Flash)
    // Uses details fallback
    const mannequinPrompt = PROMPTS.OUTFIT_MANNEQUIN(itemImages.length, prompt || "No additional details");
    const mannequinB64 = await callGeminiAPI(mannequinPrompt, itemImages, preferredModel, 'IMAGE');
    
    // Stage 2: Composite
    // Uses hardcoded 'gemini-3-pro-image-preview' (as per original code)
    // Does NOT inject user prompt (as per original code)
    const compositePrompt = PROMPTS.OUTFIT_COMPOSITE;
    finalImageB64 = await callGeminiAPI(compositePrompt, [bodyB64, mannequinB64, headB64], 'gemini-3-pro-image-preview', 'IMAGE');
  } else {
    // Direct Generation
    // Uses preferredModel
    // Uses details fallback
    const directPrompt = PROMPTS.OUTFIT_FINAL(prompt || "No additional details");
    const allInputs = [bodyB64, headB64, ...itemImages];
    finalImageB64 = await callGeminiAPI(directPrompt, allInputs, preferredModel, 'IMAGE');
  }

  const timestamp = Date.now();
  const storagePath = `${userId}/ai/outfits/${outfit_id}/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, finalImageB64, storagePath);

  await supabase.from('outfit_renders').insert({
    outfit_id,
    image_id: imageId,
    prompt: prompt || null,
    settings: settings || {},
    status: 'succeeded'
  });

  await supabase.from('outfits').update({ cover_image_id: imageId }).eq('id', outfit_id);
  return { renders: [{ image_id: imageId, storage_key: storageKey }] };
}

async function processOutfitMannequin(input, supabase, userId) {
  const { outfit_id, selected, prompt, settings } = input;
  if (!outfit_id || !selected?.length) throw new Error('Missing outfit_id or selected items');

  // --- Optimization: Parallel Item Image Fetching ---
  const wardrobeItemIds = selected.map(s => s.wardrobe_item_id);
  const { data: allLinks, error: linksError } = await supabase
    .from('wardrobe_item_images')
    .select('wardrobe_item_id, type, sort_order, image_id')
    .in('wardrobe_item_id', wardrobeItemIds);

  if (linksError) throw new Error(`Failed to load wardrobe item images: ${linksError.message}`);

  const linksByItem = new Map();
  allLinks?.forEach(link => {
    if (!linksByItem.has(link.wardrobe_item_id)) linksByItem.set(link.wardrobe_item_id, []);
    linksByItem.get(link.wardrobe_item_id).push(link);
  });

  const imageIdsToDownload = [];
  wardrobeItemIds.forEach(itemId => {
    const links = linksByItem.get(itemId);
    if (!links?.length) return;

    links.sort((a, b) => {
      if (a.type === 'product_shot' && b.type !== 'product_shot') return -1;
      if (b.type === 'product_shot' && a.type !== 'product_shot') return 1;
      return (a.sort_order || 999) - (b.sort_order || 999);
    });

    if (links[0]?.image_id) imageIdsToDownload.push(links[0].image_id);
  });

  if (!imageIdsToDownload.length) throw new Error('No valid images found for outfit items');

  const itemImages = await Promise.all(imageIdsToDownload.map(id => downloadImageFromStorage(supabase, id)));

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('ai_model_preference')
    .eq('user_id', userId)
    .single();

  const preferredModel = userSettings?.ai_model_preference || 'gemini-2.5-flash-image';
  const mannequinPrompt = PROMPTS.OUTFIT_MANNEQUIN(itemImages.length, prompt || "No additional details");
  const mannequinB64 = await callGeminiAPI(mannequinPrompt, itemImages, preferredModel, 'IMAGE');

  const timestamp = Date.now();
  const storagePath = `${userId}/ai/outfits/${outfit_id}/mannequin/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, mannequinB64, storagePath);

  return { mannequin_image_id: imageId, storage_key: storageKey, settings: settings || {} };
}

async function processOutfitSuggest() { return { message: 'Not implemented' }; }
async function processReferenceMatch() { return { message: 'Not implemented' }; }
