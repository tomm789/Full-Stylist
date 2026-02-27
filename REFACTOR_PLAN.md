# Refactor Plan: Structural Cleanup

Replaces the old `REFACTOR_PLAN_LARGEST_FILES.md`. Audited 27 Feb 2026.

**Workflow:** `[CX]` = Codex task (spec in `.claude/codex-tasks/`). `[CC]` = Claude Code (direct or review). Each phase has a verification step before moving on.

---

## Phase 1: Backend — Split `netlify/functions/utils.js` (974 lines)

Every backend process imports from utils. Splitting it into focused modules makes each process's dependencies explicit and keeps future changes localized.

- [ ] `[CX]` Create `netlify/functions/lib/` directory with 5 submodules:
  - `timing.js` — `createTimingTracker`, `createPerformanceTracker`
  - `storage.js` — `isPngBase64`, `downloadImageFromStorage`, `uploadImageToStorage`
  - `gemini.js` — `getFetch` (internal), `callGeminiAPI`, `resolveModelFromSettings`, `getGeminiApiVersion`, `DEFAULT_IMAGE_MODEL`, `DEFAULT_BODY_MODEL`
  - `imageComposition.js` — `calculateGridLayout`, `compositeOutfitGrid`, `composeHeadshotWithMask` (requires `sharp`)
  - `imageOptimization.js` — `optimizeGeminiInput`, `optimizeGeminiOutput` (requires `sharp`)
- [ ] `[CX]` Rewrite `utils.js` as thin re-export of all 5 submodules (all existing `require("../utils")` continue working)
- [ ] `[CC]` Verify: all process files still work with `require("../utils")` destructuring unchanged

**Spec:** `.claude/codex-tasks/phase-1-split-netlify-utils.md`

---

## Phase 2: Backend — Clean up `outfit_render.js` (633 lines)

Second-largest backend file. Has a duplicate `calculateGridLayout` and several extractable helpers.

- [ ] `[CX]` Remove local `calculateGridLayout` (lines 188-197); import from `../utils` (or `../lib/imageComposition` after Phase 1)
- [ ] `[CX]` Extract `generateOutfitDescription`, `parseDescriptionResponse`, `fetchOutfitItemDetails` → `processes/outfit_description.js`
- [ ] `[CX]` Extract `normalizeLabel`, `normalizeLabelList` → `processes/outfit_helpers.js` (also used by `parseDescriptionResponse`)
- [ ] `[CC]` Review: `processOutfitRender` should only import from the new modules and stay as the orchestrator

**Spec:** `.claude/codex-tasks/phase-2-outfit-render-cleanup.md`

---

## Phase 3: Tab layout — Extract from `_layout.tsx` (785 lines)

The last monolithic tab-layer file. FloatingTabBar is ~310 lines including its StyleSheet.

- [ ] `[CX]` Extract `FloatingTabBar` component + `floatingTabBarStyles` → `src/components/tabs/FloatingTabBar.tsx`
- [ ] `[CX]` Extract `gridItems`, `actionItems`, `handleMenuOption`, `handleCreateOption` → `src/hooks/tabs/useTabMenuItems.ts`
- [ ] `[CC]` Review: `_layout.tsx` should be ~200-250 lines (providers + Tabs config + modals + FloatingTabBar render)

**Spec:** `.claude/codex-tasks/phase-3-tab-layout-extraction.md`

---

## Phase 4: Styles extraction sweep

Move inline `createStyles` from screens to co-located style files. Mechanical, low-risk.

**Pattern:** Screen keeps `const styles = useMemo(() => createStyles(colors), [colors])` + one import.

- [ ] `[CX]` `wardrobe.tsx` (925) → `app/(tabs)/wardrobe/styles.ts`
- [ ] `[CX]` `ai-settings.tsx` (681) → `app/ai-settings.styles.ts`
- [ ] `[CX]` `wardrobe/item/[id].tsx` (588) → `app/wardrobe/item/[id]/styles.ts`
- [ ] `[CX]` `headshot/[id].tsx` (526) → `app/headshot/[id]/styles.ts`
- [ ] `[CX]` `outfits/[id]/view.tsx` (503) → `app/outfits/[id]/view.styles.ts`
- [ ] `[CX]` Remaining screens batch: `calendar/index`, `archive`, `lookbooks/[id]/view`, `users/[id]`, `social/following-wardrobes`, `bodyshot/new`, `bodyshot/[id]`, `onboarding`, `auth/signup`, `auth/login`
- [ ] `[CC]` Verify: `npx tsc --noEmit` passes, app loads

**Spec:** `.claude/codex-tasks/phase-4-styles-sweep.md` (written when Phase 3 is done)

---

## Phase 5: Large hooks — Split by concern

- [ ] `[CX]` `useWardrobeItemDetail.ts` (659) → split into:
  - `useWardrobeItemJobStatus.ts` — job IDs, polling, generation state, retry
  - `useWardrobeItemDisplay.ts` — display images, active image, carousel state
  - Keep `useWardrobeItemDetail.ts` as orchestrator composing both + remaining state
- [ ] `[CX]` `useImageGeneration.ts` (597) → inspect and split by flow (upload vs job-submit vs poll) if distinct
- [ ] `[CX]` `useAddWardrobeItem.ts` (524) → inspect and split if distinct flows exist
- [ ] `[CC]` Review each: public API unchanged, screens don't need modifications

**Spec:** `.claude/codex-tasks/phase-5-hook-splits.md` (written when Phase 4 is done)

---

## Phase 6: Large components — Extract sections

- [ ] `[CX]` `FullScreenMenuModal.tsx` (583) → extract `MenuGrid`, `MenuActionList`; move `createStyles` to `.styles.ts`
- [ ] `[CX]` `OutfitCreatorPanel.tsx` (566) → extract remaining large JSX blocks if not already subcomponents
- [ ] `[CX]` `ai-settings.tsx` → extract `MODEL_CATALOG` to `src/constants/aiModels.ts`; extract form sections to small components
- [ ] `[CC]` Review: each component file under ~350 lines

**Spec:** `.claude/codex-tasks/phase-6-component-extraction.md` (written when Phase 5 is done)

---

## Phase 7: Types split

- [ ] `[CX]` `ai-jobs/types.ts` (592) → split into `types/headshot.ts`, `types/outfit.ts`, `types/wardrobeItem.ts`, `types/common.ts`; re-export from `types.ts` barrel
- [ ] `[CC]` Verify: all imports from `@/lib/ai-jobs` still resolve

**Spec:** `.claude/codex-tasks/phase-7-types-split.md` (written when Phase 6 is done)

---

## Phase 8: Remaining large screens

After styles are extracted (Phase 4), these screens should be ~400-500 lines. Extract JSX sections into components only if still above ~450 lines.

- [ ] `[CX]` `headshot/[id].tsx` — extract preview, edit panel, share sections
- [ ] `[CX]` `outfits/[id]/view.tsx` — extract preview, schedule, actions sections
- [ ] `[CX]` `calendar/index.tsx` (477) — extract grid, day sheet, picker modals
- [ ] `[CX]` `lookbooks/[id]/view.tsx` (479) — extract header, grid, actions
- [ ] `[CC]` Review: each screen is composition + hooks, under ~400 lines

**Spec:** `.claude/codex-tasks/phase-8-screen-sections.md` (written when Phase 7 is done)

---

## Files excluded from refactoring

| File | Lines | Reason |
|------|-------|--------|
| `wardrobe.tsx` | 925 | Hooks already extracted; screen is composition. Styles extracted in Phase 4. |
| `outfits/index.tsx` | 828 | Hooks extracted, styles in `outfits/styles.ts`. Already well-structured. |
| `hair-and-make-up.tsx` | 447 | Slimmed from ~999, uses 8 composed hooks + 5 extracted components. |
| `useHairAndMakeup.ts` | 524 | Orchestrator composing 8 child hooks. Appropriate size. |
| `hairAndMakeupStyles.ts` | 765 | Large but well-organized style factory. Group by section if desired (optional). |
| `makeupPresets.ts` | 675 | Pure data array. Splitting adds complexity for no gain. |
| `hairPresets.ts` | 560 | Pure data array. Same reasoning. |
| `image-helpers.ts` | 518 | Utility lib. Inspect if issues arise but not a priority. |

---

## Verification after each phase

1. `npx tsc --noEmit` — no type errors
2. `npx expo start` — app loads
3. Smoke test affected screens
