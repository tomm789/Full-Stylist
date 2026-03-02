# Codex Task: Phase 2B — Shared Utilities & Standards (4 sub-tasks)

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is an **implementation task**. Phase 2A (bug fixes) is complete. This phase creates shared utility abstractions that later phases will use. You are creating new files and doing one large mechanical edit pass (console log gating).

Reference: `CODEX_IMPLEMENTATION_PLAN.md` for full context.

---

## Sub-task 2B-1: Create image URL transform helper

**Create new file:** `src/lib/images/transforms.ts`

The app uses Supabase storage. Currently all image URLs are fetched via `getPublicUrl()` with no size transforms — full-resolution images load everywhere including tiny grid thumbnails. Supabase supports image transforms via URL parameters.

**Implementation:**

```typescript
import { supabase } from '@/lib/supabase';

export type ImageSizeClass = 'thumb' | 'card' | 'full';

const SIZE_CONFIG: Record<ImageSizeClass, { width: number; height: number; quality?: number } | null> = {
  thumb: { width: 150, height: 150, quality: 70 },
  card: { width: 400, height: 400, quality: 80 },
  full: null, // No transform — original resolution
};

/**
 * Get a public URL for a Supabase storage image with optional size transform.
 * Falls back to untransformed URL if transform not supported or size is 'full'.
 */
export function getImageUrl(
  bucket: string,
  path: string,
  size: ImageSizeClass = 'full'
): string {
  const config = SIZE_CONFIG[size];

  if (!config) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: {
      width: config.width,
      height: config.height,
      quality: config.quality,
    },
  });
  return data.publicUrl;
}
```

Adapt as needed if the Supabase client version or storage API differs from this pattern. Check `src/lib/supabase.ts` for the existing client setup. Also check existing usage of `getPublicUrl` in `src/lib/images.ts` and `src/lib/wardrobe/images.ts` to understand current patterns.

**Also create:** `src/lib/images/index.ts` barrel export if the directory doesn't exist yet.

---

## Sub-task 2B-2: Create standard expo-image props helper

**Create new file:** `src/lib/images/defaults.ts`

```typescript
/**
 * Standard expo-image prop sets by rendering context.
 * Import and spread onto <Image> components for consistency.
 */

export const GRID_IMAGE_PROPS = {
  cachePolicy: 'memory-disk' as const,
  contentFit: 'cover' as const,
  transition: 200,
};

export const DETAIL_IMAGE_PROPS = {
  contentFit: 'contain' as const,
  priority: 'high' as const,
};

export const AVATAR_IMAGE_PROPS = {
  cachePolicy: 'memory-disk' as const,
  contentFit: 'cover' as const,
  transition: 150,
};

export const FEED_IMAGE_PROPS = {
  cachePolicy: 'memory-disk' as const,
  contentFit: 'cover' as const,
  transition: 200,
};
```

Export from `src/lib/images/index.ts`.

---

## Sub-task 2B-3: Create cancellable timer utilities

**Create new file:** `src/lib/utils/timers.ts`

```typescript
import { useRef, useEffect } from 'react';

/**
 * Hook that returns a ref which is `true` while the component is mounted.
 * Use to guard state updates in async callbacks.
 */
export function useMountedRef(): React.MutableRefObject<boolean> {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}

/**
 * Hook that returns helpers for tracking timeouts that auto-clear on unmount.
 */
export function useTrackedTimeouts() {
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  const schedule = (callback: () => void, delayMs: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delayMs);
    timeoutsRef.current.add(id);
    return id;
  };

  const cancel = (id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutsRef.current.delete(id);
  };

  const cancelAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
  };

  return { schedule, cancel, cancelAll };
}
```

Export from an `index.ts` barrel if one exists in `src/lib/utils/`, or create one.

---

## Sub-task 2B-4: Gate console.log calls with __DEV__

**Scope:** All `console.log` and `console.warn` calls in `src/` that are not already gated by `__DEV__`. Keep `console.error` calls for genuine error paths but gate diagnostic/verbose ones.

**Approach:** For each ungated `console.log(...)` or `console.warn(...)`, wrap with:
```typescript
if (__DEV__) console.log(...);
```
or for multi-line:
```typescript
if (__DEV__) {
  console.log(...);
}
```

**Priority files** (handle these first, they have the most):
1. `src/contexts/AuthContext.tsx` (35 occurrences)
2. `src/lib/utils/image-helpers.ts` (29)
3. `src/hooks/profile/useImageGeneration.ts` (17)
4. `src/lib/user/initialization.ts` (15)
5. `src/hooks/outfits/useOutfitGeneration.ts` (9)
6. `src/utils/clothing-grid.native.ts` (9)
7. `src/utils/clothing-grid.js` (9)
8. `src/hooks/wardrobe/useWardrobeItemDetail.ts` (8)
9. `src/utils/imageProcessor.ts` (8)
10. `src/lib/outfits/sessions.ts` (8)

Then do a broad sweep: search for all remaining `console.log` and `console.warn` in `src/` and gate them too.

**Do NOT gate:**
- `console.error` in catch blocks for genuine errors
- Any log already inside an `if (__DEV__)` block

**Success criteria:** Running `grep -rn "console\.\(log\|warn\)" src/ --include="*.ts" --include="*.tsx" | grep -v "__DEV__" | wc -l` returns less than 10.

---

## General rules

- **New files** should follow existing project conventions (TypeScript, consistent imports, no default exports for utilities).
- **Console log gating** is mechanical — do not change log content, just wrap with `if (__DEV__)`.
- Commit all changes with a descriptive message.

## Output

Write a summary to `CODEX_TASK_REPORT_2B.md` listing:
1. New files created and their exports
2. Console log gating: how many gated, how many remaining ungated, which files had the most changes
3. Any issues encountered or decisions made
