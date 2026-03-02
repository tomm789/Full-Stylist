# Codex Task: Sweep 1D — Image, Polling & Resource Audit

## Context

You are working on the Full Stylist app (Expo 54 / React Native / Expo Router). This is an audit-only task — **do not edit any source files**. Your job is to analyse and report.

This is the final audit sweep. Previous sweeps covered route files (1A), hooks (1B), and component memoization (1C). This sweep focuses on **image loading patterns, polling/timer lifecycle, and resource management** — the areas most likely to cause memory leaks, excessive network usage, and battery drain.

Reference previous reports if helpful:
- `CODEX_TASK_REPORT.md` (1A), `CODEX_TASK_REPORT_1B.md` (1B), `CODEX_TASK_REPORT_1C.md` (1C)

## Your Task

### Part 1: Image Loading Patterns

The app uses `expo-image` (Image from 'expo-image'). Search all components that render images and audit for:

**Consistency:**
- Is `expo-image` used consistently, or are there instances of React Native's built-in `Image` or `ImageBackground`?
- Is `cachePolicy` set? If so, what values are used across different components?
- Are `placeholder` props used (blurhash, thumbnail, or color)?
- Is `priority` set for above-the-fold vs offscreen images?
- Is `contentFit` / `contentPosition` used consistently for the same image types?
- Are `transition` props configured for smooth loading?

**Memory:**
- Are full-resolution images loaded in grid/thumbnail contexts where smaller sizes would suffice?
- Are image URLs constructed with size parameters or transforms where the backend supports it (Supabase storage transform URLs)?
- Is `recyclingKey` used in list contexts to help with image recycling?

**Search broadly**: `grep -r "from 'expo-image'" src/` and `grep -r "from 'react-native'" src/ | grep Image` to find all image usage.

### Part 2: Polling, Timers & Subscriptions

Audit ALL timer and polling patterns across the codebase for proper lifecycle management.

**Search for:**
- `setTimeout` — is the timeout ID stored and cleared on unmount?
- `setInterval` — is the interval ID stored and cleared on unmount?
- `useEffect` with async functions — is there a mounted/cancelled flag or AbortController?
- Supabase realtime subscriptions — are they unsubscribed on unmount?
- Any custom polling hooks — do they support cancellation?

**Key files to check** (identified in Sweep 1B as having issues):
- `src/hooks/wardrobe/useWardrobeItemDetail.ts` — large async chain without cancellation
- `src/hooks/wardrobe/useAddWardrobeItem.ts` — 4 untracked setTimeout calls
- `src/hooks/wardrobe/useWardrobeItemEdit.ts` — polling timeout not stored in ref
- `src/hooks/outfits/useOutfitGeneration.ts` — no unmount cleanup for polling
- `src/hooks/outfits/useOutfitView.ts` — polling without cancel guard
- `src/hooks/social/useFeed.ts` — no abort on rapid filter changes
- `src/hooks/wardrobe/usePeriodicRefresh.ts` — the app's interval abstraction (check if it's properly implemented)
- `src/hooks/lookbooks/useLookbookDetailActions.ts` — async without mounted guard

**Also search broadly**: `grep -rn "setTimeout\|setInterval" src/` and `grep -rn "subscribe\|realtime" src/` to catch any instances not already identified.

### Part 3: Resource Management

**Abort Controllers:**
- Which fetch/Supabase calls use AbortController?
- Which should but don't?

**File System / Temp Files:**
- Does the app create temporary files (via `expo-file-system`) that are cleaned up?
- Are there any file download/cache paths that grow unbounded?

**Console Logging:**
- How many `console.log` / `console.warn` / `console.error` calls exist in production code (outside of `__DEV__` guards)?
- List the files with the most logging that should be gated.

**Key files to check for file/resource management:**
- `src/utils/imageProcessor.ts` (469 lines)
- `src/utils/image-compression.ts` (101 lines)
- `src/utils/imageUtils.ts` (121 lines)
- `src/utils/canvasTrimmer.native.ts` (118 lines)

## Output

Write your full analysis to `CODEX_TASK_REPORT_1D.md` in the project root. Structure it as:

1. **Part 1: Image Loading Patterns** — table of findings per component/pattern, plus a recommended standard pattern
2. **Part 2: Polling, Timers & Subscriptions** — table of every timer/poll instance found, whether it has proper cleanup, and the risk level
3. **Part 3: Resource Management** — findings on abort controllers, temp files, and logging
4. **Summary: Top 10 Resource Issues** — ranked by severity (memory leak > battery drain > network waste > DX noise)
5. **Summary: Recommended Standards** — proposed standard patterns for image loading, polling, and async cleanup that the app should adopt consistently

## Important

- **Do NOT edit any source files** — this is audit only
- **Do NOT create any new source files** other than the report
- Only create/edit `CODEX_TASK_REPORT_1D.md`
- Be specific: reference file names and line numbers
- For console.log counts, exact numbers per file are more useful than vague statements
