# Sweep 1B - Hook Complexity and Duplication Audit

Scope: 12 largest hooks listed in `CODEX_TASK_CURRENT.md`, plus duplication skim of 9 smaller hooks.

## 1) `src/hooks/wardrobe/useWardrobeItemDetail.ts`

### A. Responsibilities
- Loads core detail data (item/category/images/attributes/tags) via composed data hook (`useWardrobeItemData`) and exposes transformed display state (`displayImagesOrdered`) (`lines 95-100, 546-569`).
- Orchestrates 5 AI job channels (product shot, auto-tag, batch, render, generate) with separate polling configs and state transitions (`lines 114-275`).
- Manages periodic fallback refresh intervals for images/attributes (`lines 101-113`, plus starts/stops across `lines 122-126, 139-143, 157-164, 182-183, 259-272, 457-458, 513-514`).
- Handles initial fast-path cache restore and writes (image/title/description/job metadata) (`lines 366-404`, `229-241`).
- Performs feedback status hydration for latest succeeded job (`lines 375-395`, `466-487`).
- Runs initial active/recent job detection and recovery flow from multiple sources (`lines 407-516`).
- Over-responsible: **Yes** (6+ distinct responsibilities).

### B. Split opportunities
- `useWardrobeItemJobOrchestrator(itemId, userId, refreshFns)`
  - Own: active/recent job detection, all polling setup/start/stop, `isGeneratingProductShot`, `generationFailed`, retry logic.
- `useWardrobeItemInitialCache(itemId, userId)`
  - Own: `getInitialItemData`/`setInitialItemData`, feedback-at hydration, `initial*` state.
- `useWardrobeItemFeedbackStatus(jobId)`
  - Own: `getAIJob` -> `getAIJobNoStore` -> `checkFeedbackExistsForJob` fallback chain.
- Keep `useWardrobeItemDetail` as composition boundary only.

### C. Cleanup issues
- Large async load chain in main effect has no cancellation guard before state writes (`lines 407-523`). Risk: stale writes/state update after unmount or after `itemId` changes.
- Nested async feedback calls (`getAIJob`, `getAIJobNoStore`, `checkFeedbackExistsForJob`) also lack cancellation checks (`lines 375-395`, `474-486`). Same stale-state risk.
- Minor dependency risk: effect at `lines 536-544` uses `stopPeriodicImageRefresh` but does not list it in deps. If callback identity ever changes, effect can capture stale function.

### D. Duplication across hooks
- Multi-step AI job orchestration (create/trigger/poll/handle success/failure) duplicates patterns in:
  - `src/hooks/wardrobe/useAddWardrobeItem.ts`
  - `src/hooks/outfits/useOutfitGeneration.ts`
  - `src/hooks/outfits/useOutfitView.ts`
  - `src/hooks/outfits/useOutfitEditorActions.ts`
- Interval fallback refresh logic mirrors `src/hooks/wardrobe/usePeriodicRefresh.ts` and partially overlaps with manual polling in `src/hooks/wardrobe/useWardrobeItemEdit.ts`.
- Base64 fast-path cache pattern mirrors outfit cover cache in outfit hooks.

### E. Memoization gaps
- `retryGeneration` is recreated each render (`lines 280-300`) and returned to consumers (`line 558`); should be `useCallback`.
- Multiple inline callbacks inside poller configs (`lines 115-275`) recreate every render; refs avoid restart effects, but object churn is still high.

---

## 2) `src/hooks/outfits/useOutfitGeneration.ts`

### A. Responsibilities
- Owns generation state and modal/progress UX (`lines 65-79, 532-546`).
- Coordinates reveal animation + description polling lifecycles (`lines 80-95, 398-401, 419`).
- Saves outfit and gathers settings (`lines 123-163`).
- Builds/obtains stacked grid image, including storage/public URL handling (`lines 176-300`).
- Creates and updates session variation records (`lines 336-360, 485-495, 505-507`).
- Creates/triggers/polls AI job and handles terminal states (`lines 362-447, 410-417`).
- Writes initial cover cache for instant first paint (`lines 460-469`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useOutfitGenerationUiState()`
  - Own: modal visibility/phase/items/progress/messages.
- `useOutfitGridPreparation(userId, backgroundGrid)`
  - Own: item image resolution, top-image selection, grid upload fallback.
- `useOutfitRenderJob(sessionContext)`
  - Own: job create/trigger/poll, variation status transitions, final result mapping.
- `useOutfitDescriptionFlow(outfitId)`
  - Own: description polling + message drip + stop/cleanup.

### C. Cleanup issues
- `generateOutfit` is a long async chain without mounted/cancel guards (`lines 97-515`). Risk: state updates after unmount and stale transitions.
- No unmount cleanup effect for in-flight reveal/polling subs. `stopAll()` is invoked in flow paths but not guaranteed on component unmount.

### D. Duplication across hooks
- Near-duplicate render pipeline with `useOutfitEditorActions` (save, map selected payload, trigger job, poll, cache base64).
- Job orchestration overlap with `useTryOnOutfit` (smaller-hook skim).
- Variation/session update pattern overlaps with `useOutfitSessionData` responsibilities.

### E. Memoization gaps
- `generateOutfit` deps include full hook objects (`revealAnimation`, `descriptionPolling`) (`line 516`), which may force callback recreation if object identities are unstable.
- `hasCustomLayout` is recomputed twice in same call path (`lines 278-281` and `305-308`). Could compute once per invocation.

---

## 3) `src/hooks/headshot/useHairAndMakeup.ts`

### A. Responsibilities
- Owns top-level tab/edit/category/view state (`lines 72-82`).
- Owns preview/base image/session-facing UI state (`lines 85-90`).
- Owns modal/lightbox/face menu/draw mode state (`lines 93-101`).
- Composes and wires many sub-hooks (preset/session/generation/navigation/actions/animation) (`lines 118-239`).
- Implements user actions (pick, undo, style, restore, template apply, share, preview/select) (`lines 259-405`).
- Exposes very wide aggregated API surface (`lines 409-527`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useHairMakeupViewState()`
  - Own: tab/category/modal/lightbox/face-menu/draw-mode UI state.
- `useHairMakeupPreviewActions(...)`
  - Own: camera/library undo/style/restore/select-preview actions.
- `useHairMakeupShareActions(...)`
  - Own: `handleShareToFeed`, feed posting, share guard rails.
- Keep this hook as a thin composition adapter.

### C. Cleanup issues
- Async handlers (`handleStylePress` at `lines 279-311`, `handleShareToFeed` at `334-356`) do not guard unmount. Risk: setState after navigation/unmount during awaited calls.
- No major timer/subscription leaks identified.

### D. Duplication across hooks
- Uploaded-image -> persist -> user settings update flow is duplicated in `useHeadshotGeneration` (`lines 101-119` there).
- Variation navigation and preview mapping overlaps with `useOutfitSessionNavigation` pattern (smaller-hook skim).

### E. Memoization gaps
- Several returned handlers are not memoized (`handlePickCamera`, `handlePickLibrary`, `handleUndo`, `handleStylePress`, `handleRestoreSelfie`, `handleApplyTemplateSelections`, `handlePreviewPress`, `handleHeadshotSelect`; `lines 259-405`).
- Given the large returned object, unstable function identities can cause avoidable child rerenders.

---

## 4) `src/hooks/outfits/useOutfitEditorActions.ts`

### A. Responsibilities
- Manages item-picker state and category item loading (`lines 82-169`).
- Handles save flow and navigation decisions (`lines 173-195`).
- Runs render-generation pipeline (save, grid, job create/trigger/poll, result cache, navigate) (`lines 199-394`).
- Manages description polling + reveal animation state (`lines 95-110`, `303-312`, `322`).
- Handles archive flow (`lines 398-423`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useOutfitItemPickerActions(...)`
  - Own: open/select/remove picker actions and data loading.
- `useOutfitRenderFromEditor(...)`
  - Own: render pipeline and timing/cache concerns.
- `useOutfitArchiveAction(...)`
  - Own: archive confirmation and mutation.

### C. Cleanup issues
- No unmount cleanup effect for `revealAnimation`/`descriptionPolling`; if user leaves mid-render, these can continue and attempt state writes.
- `handleRender` async chain has no mounted guard (`lines 199-394`).

### D. Duplication across hooks
- Strong duplication with `useOutfitGeneration` for render orchestration and base64 cover caching.
- Similar create/trigger/poll pattern to `useTryOnOutfit`.
- Selected-item payload shaping duplicates `useOutfitGeneration` (`lines 237-257` vs generation `310-329`).

### E. Memoization gaps
- Core handlers are already `useCallback`-wrapped. No major callback memoization gaps found.

---

## 5) `src/hooks/headshot/useDrawModeLogic.ts`

### A. Responsibilities
- Manages draw/editor state (color settings, undo/redo availability, stroke flags) (`lines 75-93, 176-205`).
- Configures gestures and zoom/pan animated state (`lines 93-173`).
- Saves and loads drawing templates (storage + DB) (`lines 208-278`).
- Validates prompts and runs generate handoff with mask capture (`lines 288-356`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useDrawCanvasGestures(...)`
  - Own: gesture creation + zoom/pan shared values.
- `useDrawingTemplateActions(...)`
  - Own: save/list/load template logic.
- `useDrawGenerationGuardrails(...)`
  - Own: prompt completeness checks, `canGenerate`, run-generate flow.

### C. Cleanup issues
- `handleOpenTemplateBrowser` async path (`lines 256-263`) has no unmount cancellation guard.
- `runGenerate` toggles `capturing` around await (`lines 343-349`) without `try/finally`; if snapshot throws, `capturing` may remain true.

### D. Duplication across hooks
- Mask upload + AI generation inputs overlap with logic in `useHeadshotGeneration`.
- Prompt-to-generation gating patterns conceptually duplicate policy/guard logic in other generation hooks.

### E. Memoization gaps
- Many handlers returned to consumers are not `useCallback` (`handleUndo`, `handleRedo`, `handleClear`, `handleSave`, `handleOpenTemplateBrowser`, `handleLoadTemplate`, `handlePromptChange`, `handleGenerate`; `lines 188-341`).
- `allGestures` rebuilt each render (`lines 167-173`), which may churn gesture graph in children.

---

## 6) `src/hooks/wardrobe/useAddWardrobeItem.ts`

### A. Responsibilities
- Composes image selection/crop flow from sub-hook and exposes it (`lines 61-73, 359-373`).
- Handles item creation and initial upload (`lines 281-307`).
- Handles AI job creation/trigger/navigation to detail (`lines 319-350`).
- Handles AI completion outcomes for multiple job types (generate/batch/legacy), including cache writes and redirects (`lines 86-239`).
- Tracks progress/perf timeline instrumentation (`lines 20-21, 84, 274-279, 335-339`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useWardrobeAddSubmitFlow(...)`
  - Own: create item, trigger generate job, optimistic navigation.
- `useWardrobeAddJobCompletion(...)`
  - Own: `onComplete` branching by job type, cache writes, redirects.
- Keep image/crop concerns in `useAddWardrobeImages` (already good separation).

### C. Cleanup issues
- Multiple `setTimeout` calls in `onComplete` are not tracked/cleared (`lines 188-192, 204-207, 211-214, 226-229`). Risk: late state updates/navigation after unmount.
- `onComplete` async side effects can outlive screen lifecycle without mounted checks.

### D. Duplication across hooks
- Job create/trigger/poll and result handling overlaps `useWardrobeItemDetail` and outfit generation hooks.
- Base64 cache write pattern mirrors `setInitialCoverDataUri` usage in outfit hooks.

### E. Memoization gaps
- Major handlers are `useCallback`-wrapped (`onComplete`, `handleSubmit`).
- Remaining churn mostly from wide returned object; low/medium impact.

---

## 7) `src/hooks/wardrobe/useCanvasLayout.ts`

### A. Responsibilities
- Initializes and prunes layout/trim/status maps based on selected items (`lines 41-97`).
- Tracks trim status transitions (`pending/success/failed`) (`lines 100-131, 153-229`).
- Fetches trim metadata with in-flight guards and abort support (`lines 138-241`).
- Exposes z-order and layout update handlers (`lines 245-290`).
- Computes active derived maps/counters (`lines 294-356`).
- Over-responsible: **Yes** (but cohesive domain).

### B. Split opportunities
- `useCanvasTrimMetadata(...)`
  - Own: trim fetch/in-flight/status lifecycle (`lines 138-241`).
- `useCanvasLayoutState(...)`
  - Own: default layout init, prune, z-index handlers.
- Current cohesion is acceptable; split is optional, not urgent.

### C. Cleanup issues
- Cleanup is generally well handled: `AbortController` + cancel flag + in-flight ref cleanup (`lines 159-160`, `236-239`).
- No significant timer/listener leak found.

### D. Duplication across hooks
- Selected-item image prioritization and sort logic (`product_shot` first, then `sort_order`) resembles outfit generation image-selection logic.

### E. Memoization gaps
- Good use of `useMemo` and `useCallback`; no major memoization gaps identified.

---

## 8) `src/hooks/social/useFeed.ts`

### A. Responsibilities
- Loads feed and optional user filtering (`lines 184-208`).
- Loads engagement/repost/follow data (`lines 223-274`, plus helper `lines 84-169`).
- Loads entity-specific imagery for outfit/lookbook/headshot entries (`lines 275-346`).
- Manages refresh/loading state and exposed caches (`lines 176-183, 354-372`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useFeedItems(userId, filter, limit)`
  - Own: base feed retrieval/filtering.
- `useFeedEngagement(postIds, userId)`
  - Own: engagement/reposts/follows loading and composition.
- `useFeedEntityImageCache(filteredFeed)`
  - Own: outfit/lookbook/headshot URL resolution.

### C. Cleanup issues
- `loadFeed` has no abort/mounted guard (`lines 184-352`). Rapid filter/user changes can race and commit stale data.
- `useEffect` triggers async load on dependency change (`lines 358-360`) without cancellation.

### D. Duplication across hooks
- `batchGetOutfitCoverImages` is duplicated almost verbatim in `src/hooks/social/useUserProfile.ts` (`useFeed lines 43-81`, `useUserProfile lines 33-71`).
- Similar image-map hydration logic also appears in lookbook/detail hooks.

### E. Memoization gaps
- `loadFeed` and `refresh` are recreated each render (`lines 184, 354-356`); `refresh` is returned and may trigger downstream rerenders.

---

## 9) `src/hooks/lookbooks/useLookbookDetailActions.ts`

### A. Responsibilities
- Manages lookbook edit modal state and save action (`lines 80-157`).
- Handles delete and publish actions (`lines 159-227`).
- Manages add-outfits modal data loading, selection, and commit (`lines 229-276`).
- Manages per-outfit menu actions and favorite toggles (`lines 278-323`).
- Handles slideshow open (`lines 325-328`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useLookbookEditActions(...)`
  - Own: edit/delete/publish flows.
- `useLookbookOutfitPicker(...)`
  - Own: `openAddOutfitsModal`, `selectedNewOutfits`, image URL map, add/close handlers.
- `useLookbookOutfitMenuActions(...)`
  - Own: open/edit/remove/favorite/slideshow item actions.

### C. Cleanup issues
- `openAddOutfitsModal` async fetch path has no mounted guard (`lines 229-254`).
- `handleDelete` success path does not reset `deleting` before navigation (`lines 171-184`); low-risk state-stuck issue if navigation fails.

### D. Duplication across hooks
- `getUserOutfits` + cover-image URL hydration repeats patterns found in `useFeed` and `useUserProfile`.

### E. Memoization gaps
- Most handlers are `useCallback`-wrapped. No major memoization gaps beyond broad returned surface area.

---

## 10) `src/hooks/wardrobe/useFilters.ts`

### A. Responsibilities
- Owns filter state and update/clear mutations (`lines 84, 310-320`).
- Applies full filtering logic across columns, JSON attributes, tags, saved/favorites (`lines 87-181`).
- Computes available facet values from item corpus (`lines 185-290`).
- Computes active-filter boolean (`lines 293-307`).
- Over-responsible: **Yes** (algorithm + state + facet derivation).

### B. Split opportunities
- `useFilteredWardrobeItems(allItems, filters, maps)`
  - Own: predicate pipeline only.
- `useAvailableWardrobeFacets(allItems, entityAttributesMap, tagsMap)`
  - Own: availableColors/materials/sizes/seasons/brands/conditions/entity attrs/tags.
- Keep `useFilters` for state orchestration.

### C. Cleanup issues
- No timers, subscriptions, or async effects. No cleanup leak identified.

### D. Duplication across hooks
- JSON attribute normalization helper (`extractJsonbValues`) likely reusable in `src/utils/` for consistency across wardrobe filtering/search hooks.

### E. Memoization gaps
- `clearFilters` and `updateFilter` are not `useCallback` (`lines 310-320`).
- Facet derivation iterates `allItems` in many separate memos (`lines 185-290`); can be consolidated into one pass for large wardrobes.

---

## 11) `src/hooks/wardrobe/useWardrobeItemEdit.ts`

### A. Responsibilities
- Loads item, categories, attributes, and subcategories (`lines 143-223`).
- Owns full form/UI expansion state (`lines 60-76`).
- Manually polls for AI-completion signal (`lines 87-141`).
- Saves edits via direct Supabase update (`lines 226-266`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useWardrobeItemEditLoader(itemId, userId)`
  - Own: initialize/load logic and derived initial UI expansion.
- `useWardrobeItemGenerationStatus(itemId, userId)`
  - Own: AI completion polling and stop conditions.
- `useWardrobeItemSave(itemId, userId, formState)`
  - Own: update payload construction + mutation.

### C. Cleanup issues
- Timeout started in polling (`lines 135-140`) is not stored in ref and not cleared on unmount; minor timer leak and unmanaged lifecycle.
- Polling callback performs async requests and then state updates (`lines 92-129`) without mounted guard; in-flight callback can resolve after unmount.
- `initialize` async function called from effect (`lines 272-275`) has no cancellation guard.

### D. Duplication across hooks
- Manual AI completion polling duplicates broader polling/refresh patterns already abstracted in `usePeriodicRefresh` and `useWardrobeItemDetail`.
- Category/subcategory loading pattern overlaps other wardrobe edit/add flows.

### E. Memoization gaps
- `loadSubcategories`, `startPollingForAICompletion`, `initialize`, `saveItem`, and `refreshItem` are recreated every render and returned/used by effects.

---

## 12) `src/hooks/outfits/useOutfitView.ts`

### A. Responsibilities
- Loads outfit details and related item/image maps (`lines 75-88`, `166-274`).
- Detects active render jobs and starts polling (`lines 199-228`).
- Polls render job and maps completion -> UI/cache state (`lines 90-149`).
- Owns render timing trace/cached cover behavior (`lines 16-19`, `173-187`, `300`).
- Exposes archive action (`lines 151-158`).
- Over-responsible: **Yes**.

### B. Split opportunities
- `useOutfitRenderStatus(outfitId, userId, renderJobIdParam, traceParam)`
  - Own: active job detection + polling + generation state.
- `useOutfitViewData(outfitId)`
  - Own: getOutfit and wardrobe-item image-map loading.
- `useOutfitCoverFastPath(outfitId)`
  - Own: initial cache restore and feedback metadata state.

### C. Cleanup issues
- `startPollingForOutfitRender` cannot be canceled from effect cleanup and has no mounted guard (`lines 90-149`).
- Main `loadOutfitData` async path has no cancellation guard (`lines 166-288`).
- Effect lacks explicit cleanup for in-flight job polling/fetches (`lines 160-288`).

### D. Duplication across hooks
- Same create/trigger/poll/result cache shape as `useOutfitGeneration` and `useOutfitEditorActions` (minus job creation here).
- Fast-path base64 cache workflow mirrors wardrobe item detail flow.

### E. Memoization gaps
- `refreshOutfit` and `deleteOutfitAction` are recreated every render (`lines 75-88`, `151-158`) and returned (`lines 304-305`).

---

## Smaller-hook skim (duplication signals)

Reviewed:
- `src/hooks/outfits/useOutfitSessionData.ts`
- `src/hooks/outfits/useOutfitSessionNavigation.ts`
- `src/hooks/social/useTryOnOutfit.ts`
- `src/hooks/social/useUserProfile.ts`
- `src/hooks/profile/useAccountSettings.ts`
- `src/hooks/headshot/usePresetSelection.ts`
- `src/hooks/headshot/useHeadshotGeneration.ts`
- `src/hooks/wardrobe/useWardrobeCamera.ts`
- `src/hooks/wardrobe/usePeriodicRefresh.ts`

Notable duplication with main 12:
- `useTryOnOutfit` duplicates outfit render orchestration patterns from `useOutfitGeneration` and `useOutfitEditorActions` (job lifecycle and fallback UX).
- `useUserProfile` duplicates `batchGetOutfitCoverImages` helper from `useFeed` almost line-for-line.
- `useHeadshotGeneration` duplicates upload/save-selfie/update-settings flow found in `useHairAndMakeup` action path.
- `usePeriodicRefresh` centralizes interval logic that `useWardrobeItemEdit` still reimplements manually.

---

## Summary: Cross-Hook Duplication Patterns

1. **Outfit render orchestration duplicated in 3+ hooks**
- `src/hooks/outfits/useOutfitGeneration.ts` (`lines 362-447`)
- `src/hooks/outfits/useOutfitEditorActions.ts` (`lines 274-337`, `314-337`)
- `src/hooks/social/useTryOnOutfit.ts` (`lines 204-263`)
- Shared pattern: prepare selected payload -> create job -> trigger -> poll -> map success/failure -> navigate/update cache.

2. **Cover/image fast-path cache logic repeated**
- `src/hooks/outfits/useOutfitGeneration.ts` (`460-469`)
- `src/hooks/outfits/useOutfitEditorActions.ts` (`349-364`)
- `src/hooks/outfits/useOutfitView.ts` (`179-187`, `119-133`)
- `src/hooks/wardrobe/useAddWardrobeItem.ts` (`109-119`, `160-168`)
- `src/hooks/wardrobe/useWardrobeItemDetail.ts` (`366-374`, `233-241`)

3. **Feed/profile image URL hydration duplicated**
- `src/hooks/social/useFeed.ts` helper `batchGetOutfitCoverImages` (`43-81`)
- `src/hooks/social/useUserProfile.ts` helper `batchGetOutfitCoverImages` (`33-71`)

4. **Polling/interval lifecycle patterns are fragmented**
- Rich poll orchestration: `useWardrobeItemDetail`, `useOutfitView`
- Manual interval polling: `useWardrobeItemEdit`
- Interval helper abstraction: `usePeriodicRefresh`
- Result: inconsistent cleanup/cancel behavior.

5. **Selfie upload/persist state transition duplicated**
- `src/hooks/headshot/useHairAndMakeup.ts` (`279-299`)
- `src/hooks/headshot/useHeadshotGeneration.ts` (`101-119`)

---

## Summary: Top 5 Highest-Impact Actions

1. **Extract a shared outfit render job service/hook and migrate `useOutfitGeneration`, `useOutfitEditorActions`, and `useTryOnOutfit`.**
- Impact: Highest complexity reduction and bug-risk reduction (one job lifecycle implementation).
- Why: largest duplicated async pipeline across high-traffic flows.

2. **Add cancel/mounted guards to long async hooks (`useWardrobeItemDetail`, `useOutfitGeneration`, `useFeed`, `useOutfitView`, `useWardrobeItemEdit`).**
- Impact: High stability improvement (prevents stale writes/race regressions).
- Why: current async flows frequently update state after awaited calls without lifecycle guards.

3. **Consolidate image-cover URL helper(s) into shared utility and replace duplicates in social hooks.**
- Impact: Medium-high maintenance reduction.
- Why: `batchGetOutfitCoverImages` duplicated across `useFeed` and `useUserProfile`.

4. **Decompose orchestration-heavy mega hooks into composition-only parents (`useWardrobeItemDetail`, `useHairAndMakeup`, `useOutfitEditorActions`).**
- Impact: High readability/testability gain with moderate migration risk.
- Why: each currently owns 5-7 concerns.

5. **Standardize timer/poll cleanup and remove unmanaged timers (`useAddWardrobeItem` timeouts, `useWardrobeItemEdit` polling timeout).**
- Impact: Medium reliability gain; low-medium implementation risk.
- Why: unmanaged timers are an avoidable source of post-unmount updates and flaky behavior.
