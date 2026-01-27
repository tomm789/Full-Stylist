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
    Transform this clothing item into a professional product photography shot.
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
    - OUTPUT: Square image (1:1 aspect ratio) suitable for grid display
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
  OUTFIT_FINAL_STACKED: (details, itemCount) => `
    Fashion Photography.
    OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).

    SUBJECT REFERENCE:
    - Image 0: Current body state, pose, and framing.
    - Image 1: STRICT Facial Identity reference. Use the face, hair, and head from this image.

    CLOTHING REFERENCE:
    - Image 2: A vertically-stacked image showing ${itemCount} clothing items.
    - Each item is separated by a thin grey line in the stack.
    - Analyze ALL items in this stacked image carefully.

    CLOTHING INSTRUCTIONS:
    - Dress the subject in ALL ${itemCount} clothing items from Image 2 (the stacked image).
    - Combine all items into a cohesive, fashionable outfit.
    - ${details}

    CRITICAL:
    1. Apply the exact facial identity, hair, and head from Image 1 onto the body in Image 0.
    2. Maintain the EXACT pose and framing from Image 0.
    3. Use ALL clothing items visible in the stacked Image 2.
    4. Ensure head-to-body proportions are accurate (8-heads-tall rule). No long necks or large heads.
    5. Background: Pure white infinite studio.
    6. Create a cohesive outfit that looks natural and fashionable.
    7. Pay attention to layering: start with base layers (underwear/shirts) then add outer layers (jackets/coats).
  `
};

module.exports = { PROMPTS };
