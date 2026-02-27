# Task: Split ai-jobs/types.ts by domain

## Files to read first
- `src/lib/ai-jobs/types.ts` (592 lines — the file being split)
- `src/lib/ai-jobs/index.ts` (barrel — imports from `./types`)
- `src/lib/ai-jobs/core.ts` (provides `AIJob` type, `createAIJob`, `getActiveJob`, `getRecentJob`)

## Overview

`types.ts` is a 592-line file containing job trigger functions, active/recent job queries, and feedback helpers — all in one file. Split it into 4 domain files under a `types/` directory, and rewrite `types.ts` as a re-export barrel.

The `index.ts` barrel imports everything from `./types` — after the split, `types.ts` re-exports from the sub-files, so `index.ts` stays unchanged.

---

## Changes

### 1. Create `src/lib/ai-jobs/types/` directory

### 2. Create `src/lib/ai-jobs/types/common.ts`

Move from `types.ts`:
- `getWardrobeItemIdFromJobInput` function (lines 10-19) — **NOT exported** (private helper)
- `getResultImageIdFromJob` function (lines 24-36) — **NOT exported** (private helper)
- `logJobPayloadKeysIfDebug` function (lines 42-54) — **NOT exported** (private helper)
- `RECENT_JOB_DAYS_MS` constant (line 461) — **exported** (used by wardrobe, headshot, bodyshot sub-files)

```ts
import type { AIJob } from '../core';

/** Resolve wardrobe item id from job input (item_id or wardrobe_item_id). */
export function getWardrobeItemIdFromJobInput(job: AIJob): string | null {
  // [paste lines 11-18 exactly]
}

/** Resolve generated image id from job result. */
export function getResultImageIdFromJob(job: AIJob): string | null {
  // [paste lines 25-35 exactly]
}

/** Dev-only: log job input/result keys when debug flag is set. */
export function logJobPayloadKeysIfDebug(job: AIJob): void {
  // [paste lines 43-53 exactly]
}

/** 30-day window for "recent succeeded job" queries. */
export const RECENT_JOB_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
```

### 3. Create `src/lib/ai-jobs/types/wardrobeItem.ts`

Move from `types.ts`:
- `triggerAutoTag` (lines 59-72)
- `applyAutoTagResults` (lines 77-132)
- `triggerProductShot` (lines 137-146)
- `getActiveProductShotJob` (lines 151-163)
- `getRecentProductShotJob` (lines 168-180)
- `triggerBatchJob` (lines 303-315)
- `getActiveBatchJob` (lines 320-332)
- `getRecentBatchJob` (lines 337-349)
- `triggerWardrobeItemRender` (lines 355-364)
- `getActiveWardrobeItemRenderJob` (lines 369-376)
- `getActiveWardrobeItemGenerateJob` (lines 381-388)
- `triggerWardrobeItemTag` (lines 394-403)
- `triggerWardrobeItemGenerate` (lines 410-419)
- `getRecentWardrobeItemGenerateJob` (lines 425-432)
- `getRecentWardrobeItemRenderJob` (lines 438-445)
- `getActiveWardrobeItemJob` (lines 451-458)
- `getRecentWardrobeItemJobForFeedback` (lines 468-512)

Imports needed:
```ts
import { supabase } from '../../supabase';
import { createAIJob, getActiveJob, getRecentJob } from '../core';
import type { AIJob } from '../core';
import type { QueryResult } from '../../utils/supabase-helpers';
import { getWardrobeItemIdFromJobInput, logJobPayloadKeysIfDebug, RECENT_JOB_DAYS_MS } from './common';
```

All functions are `export async function` — paste them exactly as-is. Only the imports change.

### 4. Create `src/lib/ai-jobs/types/headshot.ts`

Move from `types.ts`:
- `triggerHeadshotGenerate` (lines 185-196)
- `triggerHeadshotGenerateWithPrompt` (lines 202-229)
- `triggerBodyShotGenerate` (lines 235-249)
- `triggerBodyShotGenerateFromSelfies` (lines 254-263)
- `getActiveHeadshotJob` (lines 519-521)
- `getRecentHeadshotJobForImage` (lines 527-552)
- `getActiveBodyshotJob` (lines 559-561)
- `getRecentBodyshotJobForImage` (lines 567-592)

Imports needed:
```ts
import { supabase } from '../../supabase';
import { createAIJob, getActiveJob } from '../core';
import type { AIJob } from '../core';
import type { QueryResult } from '../../utils/supabase-helpers';
import { getResultImageIdFromJob, logJobPayloadKeysIfDebug, RECENT_JOB_DAYS_MS } from './common';
```

### 5. Create `src/lib/ai-jobs/types/outfit.ts`

Move from `types.ts`:
- `getActiveOutfitRenderJob` (lines 268-280)
- `getRecentOutfitRenderJob` (lines 285-297)

Imports needed:
```ts
import { getActiveJob, getRecentJob } from '../core';
import type { AIJob } from '../core';
import type { QueryResult } from '../../utils/supabase-helpers';
```

These functions use inline `(job.input as any)?.outfit_id === outfitId` — they do NOT use `getWardrobeItemIdFromJobInput`. No common import needed.

### 6. Rewrite `src/lib/ai-jobs/types.ts` as re-export barrel

Replace the entire file with:

```ts
/**
 * AI job type-specific triggers and queries.
 * Split by domain; this file re-exports everything for backward compatibility.
 */

// Wardrobe item jobs (auto_tag, product_shot, batch, render, generate)
export {
  triggerAutoTag,
  applyAutoTagResults,
  triggerProductShot,
  getActiveProductShotJob,
  getRecentProductShotJob,
  triggerBatchJob,
  getActiveBatchJob,
  getRecentBatchJob,
  triggerWardrobeItemRender,
  getActiveWardrobeItemRenderJob,
  getActiveWardrobeItemGenerateJob,
  triggerWardrobeItemTag,
  triggerWardrobeItemGenerate,
  getRecentWardrobeItemGenerateJob,
  getRecentWardrobeItemRenderJob,
  getActiveWardrobeItemJob,
  getRecentWardrobeItemJobForFeedback,
} from './types/wardrobeItem';

// Headshot + body shot generation and feedback
export {
  triggerHeadshotGenerate,
  triggerHeadshotGenerateWithPrompt,
  triggerBodyShotGenerate,
  triggerBodyShotGenerateFromSelfies,
  getActiveHeadshotJob,
  getRecentHeadshotJobForImage,
  getActiveBodyshotJob,
  getRecentBodyshotJobForImage,
} from './types/headshot';

// Outfit render
export {
  getActiveOutfitRenderJob,
  getRecentOutfitRenderJob,
} from './types/outfit';
```

**Do NOT export anything from `./types/common`** in the barrel. The common helpers are internal implementation details used only by the domain files.

### 7. Verify `index.ts` is unchanged

`src/lib/ai-jobs/index.ts` imports from `./types`. After the rewrite, `types.ts` is a re-export barrel with the same 27 exports. **Do NOT modify `index.ts`.**

---

## Constraints

- Do NOT change any function signatures, behavior, or JSDoc comments
- Do NOT change `index.ts` — it must continue to import from `./types`
- Do NOT change any consumer files — they import from `@/lib/ai-jobs` (the index barrel)
- The one direct import in `src/hooks/wardrobe/useBodyShotGeneration.ts` (`from '@/lib/ai-jobs/types'`) must continue to work
- Move code exactly as-is; only update import paths
- Keep all `__DEV__` guards and console statements
- All 27 exports from the original `types.ts` must remain available from `types.ts`

## Acceptance criteria

- [ ] `src/lib/ai-jobs/types/` directory exists with 4 files: `common.ts`, `wardrobeItem.ts`, `headshot.ts`, `outfit.ts`
- [ ] `types/wardrobeItem.ts` exports 17 functions (triggerAutoTag through getRecentWardrobeItemJobForFeedback)
- [ ] `types/headshot.ts` exports 8 functions (headshot + bodyshot triggers and feedback queries)
- [ ] `types/outfit.ts` exports 2 functions (getActiveOutfitRenderJob, getRecentOutfitRenderJob)
- [ ] `types/common.ts` exports 4 items (3 helper functions + RECENT_JOB_DAYS_MS constant)
- [ ] `types.ts` is a re-export barrel (~40 lines), re-exporting all 27 functions from the 3 domain files
- [ ] `types.ts` does NOT re-export from `./types/common`
- [ ] `index.ts` is unchanged
- [ ] No TypeScript errors (pre-existing jest type error is OK)
- [ ] All 18 consumer files continue to compile without changes
