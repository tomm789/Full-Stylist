# Codex Task: 2A-2/3/4 Combined — Track All Untracked Timers, Add Mounted Guards, Fix Calendar Bug

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is an **implementation task** — you will edit source files. Task 2A-1 is complete (polling interval leak, drip cancellation, reveal timeout). This task covers the remaining three stability fixes from Phase 2A.

Reference: `CODEX_IMPLEMENTATION_PLAN.md` for full plan, `CODEX_TASK_REPORT_1D.md` Part 2 for audit evidence.

---

## Part 1: Track all untracked setTimeout calls (was Task 2A-2)

Every `setTimeout` must be stored in a ref and cleared on unmount. Fix these:

### 1a) `src/hooks/wardrobe/useAddWardrobeItem.ts`
**Problem (lines ~188, 204, 211, 226):** Four navigation-delay `setTimeout` calls are not tracked. If the component unmounts before the timeout fires, it will attempt state updates or navigation on an unmounted component.
**Fix:** Create a `timeoutRef` (or array of refs). Store each timeout ID. Add a `useEffect` cleanup that clears all pending timeouts on unmount.

### 1b) `src/hooks/wardrobe/useWardrobeItemEdit.ts`
**Problem (line ~135):** A hard-stop polling timeout is not stored in a ref and cannot be cleared on unmount.
**Fix:** Store the timeout ID in a ref. Clear it in the existing cleanup/unmount path.

### 1c) `src/components/wardrobe/CategoryPills.tsx`
**Problem (lines ~90, 130):** Two `setTimeout` calls for scroll alignment are not tracked.
**Fix:** Store in refs, clear on unmount.

### 1d) `src/components/wardrobe/NavigationSlider.tsx`
**Problem (line ~50):** Scroll-align `setTimeout` is not tracked.
**Fix:** Store in ref, clear on unmount.

### 1e) `src/components/outfits/OutfitViewContent.tsx`
**Problem (line ~168):** Retry `setTimeout` after image error is not tracked.
**Fix:** Store in ref, clear on unmount.

---

## Part 2: Add mounted/cancel guards to async hooks (was Task 2A-3)

Long async chains must not perform `setState` after the hook unmounts. For each file below, add a cancellation mechanism. The preferred pattern is:

```typescript
useEffect(() => {
  let cancelled = false;

  async function load() {
    // ... async work ...
    if (cancelled) return;
    setState(result);
  }

  load();
  return () => { cancelled = true; };
}, [deps]);
```

Or for non-effect async functions, use a `mountedRef`:

```typescript
const mountedRef = useRef(true);
useEffect(() => { return () => { mountedRef.current = false; }; }, []);
```

### 2a) `src/hooks/wardrobe/useWardrobeItemDetail.ts`
**Problem (lines ~349-533):** Large async effect chain with nested promises and no cancellation guard. State writes happen after multiple awaits.
**Fix:** Add a `cancelled` flag to the main load effect. Check `cancelled` before every `setState` call after an `await`. Return cleanup that sets `cancelled = true`.

### 2b) `src/hooks/outfits/useOutfitView.ts`
**Problem (lines ~90-149, 160-288):** `startPollingForOutfitRender` and `loadOutfitData` are async without cancellation. Polling can continue after unmount.
**Fix:** Add a `mountedRef`. Check before state updates. Add unmount cleanup that stops polling.

### 2c) `src/hooks/social/useFeed.ts`
**Problem (lines ~184-352, 358-360):** `loadFeed` can race on rapid filter/user changes. No abort or cancelled guard.
**Fix:** Add a `cancelled` flag in the effect that calls `loadFeed`. When deps change, the previous call's `cancelled` flag is set to `true` by the cleanup function. Check `cancelled` before each state update in `loadFeed`.

### 2d) `src/hooks/lookbooks/useLookbookDetailActions.ts`
**Problem (lines ~229-254):** `openAddOutfitsModal` async fetch updates state without mounted guard.
**Fix:** Add a `mountedRef`. Check before state updates after await.

### 2e) `src/hooks/profile/useProfileImages.ts`
**Problem (lines ~158-223):** Fire-and-forget async bodyshot sync/poll can update state after unmount.
**Fix:** Add a `mountedRef`. Check before state updates and alerts.

---

## Part 3: Fix useCalendarEntries mounted flag bug (was Task 2A-4)

### `src/hooks/calendar/useCalendarEntries.ts`
**Problem (line ~93, helper at ~118):** The `isMounted` boolean is passed as a parameter to `loadOutfitImages`. Because it's a boolean (not a ref), it captures the value at call time — if the component unmounts after the call but before the async work completes, the function still sees `isMounted === true` and proceeds with state updates.
**Fix:** Change to use a ref pattern:
- Create `const mountedRef = useRef(true)` in the hook
- Set `mountedRef.current = false` in unmount cleanup
- Pass `mountedRef` (the ref object) to `loadOutfitImages` instead of a boolean
- Inside `loadOutfitImages`, check `mountedRef.current` before state updates

---

## General rules

- **Preserve existing API contracts** — do not change hook return types or function signatures visible to consumers.
- **Do not refactor beyond scope** — only add cancellation/cleanup guards. Do not restructure, rename, or improve unrelated code.
- **Minimal changes** — for each file, add the minimum code needed for the fix. Don't reorganize surrounding code.
- **Test by reading** — after making changes, re-read each modified file to verify correctness.

## Output

Commit your changes with a descriptive message. Then write a summary to `CODEX_TASK_REPORT_2A234.md` listing:
1. What was changed in each file
2. The cancellation pattern used (cancelled flag, mountedRef, or timeout ref)
3. Any edge cases or concerns to flag for review
