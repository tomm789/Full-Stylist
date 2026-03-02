# Codex Task: Phase 2D — Hook Deduplication (3 sub-tasks)

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is an **implementation task**. Phases 2A (stability), 2B (shared utilities), and 2C (memoization quick wins) are complete. This phase extracts duplicated logic into shared utilities to reduce the maintenance surface.

Reference: `CODEX_IMPLEMENTATION_PLAN.md` for full context.

---

## Sub-task 2D-1: Extract shared outfit render job hook

### Problem

Three hooks contain near-identical "create job → trigger → poll → cache cover image" pipelines for outfit renders:

1. **`src/hooks/outfits/useOutfitGeneration.ts`** (lines ~362-469)
   - Uses `createAndTriggerJob()` (unified create+trigger)
   - Polls with `pollAIJobWithFinalCheck()` (timeout 60s, interval 2000ms)
   - Caches base64 cover via `setInitialCoverDataUri()` at lines ~463-469

2. **`src/hooks/outfits/useOutfitEditorActions.ts`** (lines ~199-376, inside `handleRender`)
   - Uses two-step `createAIJob()` then `triggerAIJobExecution()`
   - Polls with `pollAIJobWithFinalCheck()` (timeout 60s, interval 2000ms)
   - Caches base64 cover via `setInitialCoverDataUri()` at lines ~351-357
   - Also calls `generateAndUploadGrid()` before job creation

3. **`src/hooks/social/useTryOnOutfit.ts`** (lines ~204-237)
   - Uses two-step `createAIJob()` then `triggerAIJobExecution()`
   - Polls with `waitForAIJobCompletion()` (timeout 120s, interval 2000ms)
   - Also has a mannequin generation path (lines ~179-200) with same pattern

### What to create

**New file:** `src/hooks/outfits/useOutfitRenderJob.ts`

Create a shared hook or utility function that encapsulates the common pipeline:

```typescript
interface RenderJobOptions {
  jobType: string;                    // e.g. 'outfit_render', 'mannequin_generate'
  jobParams: Record<string, any>;     // job-specific parameters
  timeout?: number;                   // polling timeout in ms (default 60000)
  interval?: number;                  // polling interval in ms (default 2000)
  logPrefix?: string;                 // log prefix for debug output
  onJobCreated?: (jobId: string) => void;
  onPollComplete?: (result: AIJob) => void;
  onError?: (error: Error) => void;
}

interface RenderJobResult {
  job: AIJob | null;
  base64Result: string | null;
}
```

The shared function should:
1. Create the job (`createAIJob`)
2. Trigger execution (`triggerAIJobExecution`)
3. Poll for completion using `pollAIJobWithFinalCheck` (preferred) or `waitForAIJobCompletion`
4. Extract `base64_result` from the completed job
5. Return the job and base64 result

### How to migrate

- **useOutfitGeneration**: Replace the inline pipeline (lines ~362-469) with a call to the shared hook/function. Keep the pre-pipeline session variation logic and post-pipeline cover caching — only extract the create→trigger→poll→extract core.
- **useOutfitEditorActions**: Replace the pipeline in `handleRender` (lines ~274-364) with the shared function. Keep the grid generation call before and the cover caching after.
- **useTryOnOutfit**: Replace the pipeline (lines ~204-237) with the shared function. This hook also has a mannequin generation path that uses the same pattern — if both can use the shared function, do so.

### Important constraints
- The shared function must accept flexible parameters since each caller has different job params.
- Keep all pre-pipeline and post-pipeline logic in the calling hooks — only extract the common pipeline.
- Maintain the existing `stoppedRef` / mounted guard patterns from Phase 2A (the calling hooks already have these).
- Use `if (__DEV__)` for any console.log calls (per Phase 2B standards).
- Preserve all existing behavior. These are deduplication changes only.

### Success criteria
- All three hooks delegate the render job create→trigger→poll pipeline to the shared function.
- Duplicated pipeline code is removed from the calling hooks.
- No behavioral changes — same job creation, polling, and error handling.

---

## Sub-task 2D-2: Extract shared `batchGetOutfitCoverImages` utility

### Problem

Five hooks contain an **identical** `batchGetOutfitCoverImages()` function that:
1. Takes an array of outfits with `id` and `cover_image_id`
2. Queries the Supabase `images` table in batch using `.in('id', coverImageIds)`
3. Builds a lookup map of image records
4. Generates public URLs via `supabase.storage.from('images').getPublicUrl(path)`
5. Returns `Map<string, string | null>` keyed by outfit ID

The five identical copies are in:

1. **`src/hooks/social/useFeed.ts`** — lines ~43-81
2. **`src/hooks/social/useUserProfile.ts`** — lines ~33-71
3. **`src/hooks/social/useDiscoverFeed.ts`** — lines ~27-65
4. **`src/hooks/social/useDiscoverOutfits.ts`** — lines ~24-62
5. **`src/hooks/profile/useProfileData.ts`** — lines ~46-88 (also has a `batchGenerateImageUrls` helper at lines ~28-43)

### What to create

**New file:** `src/utils/batchImageHelpers.ts`

Move the shared `batchGetOutfitCoverImages` function here. The function signature should be:

```typescript
import { supabase } from '@/lib/supabase';

interface OutfitWithCover {
  id: string;
  cover_image_id: string | null;
}

/**
 * Batch-fetches cover image URLs for a list of outfits.
 * Queries the images table once for all cover_image_ids,
 * then generates public URLs via Supabase storage.
 *
 * @returns Map keyed by outfit ID → public URL (or null if no cover)
 */
export async function batchGetOutfitCoverImages(
  outfits: OutfitWithCover[]
): Promise<Map<string, string | null>> {
  // ... existing implementation from any of the 5 hooks
}
```

Also move `batchGenerateImageUrls` from `useProfileData.ts` if it's a general-purpose utility. If it's profile-specific, leave it in place.

### How to migrate

For each of the 5 hooks:
1. Delete the local `batchGetOutfitCoverImages` function
2. Add `import { batchGetOutfitCoverImages } from '@/utils/batchImageHelpers'`
3. Verify all call sites still work (same function signature, same return type)

### Success criteria
- Single source of truth for `batchGetOutfitCoverImages` in `src/utils/batchImageHelpers.ts`
- All 5 hooks import from the shared utility
- Duplicate function definitions deleted from all hooks
- No behavioral changes

---

## Sub-task 2D-3: Standardize polling in useWardrobeItemEdit

### Problem

`src/hooks/wardrobe/useWardrobeItemEdit.ts` (lines ~87-141) uses a manual `setInterval` polling pattern to check for AI job completion on wardrobe items. This manual pattern:
- Creates a `setInterval` with 2000ms interval
- Polls `getWardrobeItem()` and `getEntityAttributes()` each tick
- Checks for AI completion via `attr.source === 'ai'` or title generation
- Has a separate `setTimeout` for hard-stop after 120000ms
- Cleans up interval on completion or unmount

The existing `usePeriodicRefresh` hook (`src/hooks/wardrobe/usePeriodicRefresh.ts`) already provides a structured interval/timeout pattern for exactly this use case. It offers:
- `startPeriodicImageRefresh()` — 3000ms interval, 90s timeout
- `startPeriodicAttributeRefresh()` — 5000ms interval, 120s timeout
- `startPeriodicRefresh()` / `stopPeriodicRefresh()` — combined controls
- Proper ref management, cleanup, and timeout callbacks

### What to do

Refactor `useWardrobeItemEdit.ts` to replace the manual `setInterval` polling with `usePeriodicRefresh`:

1. Read the current `usePeriodicRefresh` API to understand its callback interface.
2. In `useWardrobeItemEdit`, replace the manual `setInterval` + `setTimeout` pattern in `startPollingForAICompletion` with calls to `usePeriodicRefresh`.
3. The refresh callbacks (`refreshImages`, `refreshAttributes`) should contain the existing polling logic (fetch item, check attributes).
4. Use the `onImageRefreshTimeout` callback for the hard-stop timeout behavior.
5. Call `stopPeriodicRefresh()` on completion detection (when AI attributes are found).
6. Remove the manual interval/timeout refs that are no longer needed.

**If `usePeriodicRefresh` needs minor adjustments** to accommodate the `useWardrobeItemEdit` use case (e.g., configurable intervals or an `onAttributeRefreshTimeout` callback), make those adjustments. Keep changes minimal.

### Success criteria
- `useWardrobeItemEdit` uses `usePeriodicRefresh` instead of manual `setInterval`/`setTimeout`
- Same polling behavior: checks item + attributes every 2s, stops after 120s or on completion
- No manual `setInterval` polling outside of `usePeriodicRefresh` and `useAIJobPolling` in the codebase
- Clean unmount behavior preserved

---

## General rules

- **Preserve existing behavior** — these are deduplication changes only, no functional changes.
- **Minimal changes** — extract shared code, update imports, delete duplicates. Don't restructure beyond what's needed.
- **Use existing patterns** — follow the `if (__DEV__)` logging pattern from Phase 2B, memoization patterns from Phase 2C.
- **Verify by reading** — after changes, re-read each modified file to confirm correctness.
- Commit all changes with a descriptive message.

## Output

Write a summary to `CODEX_TASK_REPORT_2D.md` listing:
1. Shared render job hook: API, which hooks were migrated, what was extracted vs what stayed in calling hooks
2. Batch image helper: function signature, which hooks were migrated, any edge cases
3. Polling standardization: what changed in useWardrobeItemEdit, any changes to usePeriodicRefresh
4. Any issues or decisions made
