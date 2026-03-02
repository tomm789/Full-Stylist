# Sweep 1A Audit: Route File Bloat & Component Coupling

## 1) `app/(tabs)/wardrobe.tsx` (1043 lines)

### A. What should STAY in the route file
- Screen-level composition of header/search/grid/modals (`app/(tabs)/wardrobe.tsx:682-1042`).
- Route navigation wiring (`router.push`) for item detail/edit, outfit view, profile, and hair-and-make-up transitions (`app/(tabs)/wardrobe.tsx:593-600`, `889-890`, `928`, `1024`).
- Screen ownership of top-level mode/state toggles that drive layout composition (`activeTab`, `outfitCreatorMode`, `searchOverlayOpen`, `showItemModal`) (`app/(tabs)/wardrobe.tsx:104-131`).

### B. What should EXTRACT to custom hooks (under `src/hooks/`)
- Extract outfit selection/conflict/draft decision flow into a dedicated hook: `handleOutfitSelectionAttempt` is a large business-logic block with branching alert flows (`app/(tabs)/wardrobe.tsx:488-559`).
- Extract camera entry/exit navigation behavior into a hook that composes `useWardrobeCamera`: current platform-specific flow and tab-bar side effects are route-local (`app/(tabs)/wardrobe.tsx:390-425`).
- Extract creator reset/session teardown into a hook method (`app/(tabs)/wardrobe.tsx:450-463`), because it mutates canvas, filters, session data, navigation preview, and local state together.
- Extract generation submission orchestration (`ensureSession`, perf timing, generation call, result handling) from `handleGenerateOutfit` (`app/(tabs)/wardrobe.tsx:561-588`).
- Extract dense derived-state block (creator panel sizing, preview strip padding, dimmed-item calculation) into a memoized screen hook (`app/(tabs)/wardrobe.tsx:615-678`).
- Already extracted and should remain as-is:
- `useOutfitDraft` (`src/hooks/wardrobe/useOutfitDraft.ts:26-95`)
- `useBodyShotGeneration` (`src/hooks/wardrobe/useBodyShotGeneration.ts:23-253`)
- `useCanvasLayout` (`src/hooks/wardrobe/useCanvasLayout.ts:26+`)
- `useWardrobeTutorial` (`src/hooks/wardrobe/useWardrobeTutorial.ts:20-85`)
- `useWardrobeItemActions` (`src/hooks/wardrobe/useWardrobeItemActions.ts:19-89`)
- `useWardrobeItems` (`src/hooks/wardrobe/useWardrobeItems.ts:34-144`)
- `useFilters` (`src/hooks/wardrobe/useFilters.ts:78+`)

### C. What should EXTRACT to components (under `src/components/`)
- Session preview + thumbnail/action strip is a large standalone UI section (`app/(tabs)/wardrobe.tsx:865-954`).
- Filter-and-category control row below the header can be isolated (`app/(tabs)/wardrobe.tsx:733-765`).
- Modal stack wrapper for item detail/options/headshot selector/camera overlay can be split into a presentation component (`app/(tabs)/wardrobe.tsx:843-1040`).

### D. Dependencies & coupling
- Hook/context imports are broad: auth, search, floating tab bar, outfits session hooks, wardrobe hooks, camera hook, and theme contexts (`app/(tabs)/wardrobe.tsx:28-90`).
- Rendered component surface is also broad: wardrobe components, shared components, search components, camera overlay, social-following screen (`app/(tabs)/wardrobe.tsx:46-69`, `781-1040`).
- Tight coupling concern: selection state (`selectedOutfitItems` + `selectedOutfitItemMap`) is tightly coupled with canvas state, draft state, and outfit session preview (`app/(tabs)/wardrobe.tsx:120-123`, `181-196`, `450-463`).
- Tight coupling concern: cross-screen draft recovery uses AsyncStorage sentinel + route push (`app/(tabs)/wardrobe.tsx:1020-1024`), which is fragile across future navigation changes.

### E. Risk assessment
- **Refactor difficulty: High**
- Tricky dependencies:
- Multi-system state reset (`canvas` + `sessionData` + `sessionNav` + local state) (`app/(tabs)/wardrobe.tsx:450-463`).
- Platform-specific camera behavior and permission flows (`app/(tabs)/wardrobe.tsx:390-414`).
- User-visible branching alerts for conflict/draft handling (`app/(tabs)/wardrobe.tsx:495-547`).

---

## 2) `app/(tabs)/outfits/index.tsx` (900 lines)

### A. What should STAY in the route file
- Primary tab/view composition and route-level navigation decisions (`app/(tabs)/outfits/index.tsx:620-900`).
- Screen-level wiring for routing to calendar, lookbooks, post feed, and outfit detail (`app/(tabs)/outfits/index.tsx:382-385`, `471`, `554`, `657`, `735`, `763-764`).
- Top-level orchestration that chooses which tab surface to render (`app/(tabs)/outfits/index.tsx:701-840`).

### B. What should EXTRACT to custom hooks (under `src/hooks/`)
- Move lookbook sorting-by-pin logic to lookbook hook layer (`app/(tabs)/outfits/index.tsx:179-187`).
- Move `handleOutfitPress` query/filter-summary string building into a navigation helper hook (`app/(tabs)/outfits/index.tsx:451-472`).
- Move refresh handlers (`onRefresh`, `onDiscoverRefresh`) into social/orchestration hook (`app/(tabs)/outfits/index.tsx:439-449`).
- Move tab-bar opacity/dim effects tied to selection mode/focus into a dedicated UI behavior hook (`app/(tabs)/outfits/index.tsx:116-120`, `149-155`).
- Already extracted and should be treated as existing architecture:
- `useOutfitsTabState` (`src/hooks/outfits/useOutfitsTabState.ts:25-87`)
- `useOutfitsFeedOrchestration` (`src/hooks/outfits/useOutfitsFeedOrchestration.tsx:56+`)
- `useOutfitsDerivedFilters` (`src/hooks/outfits/useOutfitsDerivedFilters.ts:22-124`)
- `useMyOutfitsRenderers` (`src/hooks/outfits/useMyOutfitsRenderers.tsx:24-100`)
- `useOutfitActions` (`src/hooks/outfits/useOutfitActions.ts:15-153`)
- `useOutfitsModalsState` (`src/hooks/outfits/useOutfitsModalsState.ts:89-249`)
- Lookbook selection/tabs/detail hooks (`src/hooks/lookbooks/useLookbookSelection.ts:12-198`, `src/hooks/lookbooks/useLookbookTabs.ts:13-52`, `src/hooks/lookbooks/useLookbooks.ts:23+`, `src/hooks/lookbooks/useSystemLookbooks.ts:31+`)

### C. What should EXTRACT to components (under `src/components/`)
- The lookbooks tab render block is large and self-contained (`app/(tabs)/outfits/index.tsx:701-770`).
- Explore/following social-tab branches are nearly parallel and can be consolidated into a dedicated tab component wrapper (`app/(tabs)/outfits/index.tsx:776-840`).
- Header search/tab pill config block can be extracted to reduce route noise (`app/(tabs)/outfits/index.tsx:650-686`).

### D. Dependencies & coupling
- The screen imports from outfits hooks, social hooks, lookbook hooks, calendar hooks, and multiple UI contexts (`app/(tabs)/outfits/index.tsx:18-67`).
- Large prop contracts indicate tight coupling:
- `useOutfitsFeedOrchestration(...)` parameter surface (`app/(tabs)/outfits/index.tsx:366-400`)
- `OutfitsHeaderSection` prop surface (`app/(tabs)/outfits/index.tsx:622-687`)
- `useOutfitsModalsState(...)` prop surface (`app/(tabs)/outfits/index.tsx:523-587`)
- Architectural coupling concern: the feed orchestration hook imports a renderer component directly (`src/hooks/outfits/useOutfitsFeedOrchestration.tsx:4`), coupling hook and presentation layers.

### E. Risk assessment
- **Refactor difficulty: Medium-High**
- Tricky dependencies:
- Inter-hook contracts are broad; small signature changes ripple widely.
- Social feed behavior and modal state are split across many hooks and callbacks.

---

## 3) `app/hair-and-make-up.tsx` (545 lines)

### A. What should STAY in the route file
- Route-param entry behavior and route-level navigation (including wardrobe return behavior) (`app/hair-and-make-up.tsx:58-63`, `84-100`, `447-449`).
- High-level screen composition for tabs/mirror/grid/following/inspiration and modal placement (`app/hair-and-make-up.tsx:299-545`).

### B. What should EXTRACT to custom hooks (under `src/hooks/`)
- Extract URL-param synchronization behavior to a route-sync hook (`app/hair-and-make-up.tsx:84-100`).
- Extract headshot list derivation (selfie pinning + sort) (`app/hair-and-make-up.tsx:109-123`).
- Extract thumbnail derivation/selection logic (`app/hair-and-make-up.tsx:136-155`).
- Extract header/tab-bar visibility behavior and mirror-scroll threshold logic (`app/hair-and-make-up.tsx:203-239`).
- Extract edge-swipe enablement guard calculation (`app/hair-and-make-up.tsx:240-251`).
- Already extracted and should stay consolidated:
- `useHairAndMakeup` as the composition root (`src/hooks/headshot/useHairAndMakeup.ts:1-527`)
- Generation/session/navigation/image action sub-hooks (`src/hooks/headshot/useHeadshotGeneration.ts:59+`, `src/hooks/headshot/useHeadshotSessionData.ts:54+`, `src/hooks/headshot/useVariationNavigation.ts:26+`, `src/hooks/headshot/useHeadshotImageActions.ts`, `src/hooks/headshot/useActiveHeadshotActions.ts`)

### C. What should EXTRACT to components (under `src/components/`)
- Inline grid item renderer for headshots can be a reusable component (`app/hair-and-make-up.tsx:279-297`).
- Modal stack (policy/error/info/lightbox/share) can be composed in a dedicated modal container component (`app/hair-and-make-up.tsx:460-524`).
- `MirrorTabContent` adapter component can reduce huge prop passing (`app/hair-and-make-up.tsx:382-438`).

### D. Dependencies & coupling
- Route depends on a very large `state` API from `useHairAndMakeup` (`app/hair-and-make-up.tsx:56`, plus usage across most of file).
- Prop coupling is heavy for `MirrorTabContent` and `DrawModeInline` (`app/hair-and-make-up.tsx:364-438`).
- Tight coupling concern: wardrobe cross-flow is embedded in face-menu callback (`app/hair-and-make-up.tsx:445-449`).

### E. Risk assessment
- **Refactor difficulty: Medium**
- Tricky dependencies:
- Behavior correctness relies on combined effects: route params, tab bar visibility, and mirror/draw-mode transitions.
- Most business logic is already centralized, so remaining work is mostly UI adapter and route-sync extraction.

---

## 4) `app/calendar/day/[date].tsx` (510 lines)

### A. What should STAY in the route file
- Route date param handling and back-navigation fallback (`app/calendar/day/[date].tsx:61-71`, `245-255`).
- Screen-level composition of `CalendarDayHeader`, list/form views, and `CreatePresetModal` (`app/calendar/day/[date].tsx:273-405`).

### B. What should EXTRACT to custom hooks (under `src/hooks/`)
- Current in-route form state and handlers duplicate `useCalendarDayForm` responsibilities almost one-to-one (`app/calendar/day/[date].tsx:77-192` vs `src/hooks/calendar/useCalendarDayForm.ts:75-268`).
- Day-swipe animation + pan-responder logic should move to dedicated day-navigation hook (`app/calendar/day/[date].tsx:195-243`).
- `useFocusEffect` refresh behavior can be folded into day-entry/navigation hook to keep route thin (`app/calendar/day/[date].tsx:103-109`).
- Already extracted and should remain:
- `useDayEntries` CRUD/reorder/data refresh (`src/hooks/calendar/useDayEntries.ts:40-140`)
- `useSlotPresets` (`src/hooks/calendar/useSlotPresets.ts:20-72`)
- `useUserOutfits` (`src/hooks/calendar/useUserOutfits.ts:21-94`)
- `useCalendarScroll` exists but is not leveraged for day-level gesture/scroll state (`src/hooks/calendar/useCalendarScroll.ts:61-174`)

### C. What should EXTRACT to components (under `src/components/`)
- List-mode block (`entries.map`, move up/down, delete confirm) can be isolated (`app/calendar/day/[date].tsx:308-349`).
- Form-mode block with slot/status/notes/outfit picker can be isolated (`app/calendar/day/[date].tsx:351-390`).
- Form sub-header controls can be extracted (`app/calendar/day/[date].tsx:283-301`).

### D. Dependencies & coupling
- Route currently mixes multiple concerns: navigation state machine (`viewMode`), CRUD form state, animation/gesture, and rendering.
- Inline `Alert` callbacks inside list rendering couple business actions directly to presentational components (`app/calendar/day/[date].tsx:334-341`).
- No circular import issues observed; coupling is mostly intra-file complexity.

### E. Risk assessment
- **Refactor difficulty: Medium**
- Tricky dependencies:
- Preserve swipe animation behavior while editing-mode guards are active (`app/calendar/day/[date].tsx:197`, `230`, `234`).
- Ensure reorder + optimistic updates remain consistent after extraction.

---

## 5) `app/lookbooks/[id]/view.tsx` (479 lines)

### A. What should STAY in the route file
- Route-level lookbook loading integration and high-level screen composition (`app/lookbooks/[id]/view.tsx:54-57`, `270-410`).
- Route-specific navigation (`router.back`) and simple menu open/close state (`app/lookbooks/[id]/view.tsx:274`, `246-247`).

### B. What should EXTRACT to custom hooks (under `src/hooks/`)
- Extract social engagement state + loading + optimistic actions (`liked/saved/comments`) from route (`app/lookbooks/[id]/view.tsx:63-106`, `184-239`) into a lookbook engagement hook.
- Candidate path: extend generic social hook typing to allow `'lookbook'` (`src/hooks/outfits/useSocialEngagement.ts:22-47`), then consume from this route.
- Extract archive/restore confirmation + mutation logic from route (`app/lookbooks/[id]/view.tsx:108-182`) into a lookbook actions hook.
- Reuse/extend existing lookbook action hook where possible: `useLookbookDetailActions` already centralizes edit/delete/publish/menu behavior (`src/hooks/lookbooks/useLookbookDetailActions.ts:70+`).
- Remove or relocate dead/comment flow code:
- `commentText` and `submittingComment` state are not used by rendered UI (`app/lookbooks/[id]/view.tsx:70-71`).
- `handleSubmitComment` is defined but not invoked (`app/lookbooks/[id]/view.tsx:222-239`).

### C. What should EXTRACT to components (under `src/components/`)
- Social actions bar (like/comment/save controls + counts) (`app/lookbooks/[id]/view.tsx:347-383`).
- Dropdown menu action cluster (`app/lookbooks/[id]/view.tsx:284-324`).
- Optional: empty/loading/error state section can be standardized with a shared view-state component (`app/lookbooks/[id]/view.tsx:249-268`).

### D. Dependencies & coupling
- Route directly imports data hook plus raw engagement/lookbook library functions (`app/lookbooks/[id]/view.tsx:19-35`), mixing service and UI concerns.
- Existing hooks that already cover major chunks:
- `useLookbookDetail` for data load (`src/hooks/lookbooks/useLookbookDetail.ts:22-130`)
- `useSlideshow` for slideshow behavior (`src/hooks/lookbooks/useSlideshow.ts:29-138`)
- Tight coupling concern: this route owns all engagement state + optimistic UI state directly, which increases drift risk between server counts and UI.

### E. Risk assessment
- **Refactor difficulty: Medium-High**
- Tricky dependencies:
- Platform-specific confirm/alert behavior for archive/restore (`app/lookbooks/[id]/view.tsx:129-145`, `169-181`).
- Optimistic engagement updates without centralized reconciliation.

---

## Summary: Top 5 Highest-Impact Extractions (ranked by estimated lines saved × risk reduction)

1. **`wardrobe.tsx`: outfit-selection + generation orchestration hook extraction**
- Target: `handleOutfitSelectionAttempt`, `resetOutfitCreatorState`, `handleGenerateOutfit`, camera route flow (`app/(tabs)/wardrobe.tsx:390-588`).
- Impact: very high line reduction and major reduction of fragile cross-state coupling.

2. **`calendar/day/[date].tsx`: replace in-route form state with `useCalendarDayForm` + add day-swipe hook**
- Target: form handlers/state + swipe logic (`app/calendar/day/[date].tsx:77-243`).
- Impact: high line reduction with clear reuse of already-existing hook code (`src/hooks/calendar/useCalendarDayForm.ts:75-268`).

3. **`lookbooks/[id]/view.tsx`: extract lookbook engagement/archive actions**
- Target: social state/actions + archive/restore flows (`app/lookbooks/[id]/view.tsx:63-239`).
- Impact: high risk reduction by centralizing optimistic engagement and platform confirmation logic.

4. **`outfits/index.tsx`: split lookbooks/social tab render branches into dedicated components**
- Target: render branches (`app/(tabs)/outfits/index.tsx:701-840`) and query-builder handler (`451-472`).
- Impact: high readability gain and lower prop-surface complexity; medium risk reduction.

5. **`hair-and-make-up.tsx`: extract route-sync + mirror/header behavior + prop adapter**
- Target: URL/effect sync and mirror-header logic (`app/hair-and-make-up.tsx:84-251`) plus `MirrorTabContent` prop adapter (`382-438`).
- Impact: moderate line reduction with meaningful reduction in prop churn and side-effect scattering.
