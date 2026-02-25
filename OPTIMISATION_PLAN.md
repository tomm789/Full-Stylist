# Optimisation Plan — Full Stylist Preview

Generated after completing the Plan A / B / C refactor.
Use this file to resume work in a new chat or after context reset.

---

## Context

This project is a React Native / Expo Router app.
Primary working dir: `Full-Stylist-preview/`
Branch at time of writing: `int/preview`

### Refactor already completed (Plans A, B, C)

**Plan A — Wardrobe**
- `src/hooks/wardrobe/useWardrobeTutorial.ts` — tutorial state machine
- `src/hooks/wardrobe/useWardrobeItemActions.ts` — toggle-favourite / delete mutations
- `src/hooks/wardrobe/useCanvasLayout.ts` — derived active-item maps added
- `src/components/wardrobe/OutfitCreatorSection.tsx` — replaces IIFE JSX antipattern
- `app/(tabs)/wardrobe.tsx` — slimmed down (~1083 → ~700 lines)
- `src/components/wardrobe/OutfitCreatorPanel.tsx` — PanelItemCard / PanelCategoryCard extracted

**Plan B — Hair & Make-Up**
- `src/lib/headshot/hairColors.ts` — HAIR_COLOR_SWATCHES + needsLightTextOnColor extracted
- `src/hooks/headshot/useVariationNavigation.ts` — variation navigation sub-hook
- `src/hooks/headshot/useHeadshotImageActions.ts` — share / delete image actions
- `src/hooks/headshot/useActiveHeadshotActions.ts` — set-as-active-headshot action
- `src/hooks/headshot/useHairAndMakeup.ts` — now composes sub-hooks (god-object reduced)
- `src/components/headshots/ShareToFeedModal.tsx` — extracted from screen
- `src/hooks/headshot/useGenerationDialogAnimation.ts` — stagger animation extracted
- `src/components/headshots/EditTabModal.tsx` — large edit bottom-sheet extracted
- `src/components/headshots/MirrorTabContent.tsx` — mirror tab non-draw-mode block extracted
- `app/hair-and-make-up.tsx` — slimmed down (~999 → ~280 lines)

**Plan C — Outfits** — completed in a prior session (details not captured here).

---

## Optimisation Tasks

Priority: **P0** = active bug | **P1** = silent wrong behaviour | **P2** = performance | **P3** = code quality

---

### P0 — Active Bugs (break user-facing features)

#### O-01 · `canShare` hardcoded `false` → share permanently broken
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L229
- **Problem:** `useHeadshotImageActions` is called with `canShare: false` because `canShare`
  is derived further down in the function body. `handleSharePreview` always exits early at
  `if (!canShare || !previewImageUrl) return`, so share never works.
- **Fix:** Move the `canShare` derivation above the `useHeadshotImageActions` call.
  `canShare` depends on `previewIsGenerated` and `previewHasImage`, both of which are
  available earlier in the hook body.
- [ ] **Done**

---

#### O-02 · `trimInFlightIdsRef` not cleared when items leave `selectedOutfitItems`
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` L55–92
- **Problem:** The three pruning effects clean up the state maps (`outfitCanvasLayouts`,
  `outfitCanvasTrims`, `outfitCanvasTrimStatuses`) when an item is deselected, but they never
  clear `trimInFlightIdsRef`. If an item is removed and re-added, the in-flight guard still
  sees its ID and the trim fetch is permanently skipped.
- **Fix:** Add `trimInFlightIdsRef.current.delete(itemId)` inside the pruning loop, or
  rebuild the ref set from `selectedOutfitItems` at the top of each pruning effect.
- [ ] **Done**

---

### P1 — Stale Closures (silent wrong behaviour)

#### O-03 · `applySnapshot` stale closure
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L477
- **Problem:** `useCallback(..., [])` with `eslint-disable-next-line react-hooks/exhaustive-deps`.
  Closes over `preset.set*` setters and `emptyAdvanced`. If `preset` changes (e.g. after
  auth or reset), the snapshot applies the old setters.
- **Fix:** Add correct deps — typically `[preset.setSelectedHair, preset.setSelectedMakeup, ...]`
  — or restructure so `preset` setters are stable refs.
- [ ] **Done**

---

#### O-04 · `setPreviewFromVariation` / `handleNavigateGeneration` not memoized
- **File:** `src/hooks/headshot/useVariationNavigation.ts` ~L54
- **Problem:** Both are plain async functions recreated every render. Any caller that puts
  them in a dep array will loop or hold a stale closure.
- **Fix:** Wrap both in `useCallback` with correct deps.
- [ ] **Done**

---

### P2 — Performance (unnecessary recalculation)

#### O-05 · `emptyAdvanced` rebuilt every render
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L475
- **Problem:** `Object.fromEntries(ADVANCED_FIELDS.map(...))` runs on every render.
  `ADVANCED_FIELDS` is a module-level constant so the output never changes.
- **Fix:** Hoist to module level: `const EMPTY_ADVANCED = Object.fromEntries(ADVANCED_FIELDS.map(f => [f.id, '']));`
- [ ] **Done**

---

#### O-06 · `previewVariation` `.find()` not memoized
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L209
- **Problem:** Linear scan of `variations` on every render. Five derived flags
  (`previewIsSaved`, `previewIsSavedImage`, `previewIsGenerated`, etc.) all depend on it,
  causing cascading recalculations.
- **Fix:** `const previewVariation = useMemo(() => variations.find(v => v.id === previewVariationId) ?? null, [variations, previewVariationId]);`
- [ ] **Done**

---

#### O-07 · `hasCustomCreatorLayout`, `unresolvedTrimCount`, `successTrimCount` not memoized
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` ~L321–336
- **Problem:** Inline `.filter()` and `Object.keys()` over memoized maps, but the derived
  scalars themselves are not memoized, so they re-run every render.
- **Fix:** Wrap all three in `useMemo` with `[activeOutfitCanvasLayouts, activeOutfitCanvasTrims, activeOutfitCanvasTrimStatuses, selectedOutfitItems]`.
- [ ] **Done**

---

#### O-08 · `availableCategories` `.filter()` runs every render
- **File:** `src/components/wardrobe/OutfitCreatorPanel.tsx` ~L397
- **Problem:** `categories.filter(cat => !selectedCategoryIds?.has(cat.id))` is called
  on every render without memoization.
- **Fix:** `const availableCategories = useMemo(() => categories.filter(...), [categories, selectedCategoryIds]);`
- [ ] **Done**

---

#### O-09 · Three near-identical pruning effects — consolidate into one
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` L55–92
- **Problem:** Three separate `useEffect` calls each build a `Set` from `selectedOutfitItems`
  and prune one map. Same pattern, same deps, three renders.
- **Fix:** Merge into a single effect that prunes all three maps (and the ref — see O-02)
  in one pass with one `Set` construction.
- [ ] **Done**

---

### P3 — Code Quality / Leaky Abstraction

#### O-10 · `handleInfoPress` not memoized
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L308
- **Problem:** Plain function in hook body. Inconsistent with the rest of the hook.
  Any child that wraps it in an effect or uses reference equality will see a new function
  every render.
- **Fix:** `const handleInfoPress = useCallback((option) => Alert.alert(option.title, option.description), []);`
- [ ] **Done**

---

#### O-11 · `getShareableUri` leaked from `useHeadshotImageActions`
- **File:** `src/hooks/headshot/useHeadshotImageActions.ts` ~L131
- **Problem:** Private implementation detail of `handleSharePreview`. Exporting it widens
  the hook's public API unnecessarily and invites misuse.
- **Fix:** Remove from the return object. Keep it as a closure-only helper.
- [ ] **Done**

---

#### O-12 · Direct Supabase call in `useActiveHeadshotActions`
- **File:** `src/hooks/headshot/useActiveHeadshotActions.ts` ~L25
- **Problem:** All other DB mutations go through lib helpers. This call couples the hook
  directly to the `user_settings` table schema and the `updated_at: new Date().toISOString()`
  pattern, making it harder to test or swap the data layer.
- **Fix:** Extract a `setActiveHeadshot(userId, headshotImageId)` helper in
  `src/lib/headshot/` (alongside the existing generation helpers) and call it here.
- [ ] **Done**

---

#### O-13 · `useCanvasLayout` fetch effect suppresses stale dep with eslint-disable
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` ~L234
- **Problem:** `outfitCanvasTrimStatuses` is read inside the effect to filter non-idle items
  but excluded from deps to avoid a loop. The status filter can be stale.
- **Fix:** Read `outfitCanvasTrimStatuses` inside the `setOutfitCanvasTrimStatuses` functional
  updater (or via a ref) so the effect doesn't need it as a dep.
- [ ] **Done**

---

#### O-14 · Duplicate type imports in `useHairAndMakeup.ts`
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` L16–17
- **Problem:** `import type { PresetCategory }` and `import type { PresetOption }` are two
  separate lines from the same module.
- **Fix:** Collapse into `import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';`
- [ ] **Done**

---

#### O-15 · Mount animation effect has misleading deps
- **File:** `src/components/wardrobe/OutfitCreatorPanel.tsx` ~L390
- **Problem:** `useEffect(() => { Animated.parallel([...]).start(); }, [mountAnim, opacityAnim])`.
  Both refs are stable — listing them implies reactivity that doesn't exist.
- **Fix:** Change deps array to `[]`.
- [ ] **Done**

---

#### O-16 · `object` style prop types in `PanelItemCard` / `PanelCategoryCard`
- **File:** `src/components/wardrobe/OutfitCreatorPanel.tsx` ~L252–305
- **Problem:** Props typed as `object` lose StyleSheet type safety.
- **Fix:** Use `StyleProp<ViewStyle>` / `StyleProp<ImageStyle>` from `react-native`.
- [ ] **Done**

---

#### O-17 · Navigation direction labels semantically ambiguous
- **File:** `src/hooks/headshot/useVariationNavigation.ts` ~L81
- **Problem:** `'back'` does `index + 1` and `'forward'` does `index - 1`. Only correct if
  the array is newest-first. This assumption is undocumented and the names are confusing.
- **Fix:** Add a comment confirming the array order, or rename to `'older'`/`'newer'`.
- [ ] **Done**

---

## How to resume in a new chat

1. Point Claude at this file: "Read `OPTIMISATION_PLAN.md` in the project root."
2. Give context: "We're working on `Full-Stylist-preview`, branch `int/preview`.
   The Plan A/B/C refactor is done. Start on the next unchecked item in the optimisation plan."
3. Work through items in P0 → P1 → P2 → P3 order.
4. Check off `[ ]` → `[x]` as each item is completed.
