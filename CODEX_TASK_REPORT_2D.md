# CODEX Task Report — Phase 2D (Hook Deduplication)

## 2D-1 Shared outfit render job hook

### Added shared hook
- Created `src/hooks/outfits/useOutfitRenderJob.ts`.
- Exports:
  - `RenderJobOptions`
  - `RenderJobResult`
  - `useOutfitRenderJob()` returning `runRenderJob(options)`

### Shared pipeline extracted
`runRenderJob` now owns the duplicated core:
1. `createAIJob`
2. `triggerAIJobExecution`
3. Polling (`pollAIJobWithFinalCheck` or `waitForAIJobCompletion` via `pollingMode`)
4. Base64 extraction (`result.base64_result`)
5. Return `{ job, base64Result }`

### Migrations completed
- `src/hooks/outfits/useOutfitGeneration.ts`
  - Replaced inline create→trigger→poll block with `runRenderJob(...)`.
  - Kept pre-pipeline logic unchanged (save outfit, settings, grid prep, session variation snapshot creation).
  - Kept post-pipeline logic unchanged (variation updates, base64 cover cache write via `setInitialCoverDataUri`, completion/error handling).
  - Preserved timeline marks by wiring callbacks (`onJobCreated`, `onJobTriggered`).

- `src/hooks/outfits/useOutfitEditorActions.ts`
  - Replaced inline create→trigger→poll block in `handleRender` with `runRenderJob(...)`.
  - Kept pre-pipeline grid generation and render payload assembly unchanged.
  - Kept post-pipeline cover cache write and navigation behavior unchanged.
  - Preserved animation + description polling sequencing by using `onJobTriggered`.

- `src/hooks/social/useTryOnOutfit.ts`
  - Replaced mannequin job pipeline with `runRenderJob(...)` (`pollingMode: 'wait_for_completion'`).
  - Replaced outfit render job pipeline with `runRenderJob(...)` (`pollingMode: 'wait_for_completion'`).
  - Kept surrounding try-on flow unchanged (reference image prep, outfit duplication, archive/error paths, navigation).

## 2D-2 Shared `batchGetOutfitCoverImages` utility

### Added shared utility
- Created `src/utils/batchImageHelpers.ts`.
- Signature:
  - `batchGetOutfitCoverImages(outfits: OutfitWithCover[]): Promise<Map<string, string | null>>`
- Behavior preserved:
  - Batches `images` query with `.in('id', coverImageIds)`
  - Builds image lookup
  - Generates public URLs from storage bucket/key
  - Returns `Map<outfitId, url|null>`

### Migrations completed (duplicates removed)
- `src/hooks/social/useFeed.ts`
- `src/hooks/social/useUserProfile.ts`
- `src/hooks/social/useDiscoverFeed.ts`
- `src/hooks/social/useDiscoverOutfits.ts`
- `src/hooks/profile/useProfileData.ts`

All five now import from `@/utils/batchImageHelpers` and no local duplicate `batchGetOutfitCoverImages` functions remain.

### Edge cases preserved
- Empty/missing `cover_image_id` returns `null` map entries per outfit.
- Missing image records/storage keys safely fall back to `null`.
- Existing bucket fallback behavior (`storage_bucket || 'media'`) preserved.

## 2D-3 Polling standardization in `useWardrobeItemEdit`

### Refactor completed
- `src/hooks/wardrobe/useWardrobeItemEdit.ts`
  - Removed manual interval/timeout refs and manual `setInterval`/`setTimeout` polling.
  - Integrated `usePeriodicRefresh` and moved polling logic into shared refresh callbacks.
  - `startPollingForAICompletion()` now calls:
    - `startPeriodicImageRefresh({ intervalMs: 2000, timeoutMs: 120000 })`
  - Calls `stopPeriodicRefresh()` on completion detection and on unmount.
  - Maintains completion criteria and state updates (AI attrs/title checks, form/category/subcategory updates).

### Minimal `usePeriodicRefresh` adjustments
- `src/hooks/wardrobe/usePeriodicRefresh.ts`
  - Added per-start configurability:
    - `startPeriodicImageRefresh({ intervalMs?, timeoutMs? })`
    - `startPeriodicAttributeRefresh({ intervalMs?, timeoutMs? })`
  - Added `onAttributeRefreshTimeout` callback support.
  - Extended `startPeriodicRefresh` to accept optional per-channel options and channel enable/disable.
  - Preserved defaults for existing callers (3s/90s image, 5s/120s attribute).

## Issues / decisions
- Kept `batchGenerateImageUrls` local to `useProfileData.ts` because it remains profile-specific and was not duplicated.
- Validation:
  - `npm run typecheck` fails in this workspace before/independent of these changes (`TS2688: Cannot find type definition file for 'jest'`).
  - A broader `npx tsc ...` check also reports many unrelated pre-existing repo type errors (missing RN module typings, test globals, etc.).
- Deduplication objectives for 2D-1, 2D-2, and 2D-3 are implemented with behavior-preserving intent and minimal surface-area changes.
