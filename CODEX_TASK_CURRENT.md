# Codex Task: 2A-1 — Fix Polling Interval Leak and Recursive Timer Bugs

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is an **implementation task** — you will edit source files. The audit (Sweep 1D) identified three timer/polling bugs that cause memory leaks, wasted network requests, and stale state updates after unmount.

Reference: `CODEX_TASK_REPORT_1D.md` Part 2 for full details.

## Bug 1: useAIJobPolling interval re-arms after stopPolling()

**File:** `src/hooks/ai/useAIJobPolling.ts`
**Problem (line ~111-113):** After `stopPolling()` is called, if a poll callback is already in-flight, the interval can be re-armed when that callback completes. This causes polling to continue indefinitely after it should have stopped — wasting network and battery.

**Fix:** Add a `stoppedRef` that is set to `true` when `stopPolling()` is called. Before re-arming the interval (or before any state update in the poll callback), check `stoppedRef.current`. Also ensure the unmount cleanup sets `stoppedRef.current = true` and clears any active interval.

**Success criteria:**
- Calling `stopPolling()` guarantees no further intervals fire and no further state updates occur.
- Unmounting the hook guarantees cleanup.
- Existing consumers of this hook do not need to change their API usage.

## Bug 2: Recursive setTimeout drip has no cancellation handle

**File:** `src/lib/outfits/outfitDescriptionMessages.ts`
**Problem (lines ~87-98):** The message drip functions use recursive `setTimeout` to schedule the next message, but return no handle. The consuming hooks (`useOutfitGeneration`, `useOutfitEditorActions`) have `stopAll()` functions but cannot cancel in-flight drip timeouts. If the user navigates away mid-generation, these timeouts continue firing and attempting state updates.

**Fix:** Refactor the drip function to accept a cancellation mechanism. Options (pick the cleanest one):
- Accept an `AbortSignal` and check `signal.aborted` before each recursive `setTimeout`
- Return a `{ cancel: () => void }` handle that clears the pending timeout
- Accept a `cancelledRef` and check it before each recursion

Whichever approach you choose, update the consuming hooks to call cancel/abort on unmount and in their `stopAll()` functions.

**Files to update:**
- `src/lib/outfits/outfitDescriptionMessages.ts` — add cancellation
- `src/hooks/outfits/useOutfitGeneration.ts` — wire cancel into `stopAll()` and unmount cleanup
- `src/hooks/outfits/useOutfitEditorActions.ts` — wire cancel into `stopAll()` and unmount cleanup

**Success criteria:**
- Drip timeouts can be cancelled externally.
- `stopAll()` in both consuming hooks cancels any in-flight drip.
- Both consuming hooks have a `useEffect` unmount cleanup that calls `stopAll()`.
- No state updates occur after the drip is cancelled.

## Bug 3: useItemRevealAnimation delayed timeout not tracked

**File:** `src/hooks/outfits/useItemRevealAnimation.ts`
**Problem (line ~64):** A `setTimeout` for delayed phase-change is not tracked by `stop()`. When `stop()` is called, the reveal interval is cleared but this timeout continues and can fire a state update after the animation is supposed to be stopped.

**Fix:** Store the timeout ID in a ref. Clear it in `stop()` alongside the interval. Clear it in unmount cleanup.

**Success criteria:**
- `stop()` clears both the interval and the delayed timeout.
- Unmount cleanup clears both.
- No orphaned timeouts after stop/unmount.

## General rules for this task

- **Preserve existing API contracts** — do not change hook return types or function signatures unless absolutely necessary. If you must change a signature, update all call sites.
- **Do not refactor beyond the scope** — only fix the three bugs described. Do not restructure files, rename variables, or add unrelated improvements.
- **Test by reading** — after making changes, re-read each modified file to verify the fix is correct and complete.
- Commit your changes with a clear message describing what was fixed.

## Output

After completing the fixes, write a brief summary to `CODEX_TASK_REPORT_2A1.md` listing:
1. What was changed in each file (with line references)
2. The approach taken for each fix
3. Any edge cases or concerns to flag for review
