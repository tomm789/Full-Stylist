# Codex Task: Sweep 1B — Hook Complexity & Duplication Audit

## Context

You are working on the Full Stylist app (Expo 54 / React Native / Expo Router). This is an audit-only task — **do not edit any source files**. Your job is to analyse and report.

This is the second sweep of an optimization audit. Sweep 1A (see `CODEX_TASK_REPORT.md`) analysed the route files. This sweep focuses on the hooks layer — the 12 largest hooks by line count — looking for over-responsibility, duplication across hooks, missing cleanup, and split opportunities.

## Your Task

Read and analyse these 12 hook files:

1. `src/hooks/wardrobe/useWardrobeItemDetail.ts` (570 lines)
2. `src/hooks/outfits/useOutfitGeneration.ts` (549 lines)
3. `src/hooks/headshot/useHairAndMakeup.ts` (527 lines)
4. `src/hooks/outfits/useOutfitEditorActions.ts` (445 lines)
5. `src/hooks/headshot/useDrawModeLogic.ts` (402 lines)
6. `src/hooks/wardrobe/useAddWardrobeItem.ts` (385 lines)
7. `src/hooks/wardrobe/useCanvasLayout.ts` (374 lines)
8. `src/hooks/social/useFeed.ts` (374 lines)
9. `src/hooks/lookbooks/useLookbookDetailActions.ts` (371 lines)
10. `src/hooks/wardrobe/useFilters.ts` (340 lines)
11. `src/hooks/wardrobe/useWardrobeItemEdit.ts` (325 lines)
12. `src/hooks/outfits/useOutfitView.ts` (307 lines)

For **each hook**, produce the following analysis:

### A. Responsibilities
List every distinct responsibility this hook owns (data fetching, state management, mutations, subscriptions, UI logic, navigation, etc.). Flag any hook that owns more than 3 distinct responsibilities as "over-responsible".

### B. Split opportunities
If the hook is over-responsible, suggest concrete splits. Name the proposed new hooks and what each would own. Only suggest splits where the boundary is clean — don't split for the sake of it.

### C. Cleanup issues
Look for:
- Timers (`setTimeout`, `setInterval`) without cleanup in `useEffect` return
- Subscriptions or listeners without unsubscribe
- Polling without abort/cancel
- `useEffect` with missing or incorrect dependency arrays
- Async operations without abort controllers or mounted checks
- State updates that could fire after unmount

### D. Duplication across hooks
Look for patterns that appear in multiple hooks:
- Similar data fetching patterns (Supabase queries with the same structure)
- Similar polling/retry logic
- Similar image processing flows
- Similar state management patterns (loading/error/data triads)
- Similar navigation patterns
- Any utility logic that should be in `src/utils/` instead

### E. Memoization gaps
For each hook, note:
- Expensive computations not wrapped in `useMemo`
- Callback functions recreated every render that are passed to child components (should be `useCallback`)
- Objects/arrays created inline that cause unnecessary re-renders in consumers

## Also skim these smaller hooks for duplication patterns

Don't do a full analysis, but check if any of these duplicate logic from the 12 main hooks:

- `src/hooks/outfits/useOutfitSessionData.ts`
- `src/hooks/outfits/useOutfitSessionNavigation.ts`
- `src/hooks/social/useTryOnOutfit.ts`
- `src/hooks/social/useUserProfile.ts`
- `src/hooks/profile/useAccountSettings.ts`
- `src/hooks/headshot/usePresetSelection.ts`
- `src/hooks/headshot/useHeadshotGeneration.ts`
- `src/hooks/wardrobe/useWardrobeCamera.ts`
- `src/hooks/wardrobe/usePeriodicRefresh.ts`

## Output

Write your full analysis to `CODEX_TASK_REPORT_1B.md` in the project root. Use the structure above (sections A-E for each of the 12 hooks). End with two summary sections:

### Summary: Cross-Hook Duplication Patterns
List the top recurring patterns found across multiple hooks, with file references.

### Summary: Top 5 Highest-Impact Actions
Ranked by (complexity reduction × risk level), list the 5 most impactful things to fix across all 12 hooks.

## Important

- **Do NOT edit any source files** — this is audit only
- **Do NOT create any new source files** other than the report
- Only create/edit `CODEX_TASK_REPORT_1B.md`
- Be specific: reference line numbers or function names, not vague descriptions
- When flagging cleanup issues, explain what the actual risk is (memory leak, stale state, race condition, etc.)
