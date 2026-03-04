# Sweep 1D Audit Report — Image Loading, Polling/Timers, and Resource Management

## Part 1: Image Loading Patterns

### 1.1 Findings Table (component/pattern)

| Pattern | Findings | Evidence | Risk |
|---|---|---|---|
| `expo-image` consistency | `expo-image` is used broadly, but at least one UI avatar still uses React Native `Image`. | `src/components/shared/layout/HeaderAvatarButton.tsx:7`, `src/components/shared/layout/HeaderAvatarButton.tsx:47` | Inconsistent cache/render behavior and duplicate image APIs.
| `cachePolicy` usage | Highly inconsistent. Only **18** image instances set `cachePolicy`, mostly `memory-disk`; many grid/list cards omit it. | Examples with cache: `src/components/social/DiscoverGrid.tsx:153`, `src/components/social/FeedItem.tsx:135`, `src/components/profile/ProfileHeader.tsx:68`; no cache in many grid cards e.g. `src/components/outfits/OutfitCard.tsx:59`, `src/components/lookbooks/OutfitGridSelector.tsx:43` | Cache misses and unnecessary re-fetches on scroll/navigation.
| `priority` usage | Only **2** usages found, both slideshow contexts. | `src/components/lookbooks/SlideshowModal.tsx:85`, `src/components/social/SlideshowSlide.tsx:24` | Above-the-fold feed/profile images are not prioritized consistently.
| `transition` usage | Only **1** usage found. | `src/components/shared/GenerationThumbnailStrip.tsx:175` | Inconsistent visual loading behavior and possible perceived jank.
| Placeholders for `expo-image` | No `expo-image` `placeholder` props found (blurhash/color/thumbnail), only conditional fallback views. | Global scan found 0 image `placeholder=` usages on `Image`/`ExpoImage` tags | Harder loading states; flashes/pop-in on slower networks.
| `contentFit` consistency | `contentFit` is common (**74** uses), mostly `cover`; but `contain`/`fill` are mixed by component type without a centralized rule. | `cover`: `src/components/social/FeedCard.tsx:52`; `contain`: `src/components/lookbooks/SlideshowModal.tsx:83`; `fill`: `src/components/wardrobe/CropEditor.tsx:268`, `src/components/wardrobe/OutfitCreatorCanvas.tsx:424` | Visual inconsistency and unexpected cropping/stretching.
| `contentPosition` usage | No `contentPosition` usage found. | Global scan count: 0 | Limited control for focal points on portrait/fashion imagery.
| `recyclingKey` in list contexts | No `recyclingKey` usage found (**0**). | Global scan count: 0 across components | Increased memory churn in long grids/feeds.
| URL sizing/transforms | Supabase `getPublicUrl` is used everywhere without transform options; no width/height/crop transforms detected. | Example list paths: `src/lib/images.ts:12`, `src/lib/wardrobe/images.ts:157`, `src/hooks/social/useFeed.ts:72`; transform usage count: 0 | Full-resolution assets loaded for thumbnails/grids => network and memory waste.
| Grid/list thumbnail strategy | Multiple grid/feed cells consume full public URLs with no explicit thumbnail derivation. | `src/components/social/DiscoverGrid.tsx:149-154`, `src/components/UserWardrobeScreen.tsx:198-203`, `src/components/outfits/OutfitCard.tsx:59` | Over-fetching bytes and decoding large images in scroll-heavy views.

### 1.2 Quantitative Summary

- `expo-image` imports: **61**
- React Native `Image` imports: **1**
- `cachePolicy` props: **18**
- `priority` props: **2**
- `transition` props: **1**
- `contentFit` props: **74**
- `contentPosition` props: **0**
- `recyclingKey` props: **0**
- `getPublicUrl(..., { transform })` usage: **0**

### 1.3 Recommended Standard Pattern (Image)

1. Use `expo-image` only for UI image rendering (replace residual RN `Image` usage).
2. Standardize by context:
   - Avatar/icon: `contentFit="cover"`, `cachePolicy="memory-disk"`, small transformed URL.
   - Grid thumbnail: transformed URL (`width`, `height`, `quality`), `cachePolicy="memory-disk"`, `recyclingKey={item.id}`.
   - Fullscreen/detail: `contentFit="contain"`, `priority="high"` only when on-screen.
3. Add lightweight placeholders (blurhash/color) for primary feeds and profile galleries.
4. Add a shared URL helper that emits transformed URLs by target size class (`thumb`, `card`, `full`).

---

## Part 2: Polling, Timers & Subscriptions

### 2.1 Timer/Poll Inventory (every instance found)

| File:line | Mechanism | Cleanup/Lifecycle Status | Risk |
|---|---|---|---|
| `src/components/headshots/ColorControlsPanel.tsx:87` | `setTimeout` (keyboard visibility nudge) | Cleared in effect cleanup at `:88` | Low |
| `src/components/headshots/HeadshotDrawingCanvas.native.tsx:108` | `setTimeout` via `Promise` sleep | No cancel path; short-lived per snapshot call | Low |
| `src/components/outfits/OutfitViewContent.tsx:168` | retry `setTimeout` after image error | No ref/cleanup on unmount; can fire `setState` after unmount | Medium |
| `src/components/shared/layout/KeyboardAwareScreen.tsx:94` | `setTimeout` | Cleared in cleanup at `:98` | Low |
| `src/components/shared/layout/KeyboardAwareScreen.tsx:95` | `setInterval` | Cleared in cleanup at `:99` | Low |
| `src/components/wardrobe/CategoryPills.tsx:90` | `setTimeout` | Untracked; no explicit clear | Low |
| `src/components/wardrobe/CategoryPills.tsx:130` | `setTimeout` | Untracked; no explicit clear | Low |
| `src/components/wardrobe/HeadshotSelectorModal.tsx:133` | `setTimeout` auto-close | Stored in ref and cleared on close/effect cleanup (`:123`, `:136`) | Low |
| `src/components/wardrobe/NavigationSlider.tsx:50` | `setTimeout` scroll align | Untracked; no explicit clear | Low |
| `src/contexts/NotificationsContext.tsx:95` | fallback `setInterval` polling | Cleared on cleanup at `:99` | Low |
| `src/hooks/ai/useAIJobPolling.ts:113` | polling `setInterval` | **Bug**: interval can be re-armed after `stopPolling()` completes first poll (`:111-113`) | **High** |
| `src/hooks/calendar/useCalendarEntries.ts:61` | retry backoff `setTimeout` via Promise | Not cancellable; guarded by mounted check after await | Medium |
| `src/hooks/calendar/useCalendarEntries.ts:135` | per-request timeout in `Promise.race` | No `clearTimeout`; orphan timeout promises possible | Low |
| `src/hooks/lookbooks/useSlideshow.ts:109` | autoplay `setInterval` | Cleared in cleanup (`:115`) and close path (`:66`) | Low |
| `src/hooks/outfits/useBackgroundGridGenerator.ts:163` | debounce `setTimeout` | Cleared in cleanup (`:183`) and reset paths (`:144`, `:159`) | Low |
| `src/hooks/outfits/useItemRevealAnimation.ts:51` | reveal `setInterval` | Cleared by `stop()` | Low |
| `src/hooks/outfits/useItemRevealAnimation.ts:64` | delayed phase-change `setTimeout` | Untracked; not cancelled in `stop()` | Medium |
| `src/hooks/outfits/useOutfitActions.ts:114` | delayed alert `setTimeout` | Untracked one-shot | Low |
| `src/hooks/outfits/useOutfitFeedScroll.ts:29` | retry `setTimeout` | Stored in ref and cleared on unmount (`:93`) | Low |
| `src/hooks/outfits/useOutfitsFeedOrchestration.tsx:144` | retry `setTimeout` | Stored in ref and cleared on unmount (`:135`) | Low |
| `src/hooks/profile/useProfileImages.ts:98` | `Promise.race` timeout | Not cancellable | Low |
| `src/hooks/profile/useProfileImages.ts:120` | `Promise.race` timeout | Not cancellable | Low |
| `src/hooks/social/useFeedSlideshow.ts:105` | autoplay `setInterval` | Cleared in cleanup (`:111`) and close path (`:63`) | Low |
| `src/hooks/useSearch.ts:135` | debounce `setTimeout` | Cleared in cleanup (`:139`) | Low |
| `src/hooks/wardrobe/useAddWardrobeItem.ts:188` | redirect delay `setTimeout` | Untracked; no cleanup | **High** |
| `src/hooks/wardrobe/useAddWardrobeItem.ts:204` | redirect delay `setTimeout` | Untracked; no cleanup | **High** |
| `src/hooks/wardrobe/useAddWardrobeItem.ts:211` | redirect delay `setTimeout` | Untracked; no cleanup | **High** |
| `src/hooks/wardrobe/useAddWardrobeItem.ts:226` | redirect delay `setTimeout` | Untracked; no cleanup | **High** |
| `src/hooks/wardrobe/usePeriodicRefresh.ts:38` | image refresh `setInterval` | Stored/cleared via refs and stop helpers | Low |
| `src/hooks/wardrobe/usePeriodicRefresh.ts:43` | image refresh timeout `setTimeout` | Stored/cleared via refs and stop helpers | Low |
| `src/hooks/wardrobe/usePeriodicRefresh.ts:72` | attribute refresh `setInterval` | Stored/cleared via refs and stop helpers | Low |
| `src/hooks/wardrobe/usePeriodicRefresh.ts:76` | attribute refresh timeout `setTimeout` | Stored/cleared via refs and stop helpers | Low |
| `src/hooks/wardrobe/useWardrobeItemEdit.ts:92` | AI completion `setInterval` | Interval ref cleared on completion/unmount | Medium |
| `src/hooks/wardrobe/useWardrobeItemEdit.ts:135` | hard stop `setTimeout` | **Not stored**; cannot be cleared on unmount | **High** |
| `src/hooks/wardrobe/useWardrobeItemNavigation.ts:68` | delayed scroll `setTimeout` | Untracked one-shot | Low |
| `src/hooks/wardrobe/useWardrobeItemPolling.ts:66` | poll timeout `setTimeout` | Stored and cleared in `stopPolling()` | Low |
| `src/hooks/wardrobe/useWardrobeItemPolling.ts:75` | polling `setInterval` | Stored and cleared in `stopPolling()` + unmount cleanup | Low |
| `src/lib/ai-jobs/polling.ts:54/75/117/128/248` | sleep/backoff `setTimeout` in async loops | No external cancellation token; waits continue if caller abandoned | Medium |
| `src/lib/outfits/canvasTrim.ts:38` | request timeout `setTimeout` | Cleared in `finally` (`:67`), supports abort chaining (`:44`, `:68`) | Low |
| `src/lib/outfits/outfitDescriptionMessages.ts:87` | recursive drip `setTimeout` | No cancellation handle returned | **High** |
| `src/lib/outfits/outfitDescriptionMessages.ts:98` | initial drip `setTimeout` | No cancellation handle returned | **High** |
| `src/lib/outfits/useDescriptionPolling.ts:61` | description poll `setInterval` | Cleared on success/timeout/unmount (`:66`, `:85`, `:52`) | Low |

### 2.2 Additional Poll/Async Lifecycle Findings (non-`setInterval` calls)

| File | Finding | Evidence | Risk |
|---|---|---|---|
| `src/hooks/outfits/useOutfitView.ts` | `pollAIJobWithFinalCheck` run has no cancellation on unmount; async chain updates state after awaits. | `:90-149`, effect start at `:160-288` with no cleanup return for in-flight async | High |
| `src/hooks/outfits/useOutfitGeneration.ts` | No unmount cleanup effect for `stopAll`; timers inside sub-hooks can continue until async flow resolves. | `stopAll` at `:91-95`, no `useEffect` unmount cleanup | High |
| `src/hooks/outfits/useOutfitEditorActions.ts` | Same pattern as above (`stopAll` exists, no unmount cleanup effect). | `stopAll` at `:106-109`, no unmount cleanup effect in file | High |
| `src/hooks/wardrobe/useWardrobeItemDetail.ts` | Large async effect chain with nested promises (`then`) and no cancellation guard around state updates. | main load effect `:349-533` | High |
| `src/hooks/social/useFeed.ts` | `loadFeed()` can race on rapid filter/user changes; no abort/cancelled guard. | `loadFeed` `:184-352`, effect trigger `:358-360` | Medium |
| `src/hooks/lookbooks/useLookbookDetailActions.ts` | async modal loading updates state without mounted guard. | `openAddOutfitsModal` `:229-254` | Medium |
| `src/hooks/calendar/useCalendarEntries.ts` | passes `isMounted.current` boolean into async helper, so unmount later does not prevent state writes (`true` snapshot). | call `:93`, helper signature `loadOutfitImages(..., isMounted: boolean)` at `:118` | High |
| `src/hooks/profile/useProfileImages.ts` | fire-and-forget async bodyshot sync/poll can update state and alert after unmount. | background IIFE `:158-223` | Medium |

### 2.3 Subscriptions/Realtime Lifecycle

| File | Subscription | Unsubscribe status | Risk |
|---|---|---|---|
| `src/contexts/NotificationsContext.tsx` | notification realtime + fallback interval | Realtime cleanup at `:78-80`, interval cleanup at `:99` | Low |
| `src/lib/notifications/realtime.ts` | Supabase channel per user | Explicit `removeChannel` in returned cleanup (`:50-53`) and replace-existing behavior (`:14-18`) | Low |
| `src/contexts/AuthContext.tsx` | auth state subscription | `subscription.unsubscribe()` on cleanup (`:56-59`) | Low |
| `src/hooks/wardrobe/useWardrobeItemNavigation.ts` | `Dimensions` listener | removed in cleanup (`:50-52`) | Low |
| `src/hooks/ui/useKeyboardInsets.ts` | keyboard listeners | removed in cleanup (`:53-57`) | Low |

---

## Part 3: Resource Management

### 3.1 AbortController Coverage

| Area | Uses Abort? | Evidence | Gap |
|---|---|---|---|
| Canvas trim Netlify call | Yes, explicit `AbortController`, timeout, external signal chaining | `src/lib/outfits/canvasTrim.ts:37-69` | Good implementation.
| Canvas trim hook caller | Yes, controller created and aborted on cleanup | `src/hooks/wardrobe/useCanvasLayout.ts:159-160`, `:236-239` | Good implementation.
| AI job trigger | Partial (`AbortSignal.timeout` only if available) | `src/lib/ai-jobs/execution.ts:86` | Not a reusable controller tied to component lifecycle.
| Most data hooks (`useFeed`, `useOutfitView`, `useLookbookDetailActions`, etc.) | No | No abort wiring in async effects/actions | In-flight requests continue across unmount/filter changes.

Additional metric scan:
- Direct `fetch(...)` calls: **15**
- `new AbortController(...)` constructions: **2**
- `fetch` calls with `signal`: **2**

### 3.2 File System / Temp Files

| Finding | Evidence | Risk |
|---|---|---|
| Share flow downloads remote image into cache but does not delete it after sharing. | `src/hooks/headshot/useHeadshotImageActions.ts:54-58`, used by `:61-66` | Cache growth over time (unbounded temp share files).
| Native base64 upload flow creates temp file and deletes it on success path. | `src/lib/utils/image-helpers.ts:339-351` | Mostly safe; cleanup is not in `finally`, so exceptional paths can still leave files.
| No central temp-file sweeping strategy found. | only ad-hoc temp handling found in above files | Accumulation risk on long-lived installs.
| Web image processing uses object URLs without full revocation in one path. | `src/utils/imageProcessor.ts:210` creates object URL in `trimImageWhitespace` and does not revoke | Browser memory leak in repeated processing.

### 3.3 Console Logging Audit (`console.log|warn|error`)

Method used:
- `rg` over `src` (`*.ts,*.tsx,*.js,*.jsx`, excluding `*.backup.*`)
- Counted `console.log|warn|error`
- “Production-like” count excludes only lines containing `__DEV__` inline

Totals:
- Total occurrences: **337**
- Production-like occurrences: **332**

Top files by production-like count:

| Production-like / Total | File |
|---|---|
| 35 / 35 | `src/contexts/AuthContext.tsx` |
| 29 / 29 | `src/lib/utils/image-helpers.ts` |
| 17 / 17 | `src/hooks/profile/useImageGeneration.ts` |
| 15 / 15 | `src/lib/user/initialization.ts` |
| 9 / 9 | `src/hooks/outfits/useOutfitGeneration.ts` |
| 9 / 9 | `src/utils/clothing-grid.native.ts` |
| 9 / 9 | `src/utils/clothing-grid.js` |
| 8 / 13 | `src/hooks/wardrobe/useWardrobeItemDetail.ts` |
| 8 / 8 | `src/utils/imageProcessor.ts` |
| 8 / 8 | `src/lib/outfits/sessions.ts` |

High-noise examples to gate:
- Auth lifecycle logs in `src/contexts/AuthContext.tsx:26-217`
- Verbose upload/compression diagnostics in `src/lib/utils/image-helpers.ts:51-525`
- Repeated generation traces in `src/hooks/profile/useImageGeneration.ts:133-263`

---

## Summary: Top 10 Resource Issues (ranked)

1. **`useAIJobPolling` interval leak after completion** (battery/network waste)  
   Evidence: `src/hooks/ai/useAIJobPolling.ts:111-113`
2. **Uncancellable recursive message drip timeouts** (state updates after navigation/unmount)  
   Evidence: `src/lib/outfits/outfitDescriptionMessages.ts:87-98`
3. **`useOutfitView` polling + async load has no cancellation guards** (post-unmount updates, wasted polling)  
   Evidence: `src/hooks/outfits/useOutfitView.ts:90-149`, `:160-288`
4. **`useWardrobeItemDetail` long async chain without cancellation** (post-unmount state writes)  
   Evidence: `src/hooks/wardrobe/useWardrobeItemDetail.ts:349-533`
5. **`useCalendarEntries` mounted flag bug (boolean snapshot)** (state update after unmount)  
   Evidence: `src/hooks/calendar/useCalendarEntries.ts:93`, `:118-169`
6. **`useAddWardrobeItem` has four untracked navigation timeouts** (stale redirects/state updates)  
   Evidence: `src/hooks/wardrobe/useAddWardrobeItem.ts:188,204,211,226`
7. **`useWardrobeItemEdit` polling timeout not tracked/clearable** (orphan timeout)  
   Evidence: `src/hooks/wardrobe/useWardrobeItemEdit.ts:135-140`
8. **No image URL transforms for thumbnails/grids** (network + decode overhead)  
   Evidence: transform usage count 0; examples `src/lib/images.ts:12`, `src/lib/wardrobe/images.ts:157`
9. **Share-download temp files are not cleaned** (cache growth)  
   Evidence: `src/hooks/headshot/useHeadshotImageActions.ts:54-58`
10. **Logging volume in production-like paths is very high** (DX noise, runtime overhead, potential data leakage in logs)  
   Evidence: **332** production-like `console.log|warn|error` occurrences; top files listed above.

---

## Summary: Recommended Standards

### A. Image Loading Standard

1. Use `expo-image` exclusively for rendered images.
2. Enforce per-context defaults:
   - Thumbnail/grid: transformed URL + `cachePolicy="memory-disk"` + `contentFit="cover"` + `recyclingKey`.
   - Hero/detail: `contentFit="contain"`, optional `priority="high"` only when visible.
   - Avatars: transformed square URL + `contentFit="cover"`.
3. Introduce shared URL builder for Supabase transforms (`thumb/card/full`) and ban direct raw `getPublicUrl` in list rendering paths.
4. Add placeholder strategy (blurhash or color) for feed/profile/gallery surfaces.

### B. Polling/Timer Standard

1. Every timer must be ref-tracked and cleared in cleanup.
2. Utility functions that schedule recursive `setTimeout` must return a cancellation handle.
3. Polling hooks must include:
   - single active poller invariant,
   - unmount cancellation,
   - stale-job guard,
   - explicit terminal state that prevents re-arming intervals.
4. Avoid `Promise.race(setTimeout)` without cancel/cleanup wrappers for long-running hooks.

### C. Async Cleanup Standard

1. For async effects, require one of:
   - `AbortController` + propagated `signal`, or
   - explicit `cancelled/isMounted` ref checked before all `setState`.
2. For “fire-and-forget” background work started from hooks, require unmount guard before state updates and UI side effects.
3. For temp files (`downloadAsync`, temporary uploads), enforce `try/finally` cleanup or periodic cache sweep.
4. Gate non-essential logs with `__DEV__` or a feature-flag logger and keep production logs to error-level minimum.

