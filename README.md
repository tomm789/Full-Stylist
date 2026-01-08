# Full Stylist - Image Generation Documentation

This document provides a comprehensive overview of all code related to image generation through the Google Gemini API. Use this documentation when consulting with Gemini to get advice on improving image generation accuracy and display.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Supported Models](#supported-models)
3. [API Configuration](#api-configuration)
4. [Image Generation Prompts](#image-generation-prompts)
5. [API Implementation](#api-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Image Processing Flow](#image-processing-flow)
8. [Error Handling](#error-handling)

---

## Architecture Overview

The application uses a serverless architecture with:
- **Backend**: Netlify Function (`netlify/functions/generate.js`) - Handles API calls to Gemini
- **Frontend**: Vanilla JavaScript (`public/js/app.js`) - Manages UI, state, and prompt construction
- **API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent`

---

## Supported Models

The application supports the following Gemini models for image generation:

1. **`gemini-3-pro-image-preview`** (Pro)
   - Highest quality image generation
   - Best for detailed, photorealistic results

2. **`gemini-2.5-flash-image`** (Standard)
   - Reliable generation with good quality
   - Fast and efficient performance

**Model Selection**: Users can select models via a dropdown in the UI. The selected model is stored in `localStorage` and passed to the API on each request.

**Location**: Model selection is defined in:
- `public/index.html` (lines 17-23) - UI dropdown
- `public/js/app.js` (line 20) - State management
- `netlify/functions/generate.js` (lines 50-56) - Model validation

---

## API Configuration

### Generation Configuration

Located in `netlify/functions/generate.js` (lines 79-82):

```javascript
generationConfig: {
    response_modalities: ["IMAGE"],
    temperature: 0.4
}
```

**Parameters**:
- `response_modalities: ["IMAGE"]` - Forces image-only responses
- `temperature: 0.4` - Lower temperature for more consistent, deterministic outputs

### Safety Settings

Located in `netlify/functions/generate.js` (lines 83-88):

```javascript
safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
]
```

**Safety Threshold**: `BLOCK_ONLY_HIGH` - Only blocks high-risk content, allowing more creative freedom.

### API Key Management

- **Backend**: Stored in environment variable `GEMINI_API_KEY`
- **Location**: `netlify/functions/generate.js` (line 29)
- **Validation**: Checked before API calls (lines 30-36)

---

## Image Generation Prompts

The application uses four distinct prompts for different use cases:

### 1. Initial Headshot Generation

**Location**: `public/js/app.js` (lines 131-136)

**Function**: `generateInitialHeadshot()`

**Prompt Template**:
```
Professional studio headshot. 
SUBJECT: The person in Image 0. 
CLOTHING: Wearing a simple white ribbed singlet (wife beater).
MODIFICATIONS: ${hair}, ${makeup}.
CRITICAL: Maintain the EXACT framing, zoom level, and head angle of Image 0.
STYLE: Photorealistic, 8k, soft lighting, light grey/white background.
```

**Input Images**: 
- Image 0: User's selfie (rawSelfie)

**User Inputs**:
- `hair`: Hair description (e.g., "Buzz cut, blonde, messy texture")
- `makeup`: Makeup description (e.g., "Natural look, red lipstick")

**Purpose**: Creates a professional headshot with specified hair/makeup modifications while maintaining original framing.

---

### 2. Studio Model Generation (Body + Headshot)

**Location**: `public/js/app.js` (lines 175-189)

**Function**: `runBodyGeneration(headB64, referenceBodyB64)`

**Prompt Template**:
```
Generate a photorealistic full-body studio photograph.
SUBJECT: A person standing in grey boxer shorts and a white ribbed singlet.
REFERENCES:
- Image 0: STRICT reference for facial identity (Headshot).
- Image 1: STRICT reference for body shape, pose, framing, and crop.
INSTRUCTIONS:
1. Create a cohesive image where Head (Img 0) is seamlessly integrated onto Body (Img 1).
2. Match the lighting and skin tones perfectly.
3. CRITICAL: You MUST maintain the exact framing of Image 1. Output a Full Body Vertical Portrait.
4. Background: Pure white infinite studio.
```

**Input Images**:
- Image 0: Generated headshot (headB64)
- Image 1: User's body photo (referenceBodyB64)

**Purpose**: Combines a generated headshot with a body reference to create a full-body studio model. Critical for maintaining consistent body proportions and framing.

**Used In**:
- Initial onboarding: `generateStudioModel()` (line 151)
- Saving new headshots: `saveCurrentHeadshot()` (line 284)

---

### 3. New Headshot Generation (Salon Tab)

**Location**: `public/js/app.js` (lines 258-263)

**Function**: `generateNewHeadshot()`

**Prompt Template**:
```
Professional studio headshot. 
SUBJECT: The person in Image 0.
CLOTHING: Wearing a simple white ribbed singlet (wife beater).
MODIFICATIONS: ${h}, ${m}.
CRITICAL: Maintain the EXACT framing and composition of Image 0.
Style: Light background.
```

**Input Images**:
- Image 0: Original selfie (rawSelfie)

**User Inputs**:
- `h`: Hair description from salon tab
- `m`: Makeup description from salon tab

**Purpose**: Generates new headshot variations with different hair/makeup while maintaining consistency with the original selfie.

---

### 4. Outfit Generation

**Location**: `public/js/app.js` (lines 426-440)

**Function**: `generateOutfit()`

**Prompt Template**:
```
Fashion Photography Generation.
OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).

SUBJECT REFERENCE:
- Image 0: Use this EXACT body pose, facial identity, and framing.

CLOTHING INSTRUCTIONS:
- ${instructionText}

TASK:
1. Dress the subject (Image 0).
2. Keep face, hair, makeup, and framing EXACTLY consistent with Image 0.
3. SCENE: Professional studio white background.
4. Do NOT output a landscape image. The output must be tall (Portrait).
```

**Input Images**:
- Image 0: Current look's body image (bodyB64)
- Image 1+: Selected wardrobe items (optional, multiple)

**Dynamic Instruction Text** (lines 406-422):

**Case A - Clothes + Optional Text**:
```
"Dress the subject in the provided clothing images."
+ (if additionalDesc) " Also include these details: ${additionalDesc}."
```

**Case B - Text Only**:
```
"Design and generate a fashionable outfit for the subject based on this description: ${additionalDesc}"
```

**Case C - Empty (Default)**:
```
"Design a stylish, modern outfit that perfectly suits the subject's appearance."
```

**Purpose**: Generates outfit variations on the studio model. Supports both clothing image references and text descriptions.

**Key Constraints**:
- Must maintain exact body pose and facial identity
- Must output vertical portrait (3:4 aspect ratio)
- Must use white studio background

---

## API Implementation

### Backend Function: `netlify/functions/generate.js`

**Endpoint**: `/.netlify/functions/generate`

**Method**: POST

**Request Body**:
```javascript
{
    prompt: string,
    images: string[],  // Array of base64-encoded images (without data URI prefix)
    model: string      // Model ID (optional, defaults to gemini-3-pro-image-preview)
}
```

**Request Construction** (lines 58-67):
```javascript
const parts = [{ text: prompt }];
images.forEach(b64 => {
    parts.push({
        inline_data: {
            mime_type: "image/jpeg",
            data: b64
        }
    });
});
```

**API Call** (lines 70-91):
```javascript
const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { ... },
            safetySettings: [ ... ]
        })
    }
);
```

**Response Handling** (lines 125-153):
1. Validates response structure
2. Checks for safety blocks
3. Detects if model returned text instead of image
4. Extracts image data from `inline_data` or `inlineData`
5. Returns base64 image data

**Response Format**:
```javascript
{
    imageData: string  // Base64-encoded image (without data URI prefix)
}
```

**Error Responses**:
- `400`: Missing fields, safety blocks, model refusal, no image data
- `405`: Method not allowed
- `500`: API key missing, API errors, internal errors

---

## Frontend Implementation

### API Call Function: `callGemini()`

**Location**: `public/js/app.js` (lines 483-517)

**Function Signature**:
```javascript
async function callGemini(promptText, b64Images)
```

**Implementation**:
1. Constructs request with prompt and images
2. Sends POST to `/.netlify/functions/generate`
3. Includes selected model from state
4. Handles errors and extracts image data
5. Returns base64 image string

**Usage Pattern**:
```javascript
const b64 = await callGemini(prompt, [image1, image2, ...]);
const url = `data:image/png;base64,${b64}`;
```

### Image Processing Utilities

**Base64 Conversion** (lines 26-31):
```javascript
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Removes data URI prefix
    reader.onerror = error => reject(error);
});
```

**Note**: The function strips the `data:image/...;base64,` prefix, sending only the base64 string to the API.

### State Management

**Image State Variables** (lines 4-13):
```javascript
const state = {
    rawSelfie: null,              // Original selfie (base64)
    rawBody: null,                // Original body photo (base64)
    masterBodyB64: null,          // Master studio model reference
    
    previewHeadshotUrl: null,      // Current headshot preview (data URI)
    previewHeadshotB64: null,      // Current headshot (base64)
    
    previewBodyUrl: null,          // Current body preview (data URI)
    previewBodyB64: null,      // Current body (base64)
    
    savedLooks: [],                // Array of saved looks
    wardrobe: [],                  // Array of wardrobe items
    outfitHistory: [],             // Array of generated outfit URLs
    
    selectedLookId: null,          // Currently selected look ID
    selectedModel: "gemini-3-pro-image-preview"  // Selected model
};
```

**Saved Look Structure**:
```javascript
{
    id: number,
    headB64: string,      // Base64 headshot
    headUrl: string,      // Data URI for display
    bodyB64: string,     // Base64 body image
    bodyUrl: string       // Data URI for display
}
```

---

## Image Processing Flow

### 1. Initial Headshot Flow

```
User uploads selfie
  ↓
Convert to base64 (rawSelfie)
  ↓
User enters hair/makeup preferences
  ↓
Generate prompt with modifications
  ↓
callGemini(prompt, [rawSelfie])
  ↓
Store previewHeadshotB64 & previewHeadshotUrl
  ↓
Display in UI
```

### 2. Studio Model Flow

```
User uploads body photo
  ↓
Convert to base64 (rawBody)
  ↓
runBodyGeneration(previewHeadshotB64, rawBody)
  ↓
callGemini(bodyPrompt, [headB64, bodyB64])
  ↓
Store previewBodyB64 & previewBodyUrl
  ↓
Confirm → Save as masterBodyB64
  ↓
Enter dashboard
```

### 3. Outfit Generation Flow

```
User selects look (body image)
  ↓
User selects wardrobe items (optional)
  ↓
User enters description (optional)
  ↓
Build dynamic instruction text
  ↓
Construct images array: [bodyB64, ...wardrobeB64]
  ↓
callGemini(outfitPrompt, images)
  ↓
Display generated outfit
  ↓
Add to outfitHistory
```

### 4. Salon Headshot Flow

```
User enters hair/makeup in salon tab
  ↓
generateNewHeadshot()
  ↓
callGemini(headshotPrompt, [rawSelfie])
  ↓
Store as preview (not saved yet)
  ↓
User clicks "Save to Profile"
  ↓
runBodyGeneration(newHeadshotB64, masterBodyB64)
  ↓
Save as new look
```

---

## Error Handling

### Backend Error Handling (`netlify/functions/generate.js`)

**API Key Validation** (lines 30-36):
```javascript
if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
}
```

**Request Validation** (lines 41-47):
```javascript
if (!prompt || !images || !Array.isArray(images)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
}
```

**Safety Block Detection** (lines 106-114):
```javascript
if (data.promptFeedback?.blockReason) {
    return { statusCode: 400, body: JSON.stringify({ error: `Safety Block: ${blockReason}` }) };
}
```

**Model Refusal Detection** (lines 135-143):
```javascript
if (part.text) {
    return { statusCode: 400, body: JSON.stringify({ error: `Model Refused: "${part.text}"` }) };
}
```

**Image Data Validation** (lines 145-153):
```javascript
if (!inlineData?.data) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No image data found' }) };
}
```

### Frontend Error Handling (`public/js/app.js`)

**API Call Errors** (lines 497-516):
```javascript
if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
}

if (data.error) {
    throw new Error(`API Error: ${data.error}`);
}

if (!data.imageData) {
    throw new Error("No image data returned from server.");
}
```

**User-Facing Errors**:
- All errors are caught and displayed via `alert()` or status messages
- Loading states are managed via `showLoading()` function

---

## Key Technical Details

### Image Format
- **Input**: JPEG (specified as `mime_type: "image/jpeg"` in API calls)
- **Output**: PNG (converted to data URI with `data:image/png;base64,` prefix)
- **Storage**: Base64 strings (without data URI prefix) in state

### Image Size Constraints
- No explicit size limits are enforced in code
- Large images may cause memory issues or API timeouts
- Wardrobe upload handles multiple files with error handling (lines 334-376)

### Aspect Ratio Control
- **Outfit Generation**: Explicitly requests "Vertical Portrait (3:4 Aspect Ratio)"
- **Other Generations**: Relies on prompt instructions to maintain framing

### Consistency Mechanisms
1. **Facial Identity**: Uses "STRICT reference" language in prompts
2. **Framing**: "CRITICAL: Maintain the EXACT framing" instructions
3. **Body Pose**: References master body image for consistency
4. **Lighting**: "Match the lighting and skin tones perfectly" in body generation

---

## Areas for Improvement

When consulting with Gemini, consider discussing:

1. **Prompt Engineering**:
   - More specific framing instructions
   - Better aspect ratio enforcement
   - Enhanced consistency keywords

2. **Model Parameters**:
   - Temperature tuning (currently 0.4)
   - Additional generation config options
   - Safety threshold adjustments

3. **Image Quality**:
   - Resolution specifications
   - Compression handling
   - Format optimization

4. **Error Recovery**:
   - Retry logic for failed generations
   - Fallback model selection
   - Better error messages for users

5. **Consistency**:
   - Face matching improvements
   - Body proportion preservation
   - Lighting consistency across generations

---

## File Locations Summary

- **Backend API**: `netlify/functions/generate.js`
- **Frontend Logic**: `public/js/app.js`
- **UI Template**: `public/index.html`
- **Model Selection**: `public/index.html` (lines 17-23), `public/js/app.js` (line 20, 603-613)

---

## API Endpoint Details

**Base URL**: `https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent`

**Authentication**: Query parameter `key={API_KEY}`

**Content-Type**: `application/json`

**Request Format**:
```json
{
    "contents": [{
        "parts": [
            { "text": "prompt text" },
            { "inline_data": { "mime_type": "image/jpeg", "data": "base64string" } },
            ...
        ]
    }],
    "generationConfig": {
        "response_modalities": ["IMAGE"],
        "temperature": 0.4
    },
    "safetySettings": [...]
}
```

---

*Last Updated: Based on codebase analysis*
*Version: 3.1.0*

