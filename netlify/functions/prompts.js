"use strict";

// This module defines a collection of prompt templates used by the AI
// generation functions. Each property corresponds to a distinct AI
// workflow and returns either a static string or a function that
// produces a string incorporating dynamic values.

const PROMPTS = {
  // Analyze a clothing item and extract detailed attributes
  AUTO_TAG: (categories, subcategories) => `
    Analyze this clothing item image and extract detailed attributes in JSON format.
    
    Available Categories: ${categories}
    Available Subcategories: ${subcategories}

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

    Return ONLY valid JSON, no markdown code blocks, no explanation.
  `,

  // Transform a clothing item into a professional product shot
  PRODUCT_SHOT: `
    Transform this clothing item into a professional e-commerce product shot.
    
    VISUAL REQUIREMENTS:
    1. STYLE: "Ghost Mannequin" / "Invisible Mannequin". The item must look 3D and filled out as if worn, but NO mannequin, human body parts, or stands should be visible. Hollow out the neck/sleeves.
    2. BACKGROUND: Pure Solid White (Hex #FFFFFF). Do not use light grey or off-white. The background must be #FFFFFF.
    3. LIGHTING: Soft, commercial studio lighting. Subtle, natural drop shadow directly underneath to ground the item (no floating).
    4. FIDELITY: Maintain the EXACT colors, patterns, texture, and text/logos of the original item. Do not hallucinate new details.

    NEGATIVE CONSTRAINTS:
    - NO visible mannequin heads, arms, legs, or stands.
    - NO grey backgrounds.
    - NO complex props or clutter.
    - NO cropping of the item (keep the full item visible).

    OUTPUT FORMAT:
    - Square aspect ratio (1:1).
    - Center the item with balanced white padding on all sides.
  `,

  // Generate a professional headshot using the subject's selfie
  HEADSHOT: (hair, makeup) => `
    Professional studio headshot. 
    SUBJECT: The person in the image.
    CLOTHING: Wearing a simple white ribbed singlet (wife beater).
    MODIFICATIONS: ${hair}, ${makeup}.
    CRITICAL: Maintain the EXACT framing, zoom level, and head angle of the original image.
    STYLE: Photorealistic, 8k, soft lighting, light grey/white background.
    OUTPUT: Professional headshot suitable for fashion photography.
  `,
  // Generate a professional headshot using preset-driven prompt text
  HEADSHOT_PRESET: (styleNotes) => `
    Professional studio headshot. 
    SUBJECT: The person in the image.
    CLOTHING: Wearing a simple white ribbed singlet (wife beater).
    STYLE DIRECTION:
    ${styleNotes}
    CRITICAL: Maintain the EXACT framing, zoom level, and head angle of the original image.
    STYLE: Photorealistic, 8k, soft lighting, light grey/white background.
    OUTPUT: Professional headshot suitable for fashion photography.
  `,

  // Compose a head on a body to produce a full-body composite
  BODY_COMPOSITE: `
    Generate a wide-shot, full-body studio photograph.
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
    7. BACKGROUND: Pure white studio background.
  `,

  // Direct outfit render prompt for client-side stacked clothing items
  // Dynamic builder function that adapts based on includeHeadshot parameter
  OUTFIT_FINAL_STACKED: (details, itemCount, includeHeadshot = true) => {
    // Dynamic indexing: adjust image indices based on headshot inclusion
    const bodyImageIndex = 0;
    const headImageIndex = includeHeadshot ? 1 : null;
    const clothingImageIndex = includeHeadshot ? 2 : 1;

    // Dynamic identity instructions
    const subjectReferenceSection = includeHeadshot
      ? `    SUBJECT REFERENCE:
    - Image ${bodyImageIndex}: Current body state, pose, and framing.
    - Image ${headImageIndex}: STRICT Facial Identity reference. Use the face, hair, and head from this image.`
      : `    SUBJECT REFERENCE:
    - Image ${bodyImageIndex}: BASE BODY & FACE. Contains the subject's real face. Do not modify.`;

    const clothingReferenceSection = `    CLOTHING REFERENCE:
    - Image ${clothingImageIndex}: A composite grid image showing ${itemCount} clothing items on a white background.
    - The items are arranged in a grid layout for visual inventory.
    - Analyze ALL items in this grid image carefully.`;

    const clothingInstructionsSection = `    CLOTHING INSTRUCTIONS:
    - Dress the subject in ALL ${itemCount} clothing items from Image ${clothingImageIndex} (the grid image).
    - Image ${clothingImageIndex} is a visual inventory. The items are arranged in a grid.
    - Combine all items into a cohesive, fashionable outfit.
    - ${details}`;

    const identityInstruction = includeHeadshot
      ? `    1. Apply the exact facial identity, hair, and head from Image ${headImageIndex} onto the body in Image ${bodyImageIndex}.`
      : `    1. CRITICAL: PRESERVE THE FACE. The subject in Image ${bodyImageIndex} is the real person. You must composite the new clothes onto the body WITHOUT altering the facial features, hair, or head shape. Keep the original face exactly as it appears in Image ${bodyImageIndex}.`;

    return `
    Fashion Photography.
    OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).

${subjectReferenceSection}

${clothingReferenceSection}

${clothingInstructionsSection}

    CRITICAL:
${identityInstruction}
    2. Maintain the EXACT pose and framing from Image ${bodyImageIndex}.
    3. Use ALL clothing items visible in the grid Image ${clothingImageIndex}.
    4. Ensure head-to-body proportions are accurate (8-heads-tall rule). No long necks or large heads.
    5. Background: Pure white infinite studio.
    6. Create a cohesive outfit that looks natural and fashionable.
    7. Pay attention to layering: start with base layers (underwear/shirts) then add outer layers (jackets/coats).
  `;
  },

  // Direct outfit render prompt for individual clothing items
  // Dynamic builder function that adapts based on includeHeadshot parameter
  OUTFIT_FINAL: (details, itemCount, includeHeadshot = true) => {
    // Dynamic indexing: adjust image indices based on headshot inclusion
    const bodyImageIndex = 0;
    const headImageIndex = includeHeadshot ? 1 : null;
    const firstClothingImageIndex = includeHeadshot ? 2 : 1;
    const lastClothingImageIndex = includeHeadshot ? 1 + itemCount : itemCount;

    // Dynamic identity instructions
    const subjectReferenceSection = includeHeadshot
      ? `    SUBJECT REFERENCE:
    - Image ${bodyImageIndex}: Current body state, pose, and framing.
    - Image ${headImageIndex}: STRICT Facial Identity reference. Use the face, hair, and head from this image.`
      : `    SUBJECT REFERENCE:
    - Image ${bodyImageIndex}: BASE BODY & FACE. Contains the subject's real face. Do not modify.`;

    const clothingReferenceSection = `    CLOTHING REFERENCE:
    - Images ${firstClothingImageIndex} to ${lastClothingImageIndex}: Individual clothing items.
    - Analyze ALL items in these images carefully.`;

    const clothingInstructionsSection = `    CLOTHING INSTRUCTIONS:
    - Dress the subject in ALL ${itemCount} clothing items from Images ${firstClothingImageIndex} to ${lastClothingImageIndex}.
    - Combine all items into a cohesive, fashionable outfit.
    - ${details}`;

    const identityInstruction = includeHeadshot
      ? `    1. Apply the exact facial identity, hair, and head from Image ${headImageIndex} onto the body in Image ${bodyImageIndex}.`
      : `    1. CRITICAL: PRESERVE THE FACE. The subject in Image ${bodyImageIndex} is the real person. You must composite the new clothes onto the body WITHOUT altering the facial features, hair, or head shape. Keep the original face exactly as it appears in Image ${bodyImageIndex}.`;

    return `
    Fashion Photography.
    OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).

${subjectReferenceSection}

${clothingReferenceSection}

${clothingInstructionsSection}

    CRITICAL:
${identityInstruction}
    2. Maintain the EXACT pose and framing from Image ${bodyImageIndex}.
    3. Use ALL clothing items provided.
    4. Ensure head-to-body proportions are accurate (8-heads-tall rule). No long necks or large heads.
    5. Background: Pure white infinite studio.
    6. Create a cohesive outfit that looks natural and fashionable.
    7. Pay attention to layering: start with base layers (underwear/shirts) then add outer layers (jackets/coats).
  `;
  },
  // Try-on prompt: apply outfit from a reference image to the user's body shot
  OUTFIT_REFERENCE: (details = 'Match the outfit exactly') => `
    Fashion Photography.
    OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).

    SUBJECT REFERENCE:
    - Image 0: User body and face. Preserve identity, pose, and framing.

    OUTFIT REFERENCE:
    - Image 1: Outfit to replicate. Match clothing pieces, colors, patterns, textures, layering, and footwear.

    CRITICAL:
    1. PRESERVE THE FACE. Do not alter facial features, hair, or head shape from Image 0.
    2. Maintain the EXACT pose and framing from Image 0.
    3. Recreate the outfit from Image 1 as faithfully as possible.
    4. Ensure head-to-body proportions are accurate (8-heads-tall rule).
    5. Background: Pure white infinite studio.
    6. ${details}.
  `
};

module.exports = { PROMPTS };
