# AI Jobs — Contract Definitions (Gemini)

All AI calls are executed server-side in Netlify Functions.
Client only creates ai_jobs rows and polls status.

## Common fields
ai_jobs:
- job_type: auto_tag | product_shot | headshot_generate | body_shot_generate | outfit_suggest | reference_match | outfit_render | lookbook_generate
- input: JSON payload
- result: JSON payload
- status: queued | running | succeeded | failed

### Error handling
- If model fails, set status=failed and error string.
- Never partially write renders; write renders only after images are uploaded and images table rows exist.

## 1) headshot_generate (user profile setup)
### input
{
  "selfie_image_id": "uuid",
  "hair_style": "Keep original hair" | "custom description",
  "makeup_style": "Natural look" | "custom description"
}

### result
{
  "image_id": "uuid",
  "storage_key": "user_id/ai/headshots/timestamp.jpg"
}

## 2) body_shot_generate (studio model creation)
### input
{
  "body_photo_image_id": "uuid"
}

### result
{
  "image_id": "uuid",
  "storage_key": "user_id/ai/body_shots/timestamp.jpg"
}

### notes
- Requires user to have headshot_image_id already set in user_settings
- Combines the generated headshot with user's body photo to create studio model
- Uses "8-heads-tall" rule for proper body proportions
- Result is stored as body_shot_image_id in user_settings

## 3) auto_tag (wardrobe_item)
### input
{
  "wardrobe_item_id": "uuid",
  "image_ids": ["uuid", "..."],
  "category": "Tops",
  "subcategory": "Shirts/Button-downs"
}

### result
{
  "attributes": [
    {"key": "color", "values": [{"value": "white", "confidence": 0.92}]},
    {"key": "material", "values": [{"value": "linen", "confidence": 0.75}]},
    {"key": "pattern", "values": [{"value": "solid", "confidence": 0.86}]},
    {"key": "style", "values": [{"value": "minimal", "confidence": 0.61}]},
    {"key": "formality", "values": [{"value": "smart-casual", "confidence": 0.68}]},
    {"key": "season", "values": [{"value": "summer", "confidence": 0.62}]},
    {"key": "occasion", "values": [{"value": "work", "confidence": 0.54}]}
  ],
  "suggested_title": "White linen shirt",
  "suggested_notes": "Lightweight, breathable, easy to dress up or down."
}

## 4) outfit_suggest (per category/subcategory)
### input
{
  "user_id": "uuid",
  "prompt": "Work outfits for warm weather in neutral tones",
  "constraints": {
    "occasion": ["work"],
    "season": ["summer"],
    "colors": ["white","beige","black"],
    "exclude_materials": [],
    "include_item_ids": [],
    "exclude_item_ids": []
  },
  "request": {
    "mode": "per_category",
    "categories": [
      {"category": "Tops", "subcategory": "Blouses"},
      {"category": "Bottoms", "subcategory": "Trousers/Pants"}
    ],
    "limit_per_category": 12
  }
}

### result
{
  "candidates": [
    {
      "category": "Tops",
      "subcategory": "Blouses",
      "items": [
        {"wardrobe_item_id": "uuid", "score": 0.91, "reasons": ["neutral color", "work-appropriate", "breathable material"]},
        {"wardrobe_item_id": "uuid", "score": 0.83, "reasons": ["matches palette", "smart-casual"]}
      ]
    },
    {
      "category": "Bottoms",
      "subcategory": "Trousers/Pants",
      "items": [
        {"wardrobe_item_id": "uuid", "score": 0.88, "reasons": ["wide-leg", "linen blend", "neutral"]}
      ]
    }
  ],
  "notes": "Selected items prioritize breathable fabrics and a cohesive neutral palette."
}

## 5) reference_match (match wardrobe to a reference image)
### input
{
  "user_id": "uuid",
  "reference_image_id": "uuid",
  "constraints": {
    "must_include_categories": ["Tops","Bottoms","Shoes"],
    "allow_missing_categories": true
  }
}

### result
{
  "matches": [
    {
      "category": "Tops",
      "items": [{"wardrobe_item_id":"uuid","score":0.87,"reasons":["similar silhouette","similar color"]}]
    },
    {
      "category": "Shoes",
      "items": []
    }
  ],
  "missing_categories": ["Shoes"],
  "notes": "No close match for shoes; consider leaving category empty or selecting manually."
}

## 6) outfit_render (generate images)
### input
{
  "user_id": "uuid",
  "outfit_id": "uuid",
  "selected": [
    {"category":"Tops","wardrobe_item_id":"uuid"},
    {"category":"Bottoms","wardrobe_item_id":"uuid"}
  ],
  "prompt": "Smart casual, warm weather, neutral tones",
  "reference_image_id": "uuid | null",
  "settings": {
    "num_images": 2,
    "aspect": "4:5",
    "style": "photoreal",
    "background": "studio",
    "quality": "standard"
  }
}

### result
{
  "renders": [
    {
      "image_storage_key": "media/{userId}/ai/outfits/{outfitId}/{uuid}.jpg",
      "width": 1024,
      "height": 1280,
      "seed": 12345,
      "notes": "Neutral palette, minimal styling."
    }
  ]
}

## 7) lookbook_generate (optional later)
### input
{
  "user_id":"uuid",
  "prompt":"Vacation capsule for Europe summer",
  "constraints": {...},
  "limit": 24
}

### result
{
  "outfit_ids": ["uuid", "..."],
  "notes": "Capsule prioritizes mix-and-match neutrals with a few accents."
}