# Generation Flows Reference

Reference document for auditing and consolidating loading/generation UX across the app's six generation flows.

---

## Part A: Loading UI Components Inventory

### Reusable Components

| Component | File | Description |
|---|---|---|
| `LoadingSpinner` | [LoadingSpinner.tsx](src/components/shared/loading/LoadingSpinner.tsx) | Inline `ActivityIndicator` wrapper with optional text. Props: `size`, `color`, `text`, `style`. |
| `LoadingOverlay` | [LoadingOverlay.tsx](src/components/shared/loading/LoadingOverlay.tsx) | Full-screen modal overlay with `ActivityIndicator`, optional `message` and `subMessage`. |

### Generation-Specific Modals

| Component | File | Used By | Description |
|---|---|---|---|
| `GenerationProgressModal` | [GenerationProgressModal.tsx](src/components/outfits/GenerationProgressModal.tsx) | Outfit generation (wardrobe creator + outfit editor) | Multi-phase modal: item checking with animated checkmarks, stylist overview message drip, finalizing phase. Has a `perfMode` that shows minimal static spinner only. |
| `GeneratingOutfitModal` | [GeneratingOutfitModal.tsx](src/components/social/GeneratingOutfitModal.tsx) | Social feed try-on | Large `ActivityIndicator`, status text, estimated time (60-90s), "See Outfit" button if ID available during generation. |
| `PolicyBlockModal` | [PolicyBlockModal.tsx](src/components/PolicyBlockModal.tsx) | Headshot/body shot generation | Displayed when Gemini API blocks generation due to safety policy. |
| `ErrorModal` | [ErrorModal.tsx](src/components/ErrorModal.tsx) | Various generation errors | Generic error display modal. |

### Generation Trigger Components

| Component | File | Description |
|---|---|---|
| `CreatorBar` | [CreatorBar.tsx](src/components/shared/CreatorBar.tsx) | Bottom pill-style bar with generate button + optional options menu. Replaces floating tab bar in creator mode. Used by both outfit creator (wardrobe) and headshot creator (hair & makeup). Fades in with 300ms opacity animation. |
| `OutfitCreatorBar` | [OutfitCreatorBar.tsx](src/components/wardrobe/OutfitCreatorBar.tsx) | Outfit-specific creator bar in wardrobe. |

---

## Part B: Generation Flows

---

### Flow 1: Outfit Generation via Wardrobe Creator (Modal)

**Entry point:** [wardrobe.tsx](app/(tabs)/wardrobe.tsx)
**Handler:** `handleGenerateOutfit()` (line ~628)
**Hook:** `useOutfitGeneration` ([useOutfitGeneration.ts](src/hooks/outfits/useOutfitGeneration.ts))

#### Sequence

1. **User presses generate** on `OutfitCreatorBar` / `CreatorBar`
2. **Save outfit** (10% progress) - creates outfit record via `saveOutfit()`
3. **Prepare generation** (20%) - fetches user settings, validates body photo exists
4. **Item reveal animation** begins (500ms intervals per item) - skipped in PERF_MODE
5. **Grid image stacking** (30-60%) - three paths:
   - Pre-uploaded grid (0ms if background grid ready)
   - Client-side grid generation (web only): fetches item images, creates grid, uploads to Supabase storage
   - Server fallback: skips client grid, lets server handle
6. **AI job preparation** (70%) - maps items to job format, gets AI model preference
7. **Description polling starts** (500ms interval, 30s max) - polls outfit table for `description_generated_at`, converts to messages, runs message drip animation
8. **AI job execution** (80%) - `createAndTriggerJob()` → Netlify function `ai-job-runner`
9. **Poll for completion** (90%) - `pollAIJobWithFinalCheck()`: 60 max attempts, 2s interval with exponential backoff to 10s, 120s timeout
10. **Result handling:**
    - Success: base64 cached via `setInitialCoverDataUri()`, navigate to `/outfits/{id}/view?renderTraceId=...`
    - Timeout: navigates anyway (image still generating in background)
    - Failure: shows error, stays on page

#### Loading UI Shown

- `LoadingOverlay` with "Generating outfit..." (hidden in PERF_MODE)
- `GenerationProgressModal` with three phases:
  - **'items'**: "Checking your pieces" - items animate in one by one with checkmarks/spinners
  - **'analysis'**: "Stylist notes incoming" - description messages drip in
  - **'finalizing'**: "Polishing the render..."

#### Result Display

- Navigate to [view.tsx](app/outfits/[id]/view.tsx)
- `useOutfitView` hook checks `initialCoverDataUri` cache first (instant display)
- Falls back to Supabase storage URL

---

### Flow 2: Outfit Generation via Outfit Edit Page (Fullscreen)

**Entry point:** [app/outfits/[id].tsx](app/outfits/[id].tsx)
**Handler:** `actions.handleRender()` (line ~221)
**Hook:** `useOutfitEditorActions` ([useOutfitEditorActions.ts](src/hooks/outfits/useOutfitEditorActions.ts))

#### Sequence

1. **User presses "Generate Outfit Image"** on outfit editor screen
2. **Save outfit** via `saveOutfit()` - returns `savedOutfitId`
3. **Grid generation** - same client-side or server fallback as Flow 1
4. **Prepare items** - maps outfit items from `Map<categoryId, WardrobeItem>` to job format, includes user notes as prompt
5. **Get user settings** - body_shot_image_id, AI model preference
6. **Item reveal animation** starts (500ms intervals)
7. **Create AI job** - `createAIJob()` + `triggerAIJobExecution()` (separate calls, unlike Flow 1's combined call)
8. **Description polling** starts (same mechanism as Flow 1)
9. **Poll for completion** - same polling as Flow 1
10. **Result handling:**
    - Success: base64 cached, navigate to `/outfits/{id}/view?renderTraceId=...`
    - Timeout: still navigates
    - Failure: shows error alert, stays on editor page

#### Loading UI Shown

- `GenerationProgressModal` (same component as Flow 1) with props:
  - `visible={actions.rendering}`
  - `items`, `revealedItemsCount`, `completedItemsCount`, `phase`, `activeMessage`, `perfMode`
- Same three phases: 'items' → 'analysis' → 'finalizing'

#### Result Display

- Same as Flow 1: cached base64 → outfit view page

#### Key Differences from Flow 1

- Uses separate `createAIJob()` + `triggerAIJobExecution()` instead of combined `createAndTriggerJob()`
- Entry is from outfit editor (fullscreen) rather than wardrobe modal overlay
- Can include user-typed notes as part of the generation prompt
- No `LoadingOverlay` - uses `GenerationProgressModal` directly

---

### Flow 3: Wardrobe Item Generation

**Entry point:** [app/wardrobe/add-item.tsx](app/wardrobe/add-item.tsx) (or equivalent add item screen)
**Hook:** `useAddWardrobeItem` ([useAddWardrobeItem.ts](src/hooks/wardrobe/useAddWardrobeItem.ts))

#### Sequence

1. **User selects image(s)** via camera or library (with cropper on web)
2. **User presses submit** → `handleSubmit()`
3. **Create wardrobe item** - `createWardrobeItem()` with placeholder title "New Item", uploads selected images
4. **Set generating state** - `setGeneratingAI(true)`, `setAnalysisStep('Preparing item...')`
5. **Create generation job** - `triggerWardrobeItemGenerate(userId, itemId, sourceImageId)` - job type: `wardrobe_item_generate`
6. **Trigger execution** - `triggerAIJobExecution(jobId)` → Netlify function
7. **Navigate immediately** - `router.replace(/wardrobe/item/${itemId}?refresh=...)` - navigates BEFORE generation completes
8. **Poll via `useAIJobPolling`** hook - polls in background on the item detail page
9. **On completion callback** (`onComplete`):
   - For `wardrobe_item_generate` jobs: extracts base64, caches via `setInitialItemData()`, sets analysis step
   - For legacy `batch` jobs: handles product_shot + auto_tag results, redirects with 800ms delay
   - For failures: shows error message
10. **Analysis step updates** based on job status:
    - `'running'` → "Analyzing your image..."
    - `'succeeded'` → "Adding item to your wardrobe"

#### Loading UI Shown

- `LoadingOverlay` on the add-item screen with dynamic `analysisStep` message:
  - "Preparing item..." → "Analyzing your image..." → "Adding item to your wardrobe"
- `loading` state during initial upload/item creation
- After optimistic navigation to item page, polling continues in background via `useAIJobPolling` hook

#### Result Display

- Item detail page at `/wardrobe/item/{id}`
- Base64 cached via `setInitialItemData()` for instant display
- Page receives suggested title and notes from AI
- Falls back to storage URL on subsequent visits

#### Key Differences from Outfit Flows

- Navigates to result page BEFORE generation completes (optimistic navigation)
- Polling happens on the destination page, not the source
- No progress modal - inline status text only
- Also generates metadata (title, notes) alongside the image
- Supports legacy `batch` job type for backward compatibility

---

### Flow 4: Headshot Generation via Hair & Makeup Creator

**Entry point:** [hair-and-make-up.tsx](app/hair-and-make-up.tsx) (or [app/(tabs)/hair-and-make-up.tsx](app/(tabs)/hair-and-make-up.tsx))
**Hook:** `useHairAndMakeup` ([useHairAndMakeup.ts](src/hooks/headshot/useHairAndMakeup.ts))

#### Sequence

1. **User configures presets** - hair style, makeup style, custom description via preset selector panel (`editorOpen` state)
2. **User presses generate** on `CreatorBar` component
3. **`handleGenerateVariation()`** called:
   - Validates base image and selections exist
   - Creates or updates session
   - Builds prompt from preset IDs and custom description
   - Creates variation record in database (status: `pending`)
4. **Trigger AI job** - creates headshot variation job with prompt
5. **Poll for completion** - `waitForAIJobCompletion()`: 30s timeout, 2s interval
6. **On success:**
   - Updates variation status to `complete`
   - Loads new variations via `loadVariations()`
   - Resolves image URL via `resolveImageUrl()` (lazy loading from Supabase)
7. **On failure:**
   - Checks for Gemini policy block via `isGeminiPolicyBlockError()`
   - Shows `PolicyBlockModal` if blocked
   - Otherwise sets error state

#### Loading UI Shown

- **Image overlay pulse** (the "faint flash"): An `Animated.View` is positioned absolutely over the headshot image in `HeadshotSlideItem` ([HeadshotSlideItem.tsx](src/components/headshots/HeadshotSlideItem.tsx)). It uses `generatePulse` from the hook:
  - Background: `colors.gray200` (light gray)
  - Opacity interpolation: **8% → 22%** (very subtle range)
  - Cycle: 1.5s ease-in-out up + 1.5s ease-in-out down = **3-second pulse loop**
  - Only shown on the active/selected slide item when `generating === true`
  - This is extremely subtle and easy to miss - effectively the only visual feedback
- **No `LoadingOverlay`**, no progress modal, no inline spinner
- The `CreatorBar` generate button is disabled during generation but has no visual change beyond disabled state

#### Result Display

- Variation appears in the variations list/carousel
- Image URL lazy-loaded via `resolveImageUrl()` querying Supabase images table
- Lightbox available for full-screen preview (`lightboxVisible` state)

#### Key Differences from Other Flows

- No navigation on completion - stays on same screen
- No progress modal or overlay - only a subtle button pulse animation
- Supports incremental variations on same base image (session-based)
- Lazy image URL resolution (not base64 cached)
- Most subtle/easy-to-miss loading feedback of all flows

---

### Flow 5: Onboarding - Headshot Generation (Selfie → Professional Headshot)

**Entry point:** [onboarding.tsx](app/onboarding.tsx) - step: "selfie"
**Handler:** `handleSelfieAccept()` (line ~63)
**Hook:** `useImageGeneration` ([useImageGeneration.ts](src/hooks/profile/useImageGeneration.ts))

#### Sequence

1. **User takes/uploads selfie** via camera or library
2. **`handleSelfieAccept()`** called:
   - Calls `selfieUpload.saveUploadedImage(userId, 'selfie')` to save image record
   - Stores `selfie_image_id` in user settings
3. **Generation triggered** via `generateHeadshot(userId, hairStyle, makeupStyle)`:
   - Uploads selfie to Supabase Storage (`selfie-{timestamp}.jpg`)
   - Creates image record in `images` table
   - Creates AI job via `triggerHeadshotGenerate()` - job type: `headshot_generate`
   - Triggers execution via `triggerAIJobExecution()` → Netlify function (5s fire-and-forget timeout)
4. **Poll for completion** - `waitForAIJobCompletion()`: 30 max attempts, 2s interval, exponential backoff to 10s
5. **On success:**
   - Extracts `generatedImageId` from result (`result.image_id` or `result.generated_image_id`)
   - Auto-sets user avatar if none exists: retrieves storage URL, calls `updateUserProfile(userId, { avatar_url })`
   - Returns `generatedImageId` to onboarding screen
6. **On failure:**
   - Checks for Gemini policy block → shows `PolicyBlockModal`
   - Otherwise throws error → `ErrorModal`

#### Loading UI Shown

- **Modal overlay** (lines 243-261 in onboarding.tsx):
  - Title: "Generating Studio Model" or "Processing Photo"
  - `ActivityIndicator` (primary color)
  - Message: "Generating professional headshot... This may take 20-30 seconds."
- State: `isLoading = selfieUpload.generating || mirrorUpload.generating`
- Dynamic `loadingMessage` from hook state (changes through steps: "Uploading photo...", "Creating headshot job...", "Generating professional headshot...")

#### Result Display

- Returns to onboarding flow, advances to next step ('mirror')
- No dedicated result screen - headshot becomes the user's avatar

---

### Flow 6: Onboarding - Studio Model Generation (Mirror Selfie + Selfie → Full-Body Model)

**Entry point:** [onboarding.tsx](app/onboarding.tsx) - step: "mirror"
**Handler:** `handleMirrorAccept()` (line ~111)
**Hook:** `useImageGeneration` ([useImageGeneration.ts](src/hooks/profile/useImageGeneration.ts)) - `generateBodyShotFromSelfies()` method

#### Sequence

1. **User takes/uploads mirror selfie** (full-body photo)
2. **`handleMirrorAccept()`** called:
   - Saves mirror selfie via `mirrorUpload.saveUploadedImage(userId, 'mirror-selfie')`
   - Updates user settings with `mirror_selfie_image_id`
   - Retrieves stored `selfie_image_id` (from state or database)
   - Validates both selfie images exist
3. **Generation triggered** via `mirrorUpload.generateBodyShotFromSelfies(userId, selfieId, mirrorSelfieId)`:
   - No upload phase (both images already saved from previous steps)
   - Creates AI job via `triggerBodyShotGenerateFromSelfies()` - job type: `body_shot_generate`
   - Triggers execution via `triggerAIJobExecution()` (same Netlify function, fire-and-forget)
4. **Poll for completion** - `waitForAIJobCompletion()`: 60 max attempts (longer than headshot), 2s interval
5. **On success:**
   - Extracts `generatedImageId` from result
   - Returns `{ imageId: generatedImageId }` to onboarding
   - `handleBodyShotComplete()` → `router.replace('/(tabs)/wardrobe')` (completes onboarding)
6. **On failure:**
   - Policy block → `PolicyBlockModal` with `{ imageId: null, policyBlocked: true }`
   - Otherwise → error state

#### Loading UI Shown

- **Modal overlay** (same as Flow 5, different message):
  - Title: "Generating Studio Model"
  - `ActivityIndicator` (primary color)
  - Message: "Generating studio model... This may take 30-40 seconds."
- State: `isLoading = mirrorUpload.generating`

#### Result Display

- No result screen shown to user
- Navigates directly to wardrobe page: `router.replace('/(tabs)/wardrobe')`
- Studio model stored for use in future outfit renders
- User can skip this step (shows warning alert about losing studio model functionality)

---

## Part C: Comparison Matrix

| Aspect | Flow 1: Outfit (Wardrobe) | Flow 2: Outfit (Editor) | Flow 3: Wardrobe Item | Flow 4: Headshot (H&M) | Flow 5: Onboarding Headshot | Flow 6: Onboarding Body |
|---|---|---|---|---|---|---|
| **Loading UI type** | LoadingOverlay + GenerationProgressModal | GenerationProgressModal | Inline text on item page | Button pulse animation only | Modal overlay with spinner | Modal overlay with spinner |
| **Navigation timing** | After completion | After completion | Before completion (optimistic) | No navigation | Stays in onboarding | Routes to wardrobe |
| **Progress phases** | items → analysis → finalizing | items → analysis → finalizing | Single status text | None visible | Single message | Single message |
| **Polling interval** | 2s (backoff to 10s) | 2s (backoff to 10s) | Via useAIJobPolling hook | 2s | 2s (backoff to 10s) | 2s (backoff to 10s) |
| **Max poll time** | ~120s | ~120s | Hook-managed | ~30s | ~60s | ~120s |
| **Result caching** | base64 in memory (initialCoverDataUri) | base64 in memory (initialCoverDataUri) | base64 in memory (initialItemData) | Lazy URL resolution | None (avatar set) | None (stored for later) |
| **Error modals** | Error in progress state | Alert dialog | Alert + inline error | PolicyBlockModal | PolicyBlockModal + ErrorModal | PolicyBlockModal + ErrorModal |
| **AI job type** | outfit_render | outfit_render | wardrobe_item_generate | headshot variation | headshot_generate | body_shot_generate |
| **Description drip** | Yes (parallel polling) | Yes (parallel polling) | No | No | No | No |
| **Item reveal anim** | Yes (500ms per item) | Yes (500ms per item) | No | No | No | No |

---

## Part D: Shared Infrastructure

### AI Job Pipeline

| Component | File |
|---|---|
| Job creation & execution | [src/lib/ai-jobs/core.ts](src/lib/ai-jobs/core.ts), [execution.ts](src/lib/ai-jobs/execution.ts) |
| Job polling | [src/lib/ai-jobs/polling.ts](src/lib/ai-jobs/polling.ts) |
| Job types & triggers | [src/lib/ai-jobs/types.ts](src/lib/ai-jobs/types.ts) |
| Netlify function endpoint | `/.netlify/functions/ai-job-runner` |

### Polling Mechanisms

| Mechanism | Used By | Interval | Max Duration |
|---|---|---|---|
| `pollAIJobWithFinalCheck()` | Flows 1, 2 | 2s → 10s backoff | ~120s |
| `waitForAIJobCompletion()` | Flows 4, 5, 6 | 2s → 10s backoff | 30-120s |
| `useAIJobPolling` hook | Flow 3 | Hook-managed | Hook-managed |
| Description polling | Flows 1, 2 | 500ms | 30s |

### Caching

| Cache | File | Used By |
|---|---|---|
| `initialCoverDataUri` | [src/lib/outfits/initialCoverCache.ts](src/lib/outfits/initialCoverCache.ts) | Flows 1, 2 |
| `initialItemData` | (wardrobe item cache) | Flow 3 |
| Lazy URL resolution | Via `resolveImageUrl()` in hook | Flow 4 |

### Performance Tracking

| Feature | Used By |
|---|---|
| `startTimeline()` trace with marks | Flows 1, 2, 3 |
| `logClientTiming()` | Flow 1 |
| `performance.now()` measurements | Flow 5 |
| `PERF_MODE` flag (`EXPO_PUBLIC_PERF_MODE`) | Flows 1, 2 (skips animations, minimal spinner) |
| `isPerfLogsEnabled()` | Flow 3 |
