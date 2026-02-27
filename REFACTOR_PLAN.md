# Refactor Plan: Structural Cleanup

Replaces the old `REFACTOR_PLAN_LARGEST_FILES.md`. Audited 27 Feb 2026.

**Workflow:** `[CX]` = Codex task (spec in `.claude/codex-tasks/`). `[CC]` = Claude Code (direct or review). Each phase has a verification step before moving on.

---

## Phase 1: Backend — Split `netlify/functions/utils.js` (974 lines)

Every backend process imports from utils. Splitting it into focused modules makes each process's dependencies explicit and keeps future changes localized.

- [x] `[CX]` Create `netlify/functions/lib/` directory with 5 submodules:
  - `timing.js` — `createTimingTracker`, `createPerformanceTracker`
  - `storage.js` — `isPngBase64`, `downloadImageFromStorage`, `uploadImageToStorage`
  - `gemini.js` — `getFetch` (internal), `callGeminiAPI`, `resolveModelFromSettings`, `getGeminiApiVersion`, `DEFAULT_IMAGE_MODEL`, `DEFAULT_BODY_MODEL`
  - `imageComposition.js` — `calculateGridLayout`, `compositeOutfitGrid`, `composeHeadshotWithMask` (requires `sharp`)
  - `imageOptimization.js` — `optimizeGeminiInput`, `optimizeGeminiOutput` (requires `sharp`)
- [x] `[CX]` Rewrite `utils.js` as thin re-export (explicit 13-key barrel, no spread)
- [x] `[CC]` Verified: 13 keys exported, no leaking of internal helpers

**Spec:** `.claude/codex-tasks/phase-1-split-netlify-utils.md`

---

## Phase 2: Backend — Clean up `outfit_render.js` (633 lines)

Second-largest backend file. Has a duplicate `calculateGridLayout` and several extractable helpers.

- [x] `[CX]` Remove local `calculateGridLayout`; import from `../lib/imageComposition`
- [x] `[CX]` Extract `generateOutfitDescription`, `parseDescriptionResponse`, `fetchOutfitItemDetails` → `processes/outfit_description.js`
- [x] `[CX]` Extract `normalizeLabel`, `normalizeLabelList`, `clamp`, `normalizeTrimBounds` → `processes/outfit_helpers.js`
- [x] `[CC]` Verified: `processOutfitRender` imports from new modules, exports unchanged

**Spec:** `.claude/codex-tasks/phase-2-outfit-render-cleanup.md`

---

## Phase 3: Tab layout — Extract from `_layout.tsx` (785 lines)

The last monolithic tab-layer file. FloatingTabBar is ~310 lines including its StyleSheet.

- [x] `[CX]` Extract `FloatingTabBar` component + `floatingTabBarStyles` → `src/components/tabs/FloatingTabBar.tsx`
- [x] `[CX]` Extract `gridItems`, `actionItems`, `handleMenuOption`, `handleCreateOption` → `src/hooks/tabs/useTabMenuItems.ts`
- [x] `[CC]` Verified: `_layout.tsx` at 271 lines (under 280 target)

**Spec:** `.claude/codex-tasks/phase-3-tab-layout-extraction.md`

---

## Phase 4: Styles extraction sweep

Move inline `createStyles` from screens to co-located style files. Mechanical, low-risk.

**Pattern:** Screen keeps `const styles = useMemo(() => createStyles(colors), [colors])` + one import.

- [x] `[CX]` `wardrobe.tsx` (925) → `app/(tabs)/wardrobe/styles.ts`
- [x] `[CX]` `ai-settings.tsx` (681) → `app/ai-settings.styles.ts`
- [x] `[CX]` `wardrobe/item/[id].tsx` (588) → `app/wardrobe/item/[id]/styles.ts`
- [x] `[CX]` `headshot/[id].tsx` (526) → `app/headshot/[id]/styles.ts`
- [x] `[CX]` `outfits/[id]/view.tsx` (503) → `app/outfits/[id]/view.styles.ts`
- [x] `[CX]` Remaining screens batch: `calendar/index`, `archive`, `lookbooks/[id]/view`, `users/[id]`, `social/following-wardrobes`, `bodyshot/new`, `bodyshot/[id]`, `onboarding`, `auth/signup`, `auth/login`
- [x] `[CC]` Verified: `npx tsc --noEmit` passes, no new errors

**Spec:** `.claude/codex-tasks/phase-4-styles-sweep.md` (written when Phase 3 is done)

---

## Phase 5: Large hooks — Split by concern

- [x] `[CX]` `useWardrobeItemDetail.ts` (659) → extract two sub-hooks:
  - `useWardrobeItemDisplay.ts` — activeImageId state, prefer-product-shot effect, displayImagesOrdered memo (~45 lines)
  - `usePeriodicRefresh.ts` — periodic image/attribute refresh start/stop with refs and timeouts (~80 lines)
  - Keep `useWardrobeItemDetail.ts` as orchestrator (~535 lines) composing both + polling + initial load
- [x] `[CX]` `useImageGeneration.ts` (597) → extract image picking:
  - `useImagePicker.ts` — uploadedUri/Blob state, pickImage, pickHeadshotCameraImage, pickHeadshotLibraryImage, pickBodyShotCameraImage, clearImage, centerCropToAspect (~135 lines)
  - Keep `useImageGeneration.ts` as orchestrator (~465 lines) composing useImagePicker + generation flows
- [x] `[CX]` `useAddWardrobeItem.ts` (524) → extract image selection:
  - `useAddWardrobeImages.ts` — selectedImages state, handleTakePhoto, handleUploadPhoto, removeImage, addImageFromUri, cropper state/handlers, centerCropToSquare (~175 lines)
  - Keep `useAddWardrobeItem.ts` as orchestrator (~350 lines) composing useAddWardrobeImages + submission + job polling
- [x] `[CC]` Verified: public API unchanged, `tsc` clean

**Spec:** `.claude/codex-tasks/phase-5-hook-splits.md` (written when Phase 4 is done)

---

## Phase 6: Large components — Extract sections

- [x] `[CX]` `FullScreenMenuModal.tsx` (583 → 267) → extracted `MenuGrid`, `MenuActionList`, styles to `.styles.ts`
- [x] `[CX]` `OutfitCreatorPanel.tsx` (566 → 252) → extracted `PanelCards`, styles to `.styles.ts`
- [x] `[CX]` `ai-settings.tsx` (~482 → 289) → extracted `MODEL_CATALOG` + constants to `src/constants/aiModels.ts`
- [x] `[CC]` Verified: FullScreenMenuModal 333, OutfitCreatorPanel 296, ai-settings 286

**Spec:** `.claude/codex-tasks/phase-6-component-extraction.md` (written when Phase 5 is done)

---

## Phase 7: Types split

- [x] `[CX]` `ai-jobs/types.ts` (592) → split into `types/headshot.ts`, `types/outfit.ts`, `types/wardrobeItem.ts`, `types/common.ts`; re-export from `types.ts` barrel (35 lines)
- [x] `[CC]` Verified: all imports resolve, `tsc` clean

**Spec:** `.claude/codex-tasks/phase-7-types-split.md` (written when Phase 6 is done)

---

## Phase 8: Remaining large screens — SKIPPED

After styles are extracted (Phase 4), all four screens fall **under the 450-line threshold**:

| Screen | Pre-Phase 4 | Inline styles | Post-Phase 4 |
|--------|------------|--------------|-------------|
| `headshot/[id].tsx` | 526 | 166 lines | ~360 |
| `outfits/[id]/view.tsx` | 503 | ~67 lines | ~345 |
| `calendar/index.tsx` | 477 | 37 lines | ~440 |
| `lookbooks/[id]/view.tsx` | 479 | 67 lines | ~412 |

No component extraction needed. These screens are already composition + hooks at reasonable sizes.

- [x] Analysis complete: all targets under threshold after Phase 4

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
