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

### Draw mode overhaul (post-plan commits, `bd129e7` → `024455f`)

Several commits reworked the draw mode UI after the refactor. Key changes that affect the optimisation plan:

- `handleOpenCategoryEditor` and `drawModeWasOpen` ref **removed** from the screen — draw mode no longer has a "jump to category editor" flow. `DrawModeInline` lost `onOpenCategoryEditor` / `onApplyTemplateSelections` props entirely.
- `MirrorTabContent` lost `drawModeWasOpenRef`, `setSelectedHairCategory`, `setSelectedMakeupCategory` props.
- `isFullscreenDraw` boolean added to gate all non-draw UI (header, tabs, grid, FaceMenuModal) behind one condition.
- Tab bar now hides on `state.isDrawModeOpen` as well as `state.hasSelections`.
- `DrawModeInline` now takes `topInset` for safe-area clearance; canvas fills full 4:3 ratio.
- `handleCloseEditModal` in the screen is now just `setEditModalVisible(false)` — draw-mode re-open logic is gone.
- Stale comment remains: `// Edit modal state lifted here so handleOpenCategoryEditor (from DrawModeInline) can open it` — the reason for lifting no longer applies (see O-18).

---

## Optimisation Tasks

Priority: **P0** = active bug | **P1** = silent wrong behaviour | **P2** = performance | **P3** = code quality

---

### P0 — Active Bugs (break user-facing features)

#### O-19 · Draw mode: server never reads mask — draw instructions have zero effect
- **Repos:** Client = `Full-Stylist-preview/` · Server = `Full-Stylist-codex/` (and `Full-Stylist-claude/`, both identical at 108 lines)
- **Files:**
  - Client upload: `src/hooks/headshot/useHeadshotGeneration.ts` L173–208
  - Server (missing implementation): `netlify/functions/processes/headshot_generate.js` L32–39
- **Problem:** The client correctly uploads the mask PNG and stores `mask_storage_path`,
  `mask_storage_bucket`, and `mask_color_map` in the AI job input. However, the server
  function only destructures `selfie_image_id`, `hair_style`, `makeup_style`, `prompt_text`,
  `output_folder`, and `skip_user_settings_update` — the three mask fields are never read,
  downloaded, or passed to Gemini. Gemini only ever receives the clean selfie (one image).
  The coloured draw instructions have zero effect on output.
- **Why the wife-beater appeared but nothing else:** When `prompt_text` is `""` (no presets
  selected), the server falls to `PROMPTS.HEADSHOT(hair, makeup)` which hardcodes
  `"Wearing a simple white ribbed singlet (wife beater)"`. That is the only instruction the
  model received. See O-20 for the prompt branching fix.
- **Fix — add to `headshot_generate.js` after the selfie download (after L45):**
  ```js
  // Destructure mask fields (add to existing destructuring at L32)
  const { mask_storage_path, mask_storage_bucket, mask_color_map } = input;

  // Download mask image if provided
  let maskResult = null;
  if (mask_storage_path) {
    maskResult = await downloadImageFromStorage(supabase, mask_storage_path, timingTracker, mask_storage_bucket);
  }

  // Build mask colour instructions
  let maskInstructions = '';
  if (mask_color_map?.length) {
    const lines = mask_color_map
      .filter(e => e.customPrompt?.trim())
      .map(e => `  - Region painted ${e.hex}: ${e.customPrompt}`);
    if (lines.length) {
      maskInstructions = `\nDRAW MASK (Image 1 shows coloured regions on a transparent background):\n${lines.join('\n')}\nApply changes ONLY within each coloured region. Preserve everything outside.`;
    }
  }

  // Replace the existing callGeminiAPI call (L77–84) with:
  const geminiImages = maskResult ? [selfieResult, maskResult] : [selfieResult];
  const headshotB64 = await callGeminiAPI(
    prompt + maskInstructions,
    geminiImages,
    model, 'IMAGE', perfTracker, timingTracker
  );
  ```
  Check `downloadImageFromStorage` signature in `netlify/functions/utils.js` — confirm
  whether it accepts a `bucket` param or derives it from the image ID.
- [x] **Done**

---

#### O-20 · Draw mode: client passes `""` as `prompt_text` → server falls to legacy prompt branch
- **Files:**
  - Client: `src/hooks/headshot/useHeadshotGeneration.ts` L132–196
  - Server: `Full-Stylist-codex/netlify/functions/processes/headshot_generate.js` L60–62
  - Prompts: `Full-Stylist-codex/netlify/functions/prompts.js`
- **Problem:** `buildHairMakeupPrompt(inputSnapshot)` returns `""` when no presets are
  selected (draw-only generation). Empty string passes `Boolean(promptText.trim())` check but
  is stored and forwarded to the server as `""`. Server evaluates `prompt_text ? ... : ...`
  where `""` is falsy → falls to legacy `PROMPTS.HEADSHOT(hair, makeup)` which uses hardcoded
  defaults. The full `PROMPTS.HEADSHOT_PRESET` (with proper framing, grey/white background,
  and quality instructions) is skipped.
- **Prompt templates (confirmed from `prompts.js`):**
  ```
  HEADSHOT: "...MODIFICATIONS: Keep original hair, Natural look. Infinite, solid pure white background."
  HEADSHOT_PRESET: "...STYLE DIRECTION:\n{styleNotes}\nCRITICAL: Maintain EXACT framing. light grey/white background."
  ```
  Both include the wife-beater clothing line. `HEADSHOT_PRESET('')` with empty styleNotes
  still applies the better framing/background/quality instructions.
- **Fix (two-part, implement after O-19 so `mask_storage_path` is available on server):**
  1. **Client (`useHeadshotGeneration.ts` L132):**
     ```ts
     const promptText = buildHairMakeupPrompt(inputSnapshot) || null;
     ```
  2. **Server (`headshot_generate.js` L60–62):**
     ```js
     // Before
     const prompt = prompt_text ? PROMPTS.HEADSHOT_PRESET(prompt_text) : PROMPTS.HEADSHOT(hair, makeup);
     // After
     const prompt = prompt_text
       ? PROMPTS.HEADSHOT_PRESET(prompt_text)
       : mask_storage_path
         ? PROMPTS.HEADSHOT_PRESET('')   // draw-only: full system prompt, no preset style text
         : PROMPTS.HEADSHOT(hair, makeup); // true legacy: no presets AND no mask
     ```
- [x] **Done**

---

#### O-21 · Draw mode: client uploads composite (selfie+strokes) instead of pure stroke mask
- **File:** `src/hooks/headshot/useDrawModeLogic.ts` L325–357 (`runGenerate`)
- **Problem:** In the primary path (`hasDrawnColors && previewImageUrl`), `runGenerate`
  downloads the preview image as `bgBase64` then calls
  `makeCompositeSnapshot(bgBase64, canvasWidth, canvasHeight)` — a single PNG with the selfie
  pixels and coloured strokes composited together. This composite is uploaded as the mask.
  Once O-19 adds server mask support, Gemini will receive: Image 0 = clean selfie,
  Image 1 = selfie with paint blobs. Both images contain the subject's face, so Gemini cannot
  distinguish subject pixels from annotation pixels, causing stroke colours to leak into the
  subject's appearance.
- **`HeadshotDrawingCanvas` ref interface (confirmed, `HeadshotDrawingCanvas.tsx` L19–20):**
  ```ts
  makeMaskSnapshot: () => Promise<string | null>;   // strokes on transparent bg — correct
  makeCompositeSnapshot: (bgBase64, w, h) => Promise<string | null>; // selfie + strokes — wrong for mask
  ```
  `makeMaskSnapshot()` is already used correctly in: template saving (L197), fallback paths
  (L349, L352). Only the primary generation path at L346 uses the wrong method.
- **Fix — simplify `runGenerate` entirely:**
  ```ts
  const runGenerate = async (colorMap: DrawnColorEntry[]) => {
    setCapturing(true);
    const maskBase64 = hasDrawnColors
      ? ((await drawingCanvasRef.current?.makeMaskSnapshot()) ?? null)
      : null;
    setCapturing(false);
    onGenerate(maskBase64, colorMap);
    onClose?.();
  };
  ```
  Removes the `bgBase64` fetch, the `try/catch`, and `makeCompositeSnapshot` entirely.
  The server already has the selfie via `selfie_image_id`.
- **Implement after O-19** (server mask support must exist before mask image format matters).
- [x] **Done**

---

#### O-01 · `canShare` hardcoded `false` → share permanently broken
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L229
- **Problem:** `useHeadshotImageActions` is called with `canShare: false` because `canShare`
  is derived further down in the function body. `handleSharePreview` always exits early at
  `if (!canShare || !previewImageUrl) return`, so share never works.
- **Fix:** Move the `canShare` derivation above the `useHeadshotImageActions` call.
  `canShare` depends on `previewIsGenerated` and `previewHasImage`, both of which are
  available earlier in the hook body.
- [x] **Done**

---

#### O-02 · `trimInFlightIdsRef` not cleared when items leave `selectedOutfitItems`
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` L55–92
- **Problem:** The three pruning effects clean up the state maps (`outfitCanvasLayouts`,
  `outfitCanvasTrims`, `outfitCanvasTrimStatuses`) when an item is deselected, but they never
  clear `trimInFlightIdsRef`. If an item is removed and re-added, the in-flight guard still
  sees its ID and the trim fetch is permanently skipped.
- **Fix:** Add `trimInFlightIdsRef.current.delete(itemId)` inside the pruning loop, or
  rebuild the ref set from `selectedOutfitItems` at the top of each pruning effect.
- [x] **Done**

---

### P1 — Stale Closures (silent wrong behaviour)

#### O-03 · `applySnapshot` stale closure
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L477
- **Problem:** `useCallback(..., [])` with `eslint-disable-next-line react-hooks/exhaustive-deps`.
  Closes over `preset.set*` setters and `emptyAdvanced`. If `preset` changes (e.g. after
  auth or reset), the snapshot applies the old setters.
- **Fix:** Add correct deps — typically `[preset.setSelectedHair, preset.setSelectedMakeup, ...]`
  — or restructure so `preset` setters are stable refs.
- [x] **Done**

---

#### O-04 · `setPreviewFromVariation` / `handleNavigateGeneration` not memoized
- **File:** `src/hooks/headshot/useVariationNavigation.ts` ~L54
- **Problem:** Both are plain async functions recreated every render. Any caller that puts
  them in a dep array will loop or hold a stale closure.
- **Fix:** Wrap both in `useCallback` with correct deps.
- [x] **Done**

---

### P2 — Performance (unnecessary recalculation)

#### O-05 · `emptyAdvanced` rebuilt every render
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L475
- **Problem:** `Object.fromEntries(ADVANCED_FIELDS.map(...))` runs on every render.
  `ADVANCED_FIELDS` is a module-level constant so the output never changes.
- **Fix:** Hoist to module level: `const EMPTY_ADVANCED = Object.fromEntries(ADVANCED_FIELDS.map(f => [f.id, '']));`
- [x] **Done**

---

#### O-06 · `previewVariation` `.find()` not memoized
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L209
- **Problem:** Linear scan of `variations` on every render. Five derived flags
  (`previewIsSaved`, `previewIsSavedImage`, `previewIsGenerated`, etc.) all depend on it,
  causing cascading recalculations.
- **Fix:** `const previewVariation = useMemo(() => variations.find(v => v.id === previewVariationId) ?? null, [variations, previewVariationId]);`
- [x] **Done**

---

#### O-07 · `hasCustomCreatorLayout`, `unresolvedTrimCount`, `successTrimCount` not memoized
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` ~L321–336
- **Problem:** Inline `.filter()` and `Object.keys()` over memoized maps, but the derived
  scalars themselves are not memoized, so they re-run every render.
- **Fix:** Wrap all three in `useMemo` with `[activeOutfitCanvasLayouts, activeOutfitCanvasTrims, activeOutfitCanvasTrimStatuses, selectedOutfitItems]`.
- [x] **Done**

---

#### O-08 · `availableCategories` `.filter()` runs every render
- **File:** `src/components/wardrobe/OutfitCreatorPanel.tsx` ~L397
- **Problem:** `categories.filter(cat => !selectedCategoryIds?.has(cat.id))` is called
  on every render without memoization.
- **Fix:** `const availableCategories = useMemo(() => categories.filter(...), [categories, selectedCategoryIds]);`
- [x] **Done**

---

#### O-09 · Three near-identical pruning effects — consolidate into one
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` L55–92
- **Problem:** Three separate `useEffect` calls each build a `Set` from `selectedOutfitItems`
  and prune one map. Same pattern, same deps, three renders.
- **Fix:** Merge into a single effect that prunes all three maps (and the ref — see O-02)
  in one pass with one `Set` construction.
- [x] **Done**

---

### P3 — Code Quality / Leaky Abstraction

#### O-10 · `handleInfoPress` not memoized
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` ~L308
- **Problem:** Plain function in hook body. Inconsistent with the rest of the hook.
  Any child that wraps it in an effect or uses reference equality will see a new function
  every render.
- **Fix:** `const handleInfoPress = useCallback((option) => Alert.alert(option.title, option.description), []);`
- [x] **Done**

---

#### O-11 · `getShareableUri` leaked from `useHeadshotImageActions`
- **File:** `src/hooks/headshot/useHeadshotImageActions.ts` ~L131
- **Problem:** Private implementation detail of `handleSharePreview`. Exporting it widens
  the hook's public API unnecessarily and invites misuse.
- **Fix:** Remove from the return object. Keep it as a closure-only helper.
- [x] **Done**

---

#### O-12 · Direct Supabase call in `useActiveHeadshotActions`
- **File:** `src/hooks/headshot/useActiveHeadshotActions.ts` ~L25
- **Problem:** All other DB mutations go through lib helpers. This call couples the hook
  directly to the `user_settings` table schema and the `updated_at: new Date().toISOString()`
  pattern, making it harder to test or swap the data layer.
- **Fix:** Extract a `setActiveHeadshot(userId, headshotImageId)` helper in
  `src/lib/headshot/` (alongside the existing generation helpers) and call it here.
- [x] **Done**

---

#### O-13 · `useCanvasLayout` fetch effect suppresses stale dep with eslint-disable
- **File:** `src/hooks/wardrobe/useCanvasLayout.ts` ~L234
- **Problem:** `outfitCanvasTrimStatuses` is read inside the effect to filter non-idle items
  but excluded from deps to avoid a loop. The status filter can be stale.
- **Fix:** Read `outfitCanvasTrimStatuses` inside the `setOutfitCanvasTrimStatuses` functional
  updater (or via a ref) so the effect doesn't need it as a dep.
- [x] **Done**

---

#### O-14 · Duplicate type imports in `useHairAndMakeup.ts`
- **File:** `src/hooks/headshot/useHairAndMakeup.ts` L16–17
- **Problem:** `import type { PresetCategory }` and `import type { PresetOption }` are two
  separate lines from the same module.
- **Fix:** Collapse into `import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';`
- [x] **Done**

---

#### O-15 · Mount animation effect has misleading deps
- **File:** `src/components/wardrobe/OutfitCreatorPanel.tsx` ~L390
- **Problem:** `useEffect(() => { Animated.parallel([...]).start(); }, [mountAnim, opacityAnim])`.
  Both refs are stable — listing them implies reactivity that doesn't exist.
- **Fix:** Change deps array to `[]`.
- [x] **Done**

---

#### O-16 · `object` style prop types in `PanelItemCard` / `PanelCategoryCard`
- **File:** `src/components/wardrobe/OutfitCreatorPanel.tsx` ~L252–305
- **Problem:** Props typed as `object` lose StyleSheet type safety.
- **Fix:** Use `StyleProp<ViewStyle>` / `StyleProp<ImageStyle>` from `react-native`.
- [x] **Done**

---

#### O-17 · Navigation direction labels semantically ambiguous
- **File:** `src/hooks/headshot/useVariationNavigation.ts` ~L81
- **Problem:** `'back'` does `index + 1` and `'forward'` does `index - 1`. Only correct if
  the array is newest-first. This assumption is undocumented and the names are confusing.
- **Fix:** Add a comment confirming the array order, or rename to `'older'`/`'newer'`.
- [x] **Done**

---

#### O-18 · `editModalVisible` state and stale comment can be moved back into `MirrorTabContent`
- **File:** `app/hair-and-make-up.tsx` ~L111–115 and `src/components/headshots/MirrorTabContent.tsx`
- **Problem:** `editModalVisible`, `setEditModalVisible`, and `handleCloseEditModal` were
  lifted to the screen so that `handleOpenCategoryEditor` (called from `DrawModeInline`) could
  open the modal from outside `MirrorTabContent`. That prop (`onOpenCategoryEditor`) has since
  been removed from `DrawModeInline` entirely. The lifting reason is now gone, but the state
  and the three props (`editModalVisible`, `setEditModalVisible`, `onEditModalClose`) remain
  elevated to the screen unnecessarily. A stale comment also references the deleted function.
- **Fix:**
  1. Remove `editModalVisible`, `setEditModalVisible`, `handleCloseEditModal`, and the stale
     comment from the screen.
  2. Remove the three corresponding props (`editModalVisible`, `setEditModalVisible`,
     `onEditModalClose`) from `MirrorTabContent`'s interface and destructuring.
  3. Restore `const [editModalVisible, setEditModalVisible] = React.useState(false)` as
     internal state inside `MirrorTabContent` (as it was originally).
  4. Restore the `handleCloseEditModal` callback as a simple `setEditModalVisible(false)`
     inside `MirrorTabContent`, passed directly to `EditTabModal`'s `onClose`.
- [x] **Done**

---

## How to resume in a new chat

1. Point Claude at this file: "Read `OPTIMISATION_PLAN.md` in the project root."
2. Give context: "We're working on `Full-Stylist-preview`, branch `int/preview`.
   The Plan A/B/C refactor is done. Start on the next unchecked item in the optimisation plan."
3. Work through items in P0 → P1 → P2 → P3 order.
4. Check off `[ ]` → `[x]` as each item is completed.
