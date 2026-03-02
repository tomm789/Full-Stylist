# Full Stylist Optimization — Implementation Plan

Synthesized from audit sweeps 1A–1D. Ordered for long-term maintainability: fix the foundation first, establish shared patterns, then refactor structure.

---

## Guiding Principles

1. **Stability before speed** — fix bugs and memory leaks before optimizing renders.
2. **Shared utilities before file-level refactoring** — create the right abstractions first so refactored code uses them from day one.
3. **Small, reviewable tasks** — each task should touch a focused set of files with clear success criteria.
4. **No behavior changes** — all optimizations must preserve existing app behavior. If a change risks altering UX, flag it for manual testing.

---

## Phase 2A: Bug Fixes & Stability (highest priority)

These are live issues causing memory leaks, wasted resources, or stale state. Fix before anything else.

### Task 2A-1: Fix polling interval leak and recursive timer bugs
**Files:**
- `src/hooks/ai/useAIJobPolling.ts` — fix interval re-arm after `stopPolling()` (line 111-113)
- `src/lib/outfits/outfitDescriptionMessages.ts` — return cancellation handle from recursive `setTimeout` drip (lines 87-98)
- `src/hooks/outfits/useItemRevealAnimation.ts` — track delayed phase-change timeout in `stop()` (line 64)

**Success criteria:** No timer can fire after its parent hook unmounts or after `stop()` is called.

### Task 2A-2: Track all untracked setTimeout calls
**Files:**
- `src/hooks/wardrobe/useAddWardrobeItem.ts` — store 4 navigation timeouts in refs, clear on unmount (lines 188, 204, 211, 226)
- `src/hooks/wardrobe/useWardrobeItemEdit.ts` — store polling hard-stop timeout in ref, clear on unmount (line 135)
- `src/components/wardrobe/CategoryPills.tsx` — track scroll timeouts (lines 90, 130)
- `src/components/wardrobe/NavigationSlider.tsx` — track scroll timeout (line 50)
- `src/components/outfits/OutfitViewContent.tsx` — track retry timeout (line 168)

**Success criteria:** Every `setTimeout`/`setInterval` in the codebase is either stored in a ref and cleared on unmount, or provably safe (e.g., short one-shot with no state update).

### Task 2A-3: Add mounted/cancel guards to async hooks
**Files:**
- `src/hooks/wardrobe/useWardrobeItemDetail.ts` — add cancelled flag to main load effect (lines 349-533)
- `src/hooks/outfits/useOutfitGeneration.ts` — add unmount cleanup calling `stopAll()`
- `src/hooks/outfits/useOutfitEditorActions.ts` — add unmount cleanup calling `stopAll()`
- `src/hooks/outfits/useOutfitView.ts` — add cancellation to polling + load chain (lines 90-288)
- `src/hooks/social/useFeed.ts` — add abort/cancelled guard for rapid filter changes (lines 184-360)
- `src/hooks/lookbooks/useLookbookDetailActions.ts` — add mounted guard to async modal load (lines 229-254)

**Success criteria:** No hook can perform `setState` after unmount. All long async chains check a cancelled flag before each state update.

### Task 2A-4: Fix useCalendarEntries mounted flag bug
**Files:**
- `src/hooks/calendar/useCalendarEntries.ts` — change mounted boolean parameter to a ref that's checked at call time, not snapshot time (line 93, 118)

**Success criteria:** `loadOutfitImages` helper checks the current `isMounted.current` ref value, not a stale boolean snapshot.

---

## Phase 2B: Shared Utilities & Standards (build the foundation)

Create shared abstractions BEFORE refactoring individual files. This ensures all subsequent work uses consistent patterns.

### Task 2B-1: Create image URL transform helper
**New file:** `src/lib/images/transforms.ts`
**Purpose:** Shared URL builder that wraps Supabase `getPublicUrl` with transform options for size classes: `thumb` (150px), `card` (400px), `full` (original).
**Also update:** `src/lib/images.ts` and `src/lib/wardrobe/images.ts` to export/use the helper.

**Success criteria:** A single function `getImageUrl(path, size: 'thumb' | 'card' | 'full')` that returns transformed Supabase URLs. No components changed yet — just the utility.

### Task 2B-2: Create standard expo-image props helper
**New file:** `src/lib/images/defaults.ts`
**Purpose:** Export standard prop sets for image contexts:
- `GRID_IMAGE_PROPS` — `cachePolicy="memory-disk"`, `contentFit="cover"`, `transition={200}`
- `DETAIL_IMAGE_PROPS` — `contentFit="contain"`, `priority="high"`
- `AVATAR_IMAGE_PROPS` — `cachePolicy="memory-disk"`, `contentFit="cover"`

**Success criteria:** Standard props are importable. No components changed yet.

### Task 2B-3: Create cancellable timer utilities
**New file:** `src/lib/utils/timers.ts`
**Purpose:**
- `createTrackedTimeout(callback, ms)` — returns `{ id, clear() }`, stores in ref-friendly format
- `createTrackedInterval(callback, ms)` — same pattern
- `useMountedGuard()` — returns `isMounted` ref that's `true` on mount, `false` on unmount

**Success criteria:** Utilities are importable and tested conceptually. Tasks 2A-1 and 2A-2 can optionally be revisited to use these, but not required.

### Task 2B-4: Gate console.log calls with __DEV__
**Files:** All files with production console.log/warn/error (332 instances across codebase).
**Priority files** (top 10 by count):
1. `src/contexts/AuthContext.tsx` (35)
2. `src/lib/utils/image-helpers.ts` (29)
3. `src/hooks/profile/useImageGeneration.ts` (17)
4. `src/lib/user/initialization.ts` (15)
5. `src/hooks/outfits/useOutfitGeneration.ts` (9)
6. `src/utils/clothing-grid.native.ts` (9)
7. `src/utils/clothing-grid.js` (9)
8. `src/hooks/wardrobe/useWardrobeItemDetail.ts` (8)
9. `src/utils/imageProcessor.ts` (8)
10. `src/lib/outfits/sessions.ts` (8)

**Approach:** Wrap each `console.log` / `console.warn` with `if (__DEV__)`. Keep `console.error` for genuine error paths but gate diagnostic/verbose ones. Do NOT remove the log content — just gate it.

**Success criteria:** `grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v __DEV__ | grep -v "console.error" | wc -l` returns < 20.

---

## Phase 2C: Context & Memoization Quick Wins (broad impact, low risk)

### Task 2C-1: Memoize context provider values
**Files:**
- `src/contexts/AuthContext.tsx` — wrap provider value in `useMemo` (line 224-234). Separate stable callbacks from changing state if feasible.
- `src/contexts/HeaderSearchContext.tsx` — wrap provider value in `useMemo` (line 75-81)
- `src/contexts/TabSearchContext.tsx` — wrap provider value in `useMemo` (line 53-58)
- `src/contexts/NotificationsContext.tsx` — wrap provider value in `useMemo` (line 104-110)

**Success criteria:** All 8 context providers have memoized values. No context creates a new object reference on every render.

### Task 2C-2: FlatList tuning across all list components
**Files** (add `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` and `getItemLayout` where applicable):
- `src/components/wardrobe/ItemGrid.tsx` (line 98)
- `src/components/UserWardrobeScreen.tsx` (line 237)
- `src/components/outfits/OutfitsSocialFeedSection.tsx` (line 116)
- `src/components/social/PostGrid.tsx` (line 105)
- `src/components/lookbooks/LookbookPickerModal.tsx` (line 157)
- `src/components/search/SearchResultsPanel.tsx` (line 41)
- `src/components/wardrobe/CategoryPills.tsx` — add `getItemLayout` (uses `scrollToIndex`, line 91)
- `src/components/FindSimilarModal.tsx` (3 FlatLists at lines 117, 131, 145)

**Standard values:** `initialNumToRender={8}`, `maxToRenderPerBatch={4}`, `windowSize={5}`. Adjust per component if item sizes differ significantly.

**Success criteria:** All FlatList instances have virtualization props. `CategoryPills` has `getItemLayout` and no longer needs retry fallback.

### Task 2C-3: Memoize high-frequency list components
**Files:**
- `src/components/social/FeedItem.tsx` — wrap `FeedItemComponent` in `React.memo` (line 51)
- `src/components/wardrobe/ItemGrid.tsx` — wrap `renderItem` in `useCallback` (line 58)
- `src/components/UserWardrobeScreen.tsx` — wrap `renderItem` in `useCallback` (line 187)
- `src/components/calendar/EntryCard.tsx` — wrap in `React.memo` (line 31), memoize `find()` calls (lines 47-61)
- `src/components/calendar/CalendarDaySheet.tsx` — consider converting entries `ScrollView + map` to `FlatList` (line 184)
- `src/components/outfits/OutfitsSocialFeedSection.tsx` — stabilize `renderItem` callback (line 119)

**Success criteria:** All list row components consumed by FlatList are `React.memo` wrapped. All `renderItem` functions are `useCallback` wrapped.

---

## Phase 2D: Hook Deduplication (reduce maintenance surface)

### Task 2D-1: Extract shared outfit render job hook
**New file:** `src/hooks/outfits/useOutfitRenderJob.ts`
**Purpose:** Shared hook that handles: create job → trigger → poll → map success/failure → cache base64 cover
**Migrate from:**
- `src/hooks/outfits/useOutfitGeneration.ts` (lines 362-469)
- `src/hooks/outfits/useOutfitEditorActions.ts` (lines 274-364)
- `src/hooks/social/useTryOnOutfit.ts` (lines 204-263)

**Success criteria:** All three hooks delegate render job lifecycle to the shared hook. Duplicated pipeline code removed.

### Task 2D-2: Extract shared image URL helper and deduplicate
**New file:** `src/utils/batchImageHelpers.ts`
**Purpose:** Move `batchGetOutfitCoverImages` to shared utility.
**Migrate from:**
- `src/hooks/social/useFeed.ts` (lines 43-81)
- `src/hooks/social/useUserProfile.ts` (lines 33-71)

**Success criteria:** Both hooks import from the shared utility. Duplicate helper functions deleted.

### Task 2D-3: Standardize polling on usePeriodicRefresh
**Files:**
- `src/hooks/wardrobe/useWardrobeItemEdit.ts` — replace manual interval polling with `usePeriodicRefresh` pattern (lines 87-141)
- Verify `usePeriodicRefresh` is robust enough (it already has good ref tracking per 1D audit)

**Success criteria:** No manual `setInterval` polling outside of `usePeriodicRefresh` and `useAIJobPolling`.

---

## Phase 2E: Image Optimization (apply standards from 2B)

### Task 2E-1: Apply image URL transforms to grid/list contexts
**Files:** All components rendering images in grid/list/feed contexts:
- `src/components/social/DiscoverGrid.tsx`
- `src/components/UserWardrobeScreen.tsx`
- `src/components/outfits/OutfitCard.tsx`
- `src/components/lookbooks/OutfitGridSelector.tsx`
- `src/components/social/FeedItem.tsx`
- Any other grid/card components loading full-resolution images

**Approach:** Use the `getImageUrl(path, 'thumb')` helper from Task 2B-1.

**Success criteria:** Grid and list image components use transformed thumbnail URLs instead of full-resolution.

### Task 2E-2: Apply standard expo-image props and add recyclingKey
**Files:** Same components as 2E-1, plus:
- Replace React Native `Image` in `src/components/shared/layout/HeaderAvatarButton.tsx` with `expo-image`
- Add `recyclingKey` to all list-context images
- Add `cachePolicy="memory-disk"` where missing
- Add `transition={200}` for consistent loading UX

**Success criteria:** All image instances use `expo-image` with appropriate standard props. `recyclingKey` present on all list-rendered images.

---

## Phase 2F: Structural Refactoring (long-term maintainability)

### Task 2F-1: Extract wardrobe.tsx route logic
**Target:** `app/(tabs)/wardrobe.tsx` (1,043 lines → target ~400)
**Extract to:**
- `src/hooks/wardrobe/useOutfitSelectionFlow.ts` — selection/conflict/draft logic (lines 488-559)
- `src/hooks/wardrobe/useWardrobeCameraFlow.ts` — camera entry/exit with tab-bar side effects (lines 390-425)
- `src/hooks/wardrobe/useCreatorReset.ts` — multi-system state reset (lines 450-463)
- `src/hooks/wardrobe/useGenerateOutfitFlow.ts` — generation submission orchestration (lines 561-588)
- `src/components/wardrobe/SessionPreviewStrip.tsx` — session preview + thumbnail strip (lines 865-954)
- `src/components/wardrobe/WardrobeModalStack.tsx` — modal stack wrapper (lines 843-1040)

**Success criteria:** `wardrobe.tsx` under 450 lines. All extracted code is importable and works identically.

### Task 2F-2: Extract outfits/index.tsx route logic
**Target:** `app/(tabs)/outfits/index.tsx` (900 lines → target ~400)
**Extract to:**
- `src/components/outfits/LookbooksTabContent.tsx` — lookbooks tab render (lines 701-770)
- `src/components/outfits/SocialTabContent.tsx` — social explore/following tab (lines 776-840)
- `src/hooks/outfits/useOutfitNavigation.ts` — navigation helper + query builder (lines 451-472)

**Success criteria:** `outfits/index.tsx` under 450 lines.

### Task 2F-3: Decompose mega hooks into composition parents
**Targets:**
- `src/hooks/wardrobe/useWardrobeItemDetail.ts` (570 lines) — split into job orchestrator, initial cache, feedback status (per 1B recommendations)
- `src/hooks/headshot/useHairAndMakeup.ts` (527 lines) — split into view state, preview actions, share actions (per 1B recommendations)
- `src/hooks/outfits/useOutfitEditorActions.ts` (445 lines) — split into item picker, render pipeline, archive (per 1B recommendations)

**Success criteria:** Each parent hook is a thin composition layer under 150 lines. Sub-hooks are independently testable.

### Task 2F-4: Clean up dead code identified in audits
**Files:**
- `app/lookbooks/[id]/view.tsx` — remove unused `commentText`, `submittingComment`, `handleSubmitComment` (Sweep 1A finding)
- `app/(tabs)/_layout.tsx` — remove unused `createButtonContainer` and `createButton` styles, convert create menu to `CREATE_MENU_ITEMS.map()`
- `src/utils/imageProcessor.ts` — revoke object URL in `trimImageWhitespace` (line 210)
- `src/hooks/headshot/useHeadshotImageActions.ts` — add temp file cleanup after share (lines 54-58)

**Success criteria:** Dead code removed. Object URL leak fixed. Temp file cleanup added.

---

## Phase Summary & Dependencies

```
Phase 2A (Bugs/Stability)     ← Do first, no dependencies
    ↓
Phase 2B (Shared Utilities)   ← Builds abstractions for later phases
    ↓
Phase 2C (Quick Wins)         ← Uses patterns from 2B, broad impact
    ↓
Phase 2D (Hook Dedup)         ← Requires stable hooks from 2A
    ↓
Phase 2E (Image Optimization) ← Requires helpers from 2B-1, 2B-2
    ↓
Phase 2F (Structural)         ← Last: biggest changes, builds on everything above
```

## Task Sizing Estimates

| Phase | Tasks | Codex Sessions | Risk |
|-------|-------|---------------|------|
| 2A | 4 | 4 (new thread each) | Medium — behavior-sensitive fixes |
| 2B | 4 | 3-4 | Low — new files + mechanical wrapping |
| 2C | 3 | 3 | Low — additive changes only |
| 2D | 3 | 3 | Medium — refactoring shared patterns |
| 2E | 2 | 2 | Low — applying established patterns |
| 2F | 4 | 4-6 | High — structural changes to core files |
| **Total** | **20** | **~22 sessions** | |
