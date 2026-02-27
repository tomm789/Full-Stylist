# Task: Split netlify/functions/utils.js into focused submodules

## Files to read first
- `netlify/functions/utils.js` (974 lines — the file being split)
- `netlify/functions/processes/headshot_generate.js` (consumer — verify imports)
- `netlify/functions/processes/outfit_render.js` (consumer — verify imports)
- `netlify/functions/ai-job-runner.js` (consumer — verify imports)

## Overview

Split `utils.js` into 5 focused modules under a new `netlify/functions/lib/` directory. Then rewrite `utils.js` as a thin re-export barrel so all existing `require("../utils")` calls continue working without changes.

## Changes

### 1. Create `netlify/functions/lib/timing.js`

Move these functions from `utils.js`:
- `createTimingTracker` (lines 30-121)
- `createPerformanceTracker` (lines 146-234)

```js
"use strict";

// [paste createTimingTracker here]
// [paste createPerformanceTracker here]

module.exports = {
  createTimingTracker,
  createPerformanceTracker,
};
```

### 2. Create `netlify/functions/lib/storage.js`

Move these functions from `utils.js`:
- `isPngBase64` (lines 239-241)
- `downloadImageFromStorage` (lines 255-397)
- `uploadImageToStorage` (lines 398-430)

```js
"use strict";

// [paste isPngBase64 here]
// [paste downloadImageFromStorage here]
// [paste uploadImageToStorage here]

module.exports = {
  isPngBase64,
  downloadImageFromStorage,
  uploadImageToStorage,
};
```

Note: `downloadImageFromStorage` uses `performance.now()` (available in Node 16+) and `fetch` (Node 18+). No imports needed from other lib modules.

### 3. Create `netlify/functions/lib/gemini.js`

Move these from `utils.js`:
- `getFetch` (lines 12-22) — keep as internal (not exported)
- `DEFAULT_IMAGE_MODEL` (line 123)
- `DEFAULT_BODY_MODEL` (line 124)
- `resolveModelFromSettings` (lines 126-134)
- `getGeminiApiVersion` (lines 136-138)
- `callGeminiAPI` (lines 452-602)

```js
"use strict";

let fetchFn = null;
async function getFetch() {
  // [paste getFetch body]
}

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_BODY_MODEL = "gemini-3-pro-image-preview";

// [paste resolveModelFromSettings]
// [paste getGeminiApiVersion]
// [paste callGeminiAPI — it uses getFetch and getGeminiApiVersion internally]

module.exports = {
  callGeminiAPI,
  resolveModelFromSettings,
  getGeminiApiVersion,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_BODY_MODEL,
};
```

Note: `callGeminiAPI` calls `getFetch()` and `getGeminiApiVersion()` internally. Both are in this same file so no cross-module dependency.

### 4. Create `netlify/functions/lib/imageComposition.js`

Move these from `utils.js`:
- `calculateGridLayout` (lines 611-648)
- `compositeOutfitGrid` (lines 658-760) — uses `calculateGridLayout` internally
- `composeHeadshotWithMask` (lines 771-840)

```js
"use strict";

const sharp = require('sharp');

// [paste calculateGridLayout]
// [paste compositeOutfitGrid — calls calculateGridLayout internally]
// [paste composeHeadshotWithMask]

module.exports = {
  calculateGridLayout,
  compositeOutfitGrid,
  composeHeadshotWithMask,
};
```

### 5. Create `netlify/functions/lib/imageOptimization.js`

Move these from `utils.js`:
- `optimizeGeminiInput` (lines 850-902)
- `optimizeGeminiOutput` (lines 912-958)

```js
"use strict";

const sharp = require('sharp');

// [paste optimizeGeminiInput]
// [paste optimizeGeminiOutput]

module.exports = {
  optimizeGeminiInput,
  optimizeGeminiOutput,
};
```

### 6. Rewrite `netlify/functions/utils.js` as barrel re-export

Replace the entire file contents with:

```js
"use strict";

// Barrel re-export — all existing require("../utils") destructuring continues working.
// Individual modules can be required directly from lib/ for explicit dependencies.

const timing = require("./lib/timing");
const storage = require("./lib/storage");
const gemini = require("./lib/gemini");
const imageComposition = require("./lib/imageComposition");
const imageOptimization = require("./lib/imageOptimization");

module.exports = {
  ...timing,
  ...storage,
  ...gemini,
  ...imageComposition,
  ...imageOptimization,
};
```

## Constraints

- Do NOT change any function signatures or behavior
- Do NOT rename any exported symbols
- Do NOT modify any consumer files (process files, ai-job-runner, etc.)
- All existing `require("../utils")` with destructuring must continue working identically
- Each new lib file must be self-contained (no cross-lib imports). The only shared dependency is `sharp` (used by imageComposition and imageOptimization).
- Keep `getFetch` as an internal function in `gemini.js` — do NOT export it
- Preserve all JSDoc comments and inline comments

## Acceptance criteria

- [ ] `netlify/functions/lib/timing.js` exports `createTimingTracker`, `createPerformanceTracker`
- [ ] `netlify/functions/lib/storage.js` exports `isPngBase64`, `downloadImageFromStorage`, `uploadImageToStorage`
- [ ] `netlify/functions/lib/gemini.js` exports `callGeminiAPI`, `resolveModelFromSettings`, `getGeminiApiVersion`, `DEFAULT_IMAGE_MODEL`, `DEFAULT_BODY_MODEL`
- [ ] `netlify/functions/lib/imageComposition.js` exports `calculateGridLayout`, `compositeOutfitGrid`, `composeHeadshotWithMask`
- [ ] `netlify/functions/lib/imageOptimization.js` exports `optimizeGeminiInput`, `optimizeGeminiOutput`
- [ ] `netlify/functions/utils.js` re-exports all of the above (13 symbols total)
- [ ] No changes to any consumer files
- [ ] `node -e "const u = require('./netlify/functions/utils'); console.log(Object.keys(u).sort())"` outputs the same 13 keys as before
