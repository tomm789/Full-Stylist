# Task: Clean up netlify/functions/processes/outfit_render.js

## Files to read first
- `netlify/functions/processes/outfit_render.js` (633 lines — the file being cleaned)
- `netlify/functions/utils.js` (or `lib/imageComposition.js` after Phase 1) — for the canonical `calculateGridLayout`

## Overview

`outfit_render.js` has a duplicate `calculateGridLayout`, and several functions that should live in separate modules. Extract them so `outfit_render.js` is focused on the `processOutfitRender` orchestration flow.

## Changes

### 1. Create `netlify/functions/processes/outfit_description.js`

Move these functions from `outfit_render.js`:
- `generateOutfitDescription` (lines 22-125) — the main description generation function
- `parseDescriptionResponse` (lines 130-161)
- `fetchOutfitItemDetails` (lines 288-327)

These three functions form a cohesive unit: fetch item details → generate description via Gemini → parse response → save to DB.

`generateOutfitDescription` calls:
- `callGeminiAPI` — import from `../utils`
- `getGeminiApiVersion` — import from `../utils`
- `parseDescriptionResponse` — in same file
- Supabase client — passed as parameter

`fetchOutfitItemDetails` is standalone (only uses Supabase client).

```js
"use strict";

const { callGeminiAPI, getGeminiApiVersion } = require("../utils");

// [paste generateOutfitDescription]
// [paste parseDescriptionResponse — calls normalizeLabel, normalizeLabelList]
// [paste fetchOutfitItemDetails]

module.exports = {
  generateOutfitDescription,
  fetchOutfitItemDetails,
};
```

Note: `parseDescriptionResponse` calls `normalizeLabelList` which calls `normalizeLabel`. These must also be in this file or imported from outfit_helpers.js (see step 2).

### 2. Create `netlify/functions/processes/outfit_helpers.js`

Move these small helper functions from `outfit_render.js`:
- `normalizeLabel` (lines 163-169)
- `normalizeLabelList` (lines 171-186)
- `clamp` (line 199)
- `normalizeTrimBounds` (lines 201-207)

```js
"use strict";

// [paste normalizeLabel]
// [paste normalizeLabelList]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// [paste normalizeTrimBounds]

module.exports = {
  normalizeLabel,
  normalizeLabelList,
  clamp,
  normalizeTrimBounds,
};
```

### 3. Update `outfit_description.js` to import from `outfit_helpers.js`

```js
const { normalizeLabelList } = require("./outfit_helpers");
```

### 4. Remove duplicate `calculateGridLayout` from `outfit_render.js`

Delete the local `calculateGridLayout` (lines 188-197). Import from utils instead:

```js
const {
  downloadImageFromStorage,
  uploadImageToStorage,
  callGeminiAPI,
  optimizeGeminiOutput,
  resolveModelFromSettings,
  getGeminiApiVersion,
  DEFAULT_IMAGE_MODEL,
  calculateGridLayout,  // ADD THIS
} = require("../utils");
```

### 5. Update `outfit_render.js` imports

After extraction, `outfit_render.js` should:
- Import `generateOutfitDescription`, `fetchOutfitItemDetails` from `./outfit_description`
- Import `clamp`, `normalizeTrimBounds` from `./outfit_helpers`
- Import `calculateGridLayout` from `../utils` (added to existing destructuring)
- Remove all moved function definitions
- Keep `composeCustomCanvasGrid` (outfit-render-specific) and `processOutfitRender` in this file

### 6. Update `outfit_render.js` exports

The export should remain unchanged:
```js
module.exports = { processOutfitRender };
```

## Constraints

- Do NOT change `processOutfitRender` function signature or behavior
- Do NOT change how `ai-job-runner.js` calls `processOutfitRender`
- `generateOutfitDescription` is only called from `processOutfitRender` — its signature stays the same
- `module.exports = { processOutfitRender }` must remain the only export of `outfit_render.js`
- Preserve all JSDoc comments and console.log statements

## Acceptance criteria

- [ ] `outfit_render.js` no longer defines `calculateGridLayout`, `generateOutfitDescription`, `parseDescriptionResponse`, `fetchOutfitItemDetails`, `normalizeLabel`, `normalizeLabelList`, `clamp`, `normalizeTrimBounds`
- [ ] `outfit_render.js` imports `calculateGridLayout` from `../utils`
- [ ] `outfit_render.js` imports `generateOutfitDescription`, `fetchOutfitItemDetails` from `./outfit_description`
- [ ] `outfit_render.js` imports `clamp`, `normalizeTrimBounds` from `./outfit_helpers`
- [ ] `outfit_render.js` still exports `{ processOutfitRender }`
- [ ] `outfit_description.js` exports `{ generateOutfitDescription, fetchOutfitItemDetails }`
- [ ] `outfit_helpers.js` exports `{ normalizeLabel, normalizeLabelList, clamp, normalizeTrimBounds }`
- [ ] No changes to `ai-job-runner.js`
