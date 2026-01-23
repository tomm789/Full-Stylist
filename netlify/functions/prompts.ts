// prompts.js

const PROMPTS = {
    AUTO_TAG: (categories, subcategories) => `
      Analyze this clothing item image and extract detailed attributes in JSON format.
      Available Categories: ${categories}
      Available Subcategories: ${subcategories}
      
      IMPORTANT: 
      1. RECOGNIZE the most appropriate category/subcategory from the lists.
      2. Match names EXACTLY.
      3. If unsure of subcategory, set "recognized_subcategory" to null.
  
      Extract attributes with confidence (0.0-1.0):
      {
        "attributes": [
          {"key": "color", "values": [{"value": "name", "confidence": 0.0-1.0}]},
          {"key": "material", "values": [{"value": "name", "confidence": 0.0-1.0}]},
          {"key": "pattern", "values": [{"value": "type", "confidence": 0.0-1.0}]},
          {"key": "style", "values": [{"value": "descriptor", "confidence": 0.0-1.0}]},
          {"key": "formality", "values": [{"value": "level", "confidence": 0.0-1.0}]},
          {"key": "season", "values": [{"value": "season", "confidence": 0.0-1.0}]},
          {"key": "occasion", "values": [{"value": "type", "confidence": 0.0-1.0}]}
        ],
        "recognized_category": "Exact string match",
        "recognized_subcategory": "Exact string match or null",
        "suggested_title": "Short descriptive title",
        "suggested_notes": "Brief description"
      }
      Return ONLY valid JSON.
    `,
  
    PRODUCT_SHOT: `
      Transform this clothing item into a professional product photography shot.
      REQUIREMENTS:
      - ASPECT RATIO: Exactly 1:1 (square).
      - Background: Clean white or light grey studio.
      - Style: Ghost mannequin (3D items) or flat lay (accessories).
      - Remove background clutter.
      - Maintain EXACT colors/textures.
    `,
  
    HEADSHOT: (hair, makeup) => `
      Professional studio headshot.
      SUBJECT: The person in the image.
      CLOTHING: Wearing a simple white ribbed singlet (wife beater).
      MODIFICATIONS: ${hair}, ${makeup}.
      CRITICAL: Maintain EXACT framing, zoom level, and head angle.
      STYLE: Photorealistic, 8k, soft lighting, light grey/white background.
    `,
  
    BODY_COMPOSITE: `
      Generate a wide-shot, full-body studio photograph.
      REFERENCES:
      - Image 0: Facial features (headshot).
      - Image 1: Body shape, pose, framing (body shot).
      
      INSTRUCTIONS:
      1. Blend Head (Img 0) onto Body (Img 1).
      2. Maintain exact framing of Image 1.
      3. ANATOMY: Enforce "8-heads-tall" rule. Avoid bobblehead effect.
      4. Match lighting and skin tone perfectly.
      5. Background: Pure white studio.
    `,
  
    OUTFIT_MANNEQUIN: (count, details) => `
      Generate a photorealistic image of a fashion outfit on a ghost mannequin.
      - Combine all ${count} items into a cohesive outfit.
      - BACKGROUND: Simple grey studio.
      - STYLE: Ghost mannequin.
      - DETAILS: ${details}.
      - ASPECT RATIO: Vertical Portrait.
    `,
  
    OUTFIT_FINAL: (details) => `
      Fashion Photography. Vertical Portrait (3:4).
      REFERENCES:
      - Image 0: Body state, pose, framing.
      - Image 1: STRICT Facial Identity.
      
      INSTRUCTIONS:
      1. Dress the subject in the provided clothing images.
      2. Apply face/hair from Image 1 onto Body in Image 0.
      3. Maintain EXACT pose from Image 0.
      4. ${details}
      5. PROPORTIONS: 8-heads-tall rule. No large heads.
    `
  };
  
  // Export using CommonJS syntax
  module.exports = { PROMPTS };
  