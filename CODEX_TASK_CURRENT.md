# Codex Task: Phase 2C — Context & Memoization Quick Wins (3 sub-tasks)

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is an **implementation task**. Phases 2A (stability) and 2B (shared utilities) are complete. This phase applies broad, low-risk memoization and performance improvements across the component and context layers.

Reference: `CODEX_IMPLEMENTATION_PLAN.md` for full context, `CODEX_TASK_REPORT_1C.md` for the audit findings.

---

## Sub-task 2C-1: Memoize context provider values

For each context below, wrap the provider `value` prop in `useMemo` so consumers don't re-render when the value object reference changes unnecessarily. Separate stable callbacks from changing state where feasible.

### `src/contexts/AuthContext.tsx` (line ~224-234)
- The provider value is an object literal recreated every render.
- 18 consumers (`useAuth`) across the app — highest blast radius.
- Wrap in `useMemo` with appropriate deps (session, user, loading, and the stable callback functions).

### `src/contexts/HeaderSearchContext.tsx` (line ~75-81)
- Provider value is an object literal.
- 3 consumers.
- Wrap in `useMemo`.

### `src/contexts/TabSearchContext.tsx` (line ~53-58)
- Provider value is an object literal.
- 1 consumer currently but pattern should be correct.
- Wrap in `useMemo`.

### `src/contexts/NotificationsContext.tsx` (line ~104-110)
- Provider value is an object literal. Frequent poll/realtime updates recreate context value.
- 3 consumers.
- Wrap in `useMemo`.

**Note:** `FloatingTabBarContext`, `ThemeContext`, `CalendarEntryFlowContext` already have memoized values — do not change those.

**Success criteria:** All 8 context providers have memoized values. Verify by reading each file after changes.

---

## Sub-task 2C-2: FlatList tuning across all list components

Add virtualization props to all FlatList components that lack them. Use these as baseline defaults (adjust if item sizes differ significantly):

```typescript
initialNumToRender={8}
maxToRenderPerBatch={4}
windowSize={5}
```

### Files to update:

1. **`src/components/wardrobe/ItemGrid.tsx`** (line ~98) — main wardrobe grid
2. **`src/components/UserWardrobeScreen.tsx`** (line ~237) — user wardrobe grid
3. **`src/components/outfits/OutfitsSocialFeedSection.tsx`** (line ~116) — outfit feed
4. **`src/components/social/PostGrid.tsx`** (line ~105) — social post grid
5. **`src/components/lookbooks/LookbookPickerModal.tsx`** (line ~157) — lookbook list
6. **`src/components/search/SearchResultsPanel.tsx`** (line ~41) — search results
7. **`src/components/FindSimilarModal.tsx`** (lines ~117, 131, 145) — 3 FlatLists in one modal
8. **`src/components/social/DiscoverGrid.tsx`** / **`src/components/social/PostGrid.tsx`** — social grids
9. **`src/components/outfits/MyOutfitsSection.tsx`** (line ~79) — my outfits feed
10. **`src/components/wardrobe/headshot-selector/GridView.tsx`** (line ~55) — headshot grid

### Special case: `src/components/wardrobe/CategoryPills.tsx`
- Add `getItemLayout` — this list uses `scrollToIndex` (line ~91) and currently has retry fallback logic because `getItemLayout` is missing.
- Estimate pill width (e.g., ~80px per pill or measure from styles). Provide a `getItemLayout` function.
- Also add the standard virtualization props.

### Do NOT convert ScrollView+map to FlatList in this task — that's a bigger change for later.

**Success criteria:** Every `FlatList` in the codebase has `initialNumToRender`, `maxToRenderPerBatch`, and `windowSize`. `CategoryPills` has `getItemLayout`.

---

## Sub-task 2C-3: Memoize high-frequency list components

### Wrap these row components in `React.memo`:

1. **`src/components/social/FeedItem.tsx`** (line ~51) — wrap the `FeedItemComponent` (or equivalent default export) in `React.memo`. This is the highest-frequency rendered row in the app.

2. **`src/components/calendar/EntryCard.tsx`** (line ~31) — wrap in `React.memo`. Also memoize the `find()` calls at lines ~47-61 using `useMemo`.

### Wrap these `renderItem` functions in `useCallback`:

3. **`src/components/wardrobe/ItemGrid.tsx`** (line ~58) — wrap `renderItem` in `useCallback`.

4. **`src/components/UserWardrobeScreen.tsx`** (line ~187) — wrap `renderItem` in `useCallback`.

5. **`src/components/outfits/OutfitsSocialFeedSection.tsx`** (line ~119) — stabilize the `renderItem` callback with `useCallback`.

### Fix this specific performance issue:

6. **`src/components/wardrobe/OutfitCreatorCanvas.tsx`** (lines ~292-300) — the `sortedItems` sort uses `findIndex` inside the sort comparator, creating O(n² log n) behavior. Precompute a z-index lookup map before sorting, then reference the map in the comparator for O(n log n).

---

## General rules

- **Preserve existing behavior** — these are performance optimizations only, no functional changes.
- **Minimal changes** — add memoization wrappers, don't restructure components.
- **Verify by reading** — after changes, re-read each file to confirm correctness.
- Commit all changes with a descriptive message.

## Output

Write a summary to `CODEX_TASK_REPORT_2C.md` listing:
1. Context changes: which contexts were memoized and what deps were used
2. FlatList changes: which lists were tuned and what values were used
3. Memoization changes: which components were wrapped in `React.memo`, which `renderItem`s were wrapped in `useCallback`, and the canvas sort fix
4. Any issues or decisions made
