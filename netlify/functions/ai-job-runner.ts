// Use require for CommonJS compatibility with Netlify Functions
const { createClient } = require('@supabase/supabase-js');

// Environment variables (set in Netlify dashboard)
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

interface AIJobInput {
  wardrobe_item_id?: string;
  image_ids?: string[];
  image_id?: string;
  selfie_image_id?: string;
  category?: string;
  subcategory?: string;
  user_id?: string;
  prompt?: string;
  constraints?: Record<string, any>;
  request?: Record<string, any>;
  outfit_id?: string;
  selected?: Array<{ category: string; wardrobe_item_id: string }>;
  reference_image_id?: string | null;
  settings?: Record<string, any>;
  hair_style?: string;
  makeup_style?: string;
  body_photo_image_id?: string;
  headshot_image_id?: string;
}

// Export handler using CommonJS for Netlify Functions compatibility
exports.handler = async (event: any, context: any) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate JWT from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { job_id } = body;

    if (!job_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'job_id is required' }),
      };
    }

    // Fetch job from database
    const { data: job, error: jobError } = await supabaseAdmin
      .from('ai_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('owner_user_id', user.id)
      .single();

    if (jobError || !job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' }),
      };
    }

    if (job.status === 'running') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Job already running' }),
      };
    }

    // Update job status to running
    await supabaseAdmin
      .from('ai_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    // Process job based on type
    let result: any;
    let error: string | null = null;

    try {
      switch (job.job_type) {
        case 'auto_tag':
          result = await processAutoTag(job.input as AIJobInput, supabaseAdmin);
          break;
        case 'product_shot':
          result = await processProductShot(job.input as AIJobInput, supabaseAdmin, user.id);
          break;
        case 'headshot_generate':
          result = await processHeadshotGenerate(job.input as AIJobInput, supabaseAdmin, user.id);
          break;
        case 'body_shot_generate':
          result = await processBodyShotGenerate(job.input as AIJobInput, supabaseAdmin, user.id);
          break;
        case 'outfit_suggest':
          result = await processOutfitSuggest(job.input as AIJobInput, supabaseAdmin);
          break;
        case 'reference_match':
          result = await processReferenceMatch(job.input as AIJobInput, supabaseAdmin);
          break;
        case 'outfit_render':
          result = await processOutfitRender(job.input as AIJobInput, supabaseAdmin, user.id);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }
    } catch (err: any) {
      error = err.message || 'Unknown error';
      console.error(`[AIJobRunner] Error processing ${job.job_type} job ${job_id}:`, error);
      console.error(`[AIJobRunner] Error stack:`, err.stack);
    }

    // Update job with result or error
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (error) {
      updateData.status = 'failed';
      updateData.error = error;
    } else {
      updateData.status = 'succeeded';
      updateData.result = result;
    }

    await supabaseAdmin
      .from('ai_jobs')
      .update(updateData)
      .eq('id', job_id);

    return {
      statusCode: error ? 500 : 200,
      headers,
      body: JSON.stringify({ 
        success: !error,
        result,
        error,
      }),
    };

  } catch (err: any) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};

/**
 * Download image from Supabase Storage and convert to base64
 */
async function downloadImageFromStorage(supabase: any, imageId: string): Promise<string> {
  // Get image record
  const { data: image, error: imageError } = await supabase
    .from('images')
    .select('*')
    .eq('id', imageId)
    .single();
  
  if (imageError || !image) {
    throw new Error(`Image not found: ${imageId}`);
  }
  
  // Download from storage using public URL (more reliable than direct download)
  const bucket = image.storage_bucket || 'media';
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(image.storage_key);
  
  const publicUrl = urlData.publicUrl;
  
  // Fetch the file via HTTP
  const response = await fetch(publicUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  // Convert to base64
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  
  return base64;
}

/**
 * Upload base64 image to Supabase Storage and create images record
 */
async function uploadImageToStorage(
  supabase: any,
  userId: string,
  base64Data: string,
  storagePath: string
): Promise<{ imageId: string; storageKey: string }> {
  // Convert base64 to Blob
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  
  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg'
    });
  
  if (uploadError || !uploadData) {
    throw new Error(`Failed to upload image: ${uploadError?.message}`);
  }
  
  // Create images table record
  const { data: imageRecord, error: imageError } = await supabase
    .from('images')
    .insert({
      owner_user_id: userId,
      storage_bucket: 'media',
      storage_key: uploadData.path,
      mime_type: 'image/jpeg',
      source: 'ai_generated'
    })
    .select()
    .single();
  
  if (imageError || !imageRecord) {
    throw new Error(`Failed to create image record: ${imageError?.message}`);
  }
  
  return {
    imageId: imageRecord.id,
    storageKey: uploadData.path
  };
}

/**
 * Call Gemini API with prompt and images
 */
async function callGeminiAPI(
  prompt: string,
  images: string[],
  model: string = 'gemini-2.5-flash-image',
  responseType: 'IMAGE' | 'TEXT' = 'IMAGE'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  // Build request parts
  const parts: any[] = [{ text: prompt }];
  
  for (const imageB64 of images) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: imageB64
      }
    });
  }
  
  // Generation config
  const generationConfig: any = {
    temperature: responseType === 'TEXT' ? 0.3 : 0.4
  };
  
  if (responseType === 'IMAGE') {
    generationConfig.response_modalities = ['IMAGE'];
  }
  
  // Call API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    }
  );
  
  const data = await response.json();
  
  if (!response.ok || data.error) {
    console.error('[GeminiAPI] API error:', JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || 'Gemini API error');
  }
  
  // Check for safety blocks
  if (data.promptFeedback?.blockReason) {
    console.error('[GeminiAPI] Safety block:', data.promptFeedback);
    throw new Error(`Safety Block: ${data.promptFeedback.blockReason}`);
  }
  
  const candidate = data.candidates?.[0];
  if (!candidate) {
    console.error('[GeminiAPI] No candidates in response:', JSON.stringify(data, null, 2));
    throw new Error('No candidates returned from API');
  }
  
  // Check for finish reason (might indicate why generation failed)
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn('[GeminiAPI] Finish reason:', candidate.finishReason);
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Generation blocked by safety filters');
    } else if (candidate.finishReason === 'RECITATION') {
      throw new Error('Generation blocked due to recitation concerns');
    } else if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error('Generation stopped due to token limit');
    }
  }
  
  const responseParts = candidate.content?.parts || [];
  if (responseParts.length === 0) {
    console.error('[GeminiAPI] No parts in candidate content:', JSON.stringify(candidate, null, 2));
    throw new Error('No content parts in API response');
  }
  
  if (responseType === 'TEXT') {
    // For text, use first part with text
    const textPart = responseParts.find((p: any) => p.text);
    if (!textPart?.text) {
      console.error('[GeminiAPI] No text in parts:', JSON.stringify(responseParts, null, 2));
      throw new Error('No text response from API');
    }
    return textPart.text.trim();
  } else {
    // For images, find first part with inline_data
    const imagePart = responseParts.find((p: any) => p.inline_data || p.inlineData);
    
    if (!imagePart) {
      // Check if there's a text part (model refusal)
      const textPart = parts.find((p: any) => p.text);
      if (textPart?.text) {
        console.error('[GeminiAPI] Model returned text instead of image:', textPart.text);
        throw new Error(`Model Refused: "${textPart.text}"`);
      }
      
      // Log the actual response structure for debugging
      console.error('[GeminiAPI] No image part found. Available parts:', JSON.stringify(responseParts, null, 2));
      console.error('[GeminiAPI] Full candidate:', JSON.stringify(candidate, null, 2));
      throw new Error('No image data in API response. Check server logs for details.');
    }
    
    // Try multiple possible field names for image data
    const inlineData = imagePart.inline_data || imagePart.inlineData;
    if (!inlineData?.data) {
      console.error('[GeminiAPI] inline_data found but no data field:', JSON.stringify(inlineData, null, 2));
      console.error('[GeminiAPI] Full image part:', JSON.stringify(imagePart, null, 2));
      throw new Error('Image data structure invalid. Check server logs for details.');
    }
    
    return inlineData.data;
  }
}

// Implementation functions
async function processAutoTag(input: AIJobInput, supabase: any): Promise<any> {
  const { wardrobe_item_id, image_ids, category, subcategory } = input;
  
  if (!wardrobe_item_id || !image_ids || image_ids.length === 0) {
    throw new Error('Missing required fields: wardrobe_item_id, image_ids');
  }
  
  // Download first image from storage
  const imageB64 = await downloadImageFromStorage(supabase, image_ids[0]);
  
  // Get all available categories and subcategories to help AI match
  const { data: allCategories } = await supabase
    .from('wardrobe_categories')
    .select('id, name')
    .order('sort_order');
  
  const { data: allSubcategories } = await supabase
    .from('wardrobe_subcategories')
    .select('id, name, category_id')
    .order('sort_order');
  
  const categoriesList = allCategories?.map(c => c.name).join(', ') || '';
  const subcategoriesList = allSubcategories?.map(s => s.name).join(', ') || '';
  
  // Build enhanced prompt
  const prompt = `Analyze this clothing item image and extract detailed attributes in JSON format.
  
Available Categories: ${categoriesList}
Available Subcategories: ${subcategoriesList}

IMPORTANT: 
1. Look at the image and RECOGNIZE the most appropriate category and subcategory from the available lists above.
2. Match the names EXACTLY as they appear in the lists.
3. Do NOT use the current category/subcategory values - recognize them fresh from the image.
4. If you cannot confidently identify a subcategory, set "recognized_subcategory" to null.

Extract the following attributes with confidence scores (0.0-1.0):
{
  "attributes": [
    {"key": "color", "values": [{"value": "color name", "confidence": 0.0-1.0}]},
    {"key": "material", "values": [{"value": "material name", "confidence": 0.0-1.0}]},
    {"key": "pattern", "values": [{"value": "pattern type", "confidence": 0.0-1.0}]},
    {"key": "style", "values": [{"value": "style descriptor", "confidence": 0.0-1.0}]},
    {"key": "formality", "values": [{"value": "formality level", "confidence": 0.0-1.0}]},
    {"key": "season", "values": [{"value": "season", "confidence": 0.0-1.0}]},
    {"key": "occasion", "values": [{"value": "occasion type", "confidence": 0.0-1.0}]}
  ],
  "recognized_category": "Exact category name from available list",
  "recognized_subcategory": "Exact subcategory name from available list (or null if none match)",
  "suggested_title": "Short descriptive title",
  "suggested_notes": "Brief description"
}

Return ONLY valid JSON, no markdown code blocks, no explanation.`;
  
  // Call Gemini API
  const textResult = await callGeminiAPI(prompt, [imageB64], 'gemini-2.5-flash-image', 'TEXT');
  
  // Parse JSON response
  let result;
  try {
    const cleaned = textResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse AI response: ${e.message}`);
  }
  
  // Get or create attribute definitions
  const attributeKeys = ['color', 'material', 'pattern', 'style', 'formality', 'season', 'occasion'];
  const attributeLabels: Record<string, string> = {
    color: 'Color',
    material: 'Material',
    pattern: 'Pattern',
    style: 'Style',
    formality: 'Formality',
    season: 'Season',
    occasion: 'Occasion'
  };
  const definitionMap = new Map();
  
  for (const key of attributeKeys) {
    const { data: def, error: defError } = await supabase
      .from('attribute_definitions')
      .select('id, name')
      .eq('key', key)
      .single();
    
    if (def) {
      // If definition exists but has no name, update it
      if (!def.name) {
        await supabase
          .from('attribute_definitions')
          .update({ name: attributeLabels[key] || key })
          .eq('id', def.id);
      }
      definitionMap.set(key, def.id);
    } else {
      // Create definition if missing - include name for UI display
      const { data: newDef, error: createError } = await supabase
        .from('attribute_definitions')
        .insert({ 
          key, 
          name: attributeLabels[key] || key, 
          type: 'multiselect', 
          scope: 'wardrobe_item' 
        })
        .select()
        .single();
      
      if (newDef) {
        definitionMap.set(key, newDef.id);
      }
    }
  }
  
  // Create entity attributes
  const attributes = result.attributes || [];
  
  for (const attr of attributes) {
    const defId = definitionMap.get(attr.key);
    if (!defId) {
      continue;
    }
    
    for (const val of attr.values || []) {
      // Get or create attribute value
      let { data: value } = await supabase
        .from('attribute_values')
        .select('id')
        .eq('definition_id', defId)
        .ilike('value', val.value)
        .single();
      
      // If value doesn't exist, create it
      if (!value) {
        const { data: newValue } = await supabase
          .from('attribute_values')
          .insert({
            definition_id: defId,
            value: val.value
          })
          .select()
          .single();
        value = newValue;
      }
      
      const valueId = value?.id;
      
      // Create entity attribute
      await supabase
        .from('entity_attributes')
        .insert({
          entity_type: 'wardrobe_item',
          entity_id: wardrobe_item_id,
          definition_id: defId,
          value_id: valueId,
          raw_value: val.value,
          confidence: val.confidence,
          source: 'ai'
        });
    }
  }
  
  // Update wardrobe item with suggested fields and extracted color
  const updates: any = {};
  if (result.suggested_title) {
    updates.title = result.suggested_title;
  }
  if (result.suggested_notes) {
    updates.description = result.suggested_notes;
  }
  
  // Extract primary color from attributes and set color_primary field
  const colorAttr = result.attributes?.find((attr: any) => attr.key === 'color');
  if (colorAttr && colorAttr.values && colorAttr.values.length > 0) {
    // Use the first (highest confidence) color value
    updates.color_primary = colorAttr.values[0].value;
  }
  
  // Handle recognized category and subcategory
  if (result.recognized_category && allCategories) {
    const matchedCategory = allCategories.find(
      (c: any) => c.name.toLowerCase() === result.recognized_category.toLowerCase()
    );
    if (matchedCategory) {
      updates.category_id = matchedCategory.id;
      
      // Handle recognized subcategory if category matches
      if (result.recognized_subcategory && allSubcategories) {
        const matchedSubcategory = allSubcategories.find(
          (s: any) => s.name.toLowerCase() === result.recognized_subcategory.toLowerCase() &&
                      s.category_id === matchedCategory.id
        );
        if (matchedSubcategory) {
          updates.subcategory_id = matchedSubcategory.id;
        } else {
          // Clear subcategory if recognized one doesn't match
          updates.subcategory_id = null;
        }
      } else {
        // Clear subcategory if none recognized
        updates.subcategory_id = null;
      }
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('wardrobe_items')
      .update(updates)
      .eq('id', wardrobe_item_id);
  }
  
  return {
    attributes: result.attributes || [],
    recognized_category: result.recognized_category,
    recognized_subcategory: result.recognized_subcategory,
    suggested_title: result.suggested_title,
    suggested_notes: result.suggested_notes,
    color_primary: updates.color_primary
  };
}

async function processProductShot(input: AIJobInput, supabase: any, userId: string): Promise<any> {
  const { image_id, wardrobe_item_id } = input;
  
  if (!image_id || !wardrobe_item_id) {
    throw new Error('Missing required fields: image_id, wardrobe_item_id');
  }
  
  // Download original image
  const imageB64 = await downloadImageFromStorage(supabase, image_id);
  
  // Call Gemini API with 1:1 aspect ratio requirement
  const prompt = `Transform this clothing item into a professional product photography shot.
REQUIREMENTS:
- ASPECT RATIO: Exactly 1:1 (square format)
- Clean white or light grey studio background
- Professional lighting with soft shadows
- Product centered and well-framed in square composition
- Maintain EXACT colors, textures, and details from the original
- Style: Ghost mannequin (for 3D items) or flat lay (for accessories)
- High quality, commercial product photography aesthetic
- Remove any background clutter or distractions
- Ensure the item looks professional and ready for e-commerce
- OUTPUT: Square image (1:1 aspect ratio) suitable for grid display`;
  
  const productShotB64 = await callGeminiAPI(prompt, [imageB64], 'gemini-2.5-flash-image', 'IMAGE');
  
  // Upload to storage
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/product_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, productShotB64, storagePath);
  
  // Get existing images to understand current sort_order values
  const { data: existingImages, error: fetchError } = await supabase
    .from('wardrobe_item_images')
    .select('id, type, sort_order')
    .eq('wardrobe_item_id', wardrobe_item_id)
    .order('sort_order', { ascending: true });
  
  if (fetchError) {
    throw new Error(`Failed to fetch existing images: ${fetchError.message}`);
  }
  
  // Increment sort_order for all existing images (to make room for product shot at sort_order 0)
  // This ensures product shot is first, and all originals are shifted down
  if (existingImages && existingImages.length > 0) {
    // Update each existing image: increment their sort_order by 1
    // This makes room for the product shot at sort_order 0
    // Process in reverse order to avoid sort_order conflicts
    for (let i = existingImages.length - 1; i >= 0; i--) {
      const img = existingImages[i];
      const newSortOrder = img.sort_order + 1;
      
      const { error: updateError } = await supabase
        .from('wardrobe_item_images')
        .update({ sort_order: newSortOrder })
        .eq('id', img.id);
      
      if (updateError) {
        throw new Error(`Failed to update image ${img.id} sort_order: ${updateError.message}`);
      }
    }
  }
  
  // Create wardrobe_item_images link - product shot as default (sort_order=0)
  const { data: insertedLink, error: insertError } = await supabase
    .from('wardrobe_item_images')
    .insert({
      wardrobe_item_id,
      image_id: imageId,
      type: 'product_shot',
      sort_order: 0
    })
    .select()
    .single();
  
  if (insertError) {
    throw new Error(`Failed to create product shot link: ${insertError.message}`);
  }
  
  return {
    image_id: imageId,
    storage_key: storageKey
  };
}

async function processHeadshotGenerate(input: AIJobInput, supabase: any, userId: string): Promise<any> {
  const { selfie_image_id, hair_style, makeup_style } = input;
  
    
  if (!selfie_image_id) {
    throw new Error('Missing required field: selfie_image_id');
  }
  
  // Download selfie from storage
  const selfieB64 = await downloadImageFromStorage(supabase, selfie_image_id);
    
  // Build prompt with optional customization
  const hairMod = hair_style || 'Keep original hair';
  const makeupMod = makeup_style || 'Natural look';
  
  const prompt = `Professional studio headshot. 
SUBJECT: The person in the image.
CLOTHING: Wearing a simple white ribbed singlet (wife beater).
MODIFICATIONS: ${hairMod}, ${makeupMod}.
CRITICAL: Maintain the EXACT framing, zoom level, and head angle of the original image.
STYLE: Photorealistic, 8k, soft lighting, light grey/white background.
OUTPUT: Professional headshot suitable for fashion photography.`;
  
  const headshotB64 = await callGeminiAPI(prompt, [selfieB64], 'gemini-2.5-flash-image', 'IMAGE');
  
    
  // Upload generated headshot to storage
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/headshots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, headshotB64, storagePath);
  
    
  // Update user_settings with headshot_image_id
  await supabase
    .from('user_settings')
    .update({ headshot_image_id: imageId })
    .eq('user_id', userId);
  
    
  return {
    image_id: imageId,
    storage_key: storageKey
  };
}

async function processBodyShotGenerate(input: AIJobInput, supabase: any, userId: string): Promise<any> {
  const { body_photo_image_id, headshot_image_id } = input;
  
    
  if (!body_photo_image_id) {
    throw new Error('Missing required field: body_photo_image_id');
  }
  
  // Determine which headshot to use
  let headshotImageIdToUse: string | null = null;
  
  // If headshot_image_id is provided in input, use it
  if (headshot_image_id) {
    headshotImageIdToUse = headshot_image_id as string;
  } else {
    // Otherwise, fall back to user_settings.headshot_image_id (backward compatibility)
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('headshot_image_id')
      .eq('user_id', userId)
      .single();
    
    if (settingsError || !userSettings?.headshot_image_id) {
      throw new Error('User must generate headshot first before creating studio model');
    }
    
    headshotImageIdToUse = userSettings.headshot_image_id;
  }
  
  if (!headshotImageIdToUse) {
    throw new Error('No headshot available. Please generate a headshot first.');
  }
  
  // Download both images
  const headB64 = await downloadImageFromStorage(supabase, headshotImageIdToUse);
  const bodyB64 = await downloadImageFromStorage(supabase, body_photo_image_id);
  
    
  // Generate studio model by composing headshot onto body (legacy workflow)
  const prompt = `Generate a wide-shot, full-body studio photograph.
SUBJECT: A person standing in grey boxer shorts and a white ribbed singlet.
REFERENCES:
- Image 0: Source for facial features (headshot).
- Image 1: STRICT Source for body shape, pose, framing, and crop.

INSTRUCTIONS:
1. COMPOSITION: Wide shot showing full body with feet and space above head.
2. ANATOMY: Enforce "8-heads-tall" rule. Head should be proportional to body.
3. INTEGRATION: Seamlessly blend Head (Img 0) onto Body (Img 1) matching lighting and skin tone.
4. FRAMING: Maintain exact framing of Image 1 (Full Body Vertical 3:4 or 9:16).
5. PROPORTIONS: Head and neck must be proportional to shoulders (avoid bobblehead effect).
6. NEGATIVE CONSTRAINT: Significantly decrease the size of the head and length of neck if needed. Do not create a bobblehead effect.
7. BACKGROUND: Pure white studio background.`;

    
  // Use pro model for better quality body composition
  const studioModelB64 = await callGeminiAPI(prompt, [headB64, bodyB64], 'gemini-3-pro-image-preview', 'IMAGE');
  
    
  // Upload generated studio model to storage
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/body_shots/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, studioModelB64, storagePath);
  
    
  // Update user_settings with body_shot_image_id (studio model, not raw photo)
  await supabase
    .from('user_settings')
    .update({ body_shot_image_id: imageId })
    .eq('user_id', userId);
  
    
  return {
    image_id: imageId,
    storage_key: storageKey
  };
}

async function processOutfitSuggest(input: AIJobInput, supabase: any): Promise<any> {
  // TODO: Implement outfit_suggest per docs/AI_JOBS.md
  // - Query wardrobe items with constraints
  // - Use Gemini to score/rank candidates
  // - Return candidates per category
  return { message: 'outfit_suggest not yet implemented' };
}

async function processReferenceMatch(input: AIJobInput, supabase: any): Promise<any> {
  // TODO: Implement reference_match per docs/AI_JOBS.md
  // Known issues to fix:
  // 1. Supabase relationship between wardrobe_items and categories needs to be configured
  // 2. Query needs to properly join categories or fetch separately
  // 3. Need to handle archived items with .is('archived_at', null) not .eq()
  // 4. Alert.alert doesn't work well on web - use platform-specific alerts
  // See: archive/reference-match-feature-2026-01-20/ for partial implementation
  return { message: 'reference_match not yet implemented' };
}

async function processOutfitRender(
  input: AIJobInput,
  supabase: any,
  userId: string
): Promise<any> {
  const { outfit_id, selected, prompt, settings, headshot_image_id } = input;
  
  if (!outfit_id || !selected || selected.length === 0) {
    throw new Error('Missing required fields: outfit_id, selected');
  }
  
  // Get user settings to fetch headshot and body shot
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('headshot_image_id, body_shot_image_id, ai_model_preference')
    .eq('user_id', userId)
    .single();
  
  if (!userSettings?.body_shot_image_id) {
    throw new Error('User must upload body photo before generating outfits');
  }
  
  // Determine which headshot to use
  // If headshot_image_id is provided in input, use it; otherwise use user_settings.headshot_image_id
  let headshotImageIdToUse: string | null = null;
  
  if (headshot_image_id) {
    headshotImageIdToUse = headshot_image_id as string;
  } else if (userSettings?.headshot_image_id) {
    headshotImageIdToUse = userSettings.headshot_image_id;
  }
  
  if (!headshotImageIdToUse) {
    throw new Error('User must generate headshot before generating outfits');
  }
  
  // Get outfit data
  const { data: outfit } = await supabase
    .from('outfits')
    .select('*')
    .eq('id', outfit_id)
    .single();
  
  // Get wardrobe items and images
  const wardrobeItemIds = selected.map(s => s.wardrobe_item_id);
  console.log(`[OutfitRender] Requesting ${wardrobeItemIds.length} wardrobe items:`, wardrobeItemIds);
  
  // Query items first
  const { data: items, error: itemsError } = await supabase
    .from('wardrobe_items')
    .select('id, title, owner_user_id')
    .in('id', wardrobeItemIds);
  
  if (itemsError) {
    console.error(`[OutfitRender] Error fetching wardrobe items:`, itemsError);
    throw new Error(`Failed to fetch wardrobe items: ${itemsError.message}`);
  }
  
  console.log(`[OutfitRender] Retrieved ${items?.length || 0} wardrobe items:`, items?.map((i: any) => ({ id: i.id, title: i.title, owner: i.owner_user_id })));
  
  if (items && items.length !== wardrobeItemIds.length) {
    const returnedIds = items.map((i: any) => i.id);
    const missingIds = wardrobeItemIds.filter(id => !returnedIds.includes(id));
    console.warn(`[OutfitRender] Missing ${missingIds.length} items:`, missingIds);
  }
  
  // Query image links separately for better debugging
  const { data: imageLinks, error: linksError } = await supabase
    .from('wardrobe_item_images')
    .select('wardrobe_item_id, image_id, type, sort_order, images(id, storage_key, storage_bucket)')
    .in('wardrobe_item_id', wardrobeItemIds)
    .order('sort_order', { ascending: true });
  
  if (linksError) {
    console.error(`[OutfitRender] Error fetching image links:`, linksError);
    throw new Error(`Failed to fetch image links: ${linksError.message}`);
  }
  
  console.log(`[OutfitRender] Retrieved ${imageLinks?.length || 0} image links`);
  
  // Group images by wardrobe_item_id
  const imagesByItem = new Map<string, any[]>();
  for (const link of imageLinks || []) {
    if (!imagesByItem.has(link.wardrobe_item_id)) {
      imagesByItem.set(link.wardrobe_item_id, []);
    }
    imagesByItem.get(link.wardrobe_item_id)!.push(link);
  }
  
  // Download wardrobe item images (prioritize product_shot over original)
  const itemImages: string[] = [];
  for (const item of items || []) {
    const itemImageLinks = imagesByItem.get(item.id) || [];
    console.log(`[OutfitRender] Item ${item.id} (${item.title}, owner: ${item.owner_user_id}) has ${itemImageLinks.length} image links`);
    
    if (itemImageLinks.length === 0) {
      console.warn(`[OutfitRender] No image links found for item ${item.id} (${item.title})`);
      continue;
    }
    
    // Sort images: product_shot first, then by sort_order
    const sortedImages = [...itemImageLinks].sort((a: any, b: any) => {
      if (a.type === 'product_shot' && b.type !== 'product_shot') return -1;
      if (b.type === 'product_shot' && a.type !== 'product_shot') return 1;
      return (a.sort_order || 999) - (b.sort_order || 999);
    });
    
    // Handle nested images structure - could be object or array
    let selectedImage = null;
    const firstLink = sortedImages[0];
    if (firstLink) {
      // images might be an object (single) or array (multiple)
      if (Array.isArray(firstLink.images)) {
        selectedImage = firstLink.images[0];
      } else if (firstLink.images) {
        selectedImage = firstLink.images;
      } else if (firstLink.image_id) {
        // Fallback: query image directly if nested query didn't work
        console.log(`[OutfitRender] Nested image data missing, querying image ${firstLink.image_id} directly`);
        const { data: imageData, error: imgError } = await supabase
          .from('images')
          .select('id, storage_key, storage_bucket')
          .eq('id', firstLink.image_id)
          .single();
        if (!imgError && imageData) {
          selectedImage = imageData;
        }
      }
    }
    
    if (selectedImage && selectedImage.storage_key) {
      console.log(`[OutfitRender] Using image ${selectedImage.id} (${selectedImage.storage_key}) for item ${item.id}`);
      try {
        const b64 = await downloadImageFromStorage(supabase, selectedImage.id);
        if (b64) {
          itemImages.push(b64);
          console.log(`[OutfitRender] Successfully downloaded image for item ${item.id}`);
        } else {
          console.warn(`[OutfitRender] Failed to download image ${selectedImage.id} for item ${item.id}`);
        }
      } catch (error: any) {
        console.error(`[OutfitRender] Error downloading image ${selectedImage.id} for item ${item.id}:`, error.message);
      }
    } else {
      console.warn(`[OutfitRender] No valid image found for item ${item.id} (${item.title}) - link data:`, JSON.stringify(firstLink, null, 2));
    }
  }
  
  console.log(`[OutfitRender] Successfully loaded ${itemImages.length} images out of ${items?.length || 0} items`);
  
  if (itemImages.length === 0) {
    throw new Error('No images could be loaded for the selected wardrobe items');
  }
  
  // Download user's headshot and body shot
  const headB64 = await downloadImageFromStorage(supabase, headshotImageIdToUse);
  const bodyB64 = await downloadImageFromStorage(supabase, userSettings.body_shot_image_id);
  
  // Get user's preferred model (default to gemini-2.5-flash-image)
  const preferredModel = userSettings.ai_model_preference || 'gemini-2.5-flash-image';
  
  // Determine workflow based on item count and model limits
  const itemCount = itemImages.length;
  const standardLimit = 2; // gemini-2.5-flash-image limit
  const proLimit = 7; // gemini-3-pro-image-preview limit
  const modelLimit = preferredModel.includes('pro') ? proLimit : standardLimit;
  const useMannequin = itemCount > modelLimit;
  
  let finalImageB64: string;
  
  if (useMannequin) {
    // Step 1: Generate mannequin
    const mannequinPrompt = `Generate a photorealistic image of a fashion outfit on a ghost mannequin.
INSTRUCTIONS:
- Combine all provided clothing items into a single cohesive outfit.
- BACKGROUND: Simple grey studio.
- STYLE: Ghost mannequin (invisible mannequin).
- CLOTHING: ${itemCount} items provided.
- DETAILS: ${prompt || "No additional details"}.
- ASPECT RATIO: Vertical Portrait.`;
    
    // Use preferred model for mannequin generation
    const mannequinB64 = await callGeminiAPI(mannequinPrompt, itemImages, preferredModel, 'IMAGE');
    
    // Step 2: Apply to body
    const applyPrompt = `DRESSING THE SUBJECT:
- IMAGE 0: The body/pose reference (base photo).
- IMAGE 1: The target outfit (on mannequin).
- IMAGE 2: The facial identity reference (headshot).

TASK:
- Transfer the EXACT outfit from Image 1 onto the person in Image 0.
- Use the face, hair, and head from Image 2.
- Maintain the body pose and framing from Image 0.
- Ensure lighting and skin tones match perfectly.
- Ensure head-to-body proportions are accurate (8-heads-tall rule).
- OUTPUT: Full Body Vertical Portrait.`;
    
    console.log(`[OutfitRender] Using mannequin workflow with ${[bodyB64, mannequinB64, headB64].length} images`);
    console.log(`[OutfitRender] Using model: gemini-3-pro-image-preview`);
    
    try {
      // Use pro model for final render (better quality for applying outfit to body)
      finalImageB64 = await callGeminiAPI(applyPrompt, [bodyB64, mannequinB64, headB64], 'gemini-3-pro-image-preview', 'IMAGE');
      console.log(`[OutfitRender] Gemini API returned image data (${finalImageB64.length} chars)`);
    } catch (error: any) {
      console.error(`[OutfitRender] Gemini API error:`, error.message);
      console.error(`[OutfitRender] Error stack:`, error.stack);
      throw error;
    }
  } else {
    // Direct workflow
    const directPrompt = `Fashion Photography.
OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).

SUBJECT REFERENCE:
- Image 0: Current body state, pose, and framing.
- Image 1: STRICT Facial Identity reference. Use the face, hair, and head from this image.

CLOTHING INSTRUCTIONS:
- Dress the subject in the provided clothing images.
- ${prompt || "No additional details"}

CRITICAL:
1. Apply the exact facial identity, hair, and head from Image 1 onto the body in Image 0.
2. Maintain the EXACT pose and framing from Image 0.
3. Focus ONLY on applying/changing the clothes as requested.
4. Ensure head-to-body proportions are accurate (8-heads-tall rule). No long necks or large heads.
5. Background: Pure white infinite studio.`;
    
    const allImages = [bodyB64, headB64, ...itemImages];
    console.log(`[OutfitRender] Calling Gemini API with ${allImages.length} images (body, head, ${itemImages.length} items)`);
    console.log(`[OutfitRender] Using model: ${preferredModel}`);
    console.log(`[OutfitRender] Prompt length: ${directPrompt.length} chars`);
    
    try {
      // Use preferred model for direct workflow
      finalImageB64 = await callGeminiAPI(directPrompt, allImages, preferredModel, 'IMAGE');
      console.log(`[OutfitRender] Gemini API returned image data (${finalImageB64.length} chars)`);
    } catch (error: any) {
      console.error(`[OutfitRender] Gemini API error:`, error.message);
      console.error(`[OutfitRender] Error stack:`, error.stack);
      throw error;
    }
  }
  
  if (!finalImageB64) {
    throw new Error('No image generated from Gemini API');
  }
  
  console.log(`[OutfitRender] Uploading generated image to storage...`);
  // Upload generated image
  const timestamp = Date.now();
  const storagePath = `${userId}/ai/outfits/${outfit_id}/${timestamp}.jpg`;
  const { imageId, storageKey } = await uploadImageToStorage(supabase, userId, finalImageB64, storagePath);
  console.log(`[OutfitRender] Image uploaded: ${imageId}, path: ${storagePath}`);
  
  // Create outfit_renders record
  const { data: render } = await supabase
    .from('outfit_renders')
    .insert({
      outfit_id,
      image_id: imageId,
      prompt: prompt || null,
      settings: settings || {},
      status: 'succeeded'
    })
    .select()
    .single();
  
  // Always update outfit cover_image_id with the latest render
  await supabase
    .from('outfits')
    .update({ cover_image_id: imageId })
    .eq('id', outfit_id);
  
  return {
    renders: [{
      image_id: imageId,
      storage_key: storageKey,
      width: 1024, // Default, could extract from image
      height: 1280
    }]
  };
}