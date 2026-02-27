"use strict";

const { callGeminiAPI, getGeminiApiVersion } = require("../utils");
const { normalizeLabelList } = require("./outfit_helpers");

/**
 * Generates a description for an outfit based on its items
 * Runs in parallel with image generation for fast user feedback
 */
async function generateOutfitDescription(outfitId, itemDetails, supabase, perfTracker = null, jobId = null) {
  console.log(`[OutfitDescription] Starting description generation for outfit ${outfitId}`);
  const startTime = Date.now();
  
  try {
    // Build the description prompt
    const itemsList = itemDetails.map(item => {
      const parts = [];
      if (item.category) parts.push(item.category);
      if (item.title) parts.push(item.title);
      if (item.color_primary) parts.push(`(${item.color_primary})`);
      if (item.brand) parts.push(`by ${item.brand}`);
      return `- ${parts.join(' ')}`;
    }).join('\n');

    const prompt = `You are a professional fashion stylist. Analyze this outfit and provide a JSON response.

OUTFIT ITEMS:
${itemsList}

Provide a JSON response with this exact structure:
{
  "title": "A short outfit title (max 25 characters)",
  "description": "A 2-3 sentence description of the overall outfit style and aesthetic",
  "occasions": ["occasion1", "occasion2", "occasion3"],
  "style_tags": ["tag1", "tag2", "tag3"],
  "season": "spring|summer|fall|winter|all-season"
}

Guidelines:
- Title must be 25 characters or fewer (short, punchy, no quotes). If uncertain, keep it very short.
- Description should be engaging and highlight how the pieces work together
- Occasions should be specific (e.g., "casual brunch", "business meeting", "date night")
- Provide exactly 3 occasions
- Use Title Case for occasions (e.g., "Casual Brunch")
- Style tags should describe the overall vibe (e.g., "minimalist", "preppy", "streetwear")
- Provide exactly 3 style tags
- Use Title Case for style tags (e.g., "Minimalist")
- Keep it concise and actionable

Respond with ONLY the JSON object, no additional text.`;

    // Call Gemini with text-only model (much faster than image generation)
    const model = "gemini-2.5-flash";
    const apiVersion = getGeminiApiVersion(model);
    console.log("[Gemini] ABOUT TO CALL", { job_id: jobId, model, apiVersion });
    const response = await callGeminiAPI(
      prompt,
      [], // No images needed for description
      model,
      "TEXT",
      perfTracker,
      null
    );
    console.log("[Gemini] CALL COMPLETE", { job_id: jobId });

    // Parse the JSON response
    const description = parseDescriptionResponse(response);
    
    const { data: outfitRow } = await supabase
      .from('outfits')
      .select('title')
      .eq('id', outfitId)
      .maybeSingle();

    const existingTitle = (outfitRow?.title || '').trim();
    const isDefaultTitle =
      existingTitle === '' ||
      existingTitle.toLowerCase() === 'generated outfit' ||
      existingTitle.toLowerCase() === 'untitled outfit';

    const updates = {
      description: description.description,
      occasions: description.occasions,
      style_tags: description.styleTags,
      season: description.season,
      description_generated_at: new Date().toISOString()
    };

    if (description.title && isDefaultTitle) {
      updates.title = description.title;
    }

    // Save to database immediately
    const { error: updateError } = await supabase
      .from('outfits')
      .update(updates)
      .eq('id', outfitId);

    if (updateError) {
      console.error(`[OutfitDescription] Failed to save description:`, updateError);
      throw updateError;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[OutfitDescription] Description saved in ${(elapsed / 1000).toFixed(2)}s`);

    return description;
  } catch (error) {
    console.error(`[OutfitDescription] Error generating description:`, error);
    // Don't fail the entire job if description fails
    return null;
  }
}

/**
 * Parse the AI response and extract structured description data
 */
function parseDescriptionResponse(apiResponse) {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = apiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const rawTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const safeTitle = rawTitle ? rawTitle.slice(0, 25) : '';

    return {
      title: safeTitle,
      description: parsed.description || '',
      occasions: normalizeLabelList(parsed.occasions).slice(0, 3),
      styleTags: normalizeLabelList(parsed.style_tags).slice(0, 3),
      season: parsed.season || 'all-season',
    };
  } catch (error) {
    console.error('[OutfitDescription] Failed to parse JSON:', error);
    // Fallback to extracting what we can from raw text
    return {
      title: '',
      description: apiResponse.substring(0, 500).trim(),
      occasions: [],
      styleTags: [],
      season: 'all-season',
    };
  }
}

/**
 * Fetch outfit item details for description generation
 */
async function fetchOutfitItemDetails(outfitId, supabase, userId) {
  console.log(`[OutfitDescription] Fetching item details for outfit ${outfitId}`);
  
  try {
    // Use the existing function to get outfit items with wardrobe details
    const { data, error } = await supabase
  .rpc('get_outfit_items_with_details', {
    p_outfit_id: outfitId,
    p_viewer_id: userId,
  });

    if (error) {
      console.error(`[OutfitDescription] Error fetching items:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`[OutfitDescription] No items found for outfit ${outfitId}`);
      return [];
    }

    // Extract wardrobe item details from the JSONB column
    const itemDetails = data.map(row => {
      const item = row.wardrobe_item;
      
      return {
        title: item.name || item.title || 'Unknown item',
        brand: item.brand || null,
        color_primary: item.color || item.color_primary || null,
        category: null, // Category name would need separate lookup if needed
      };
    });

    console.log(`[OutfitDescription] Found ${itemDetails.length} items`);
    return itemDetails;
  } catch (error) {
    console.error(`[OutfitDescription] Exception fetching items:`, error);
    return [];
  }
}

module.exports = {
  generateOutfitDescription,
  fetchOutfitItemDetails,
};
