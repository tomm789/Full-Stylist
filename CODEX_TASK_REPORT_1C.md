# Sweep 1C — Re-render & Memoization Audit (Component Layer)

## Part 1: List Rendering

| Component | Evidence | `renderItem` wrapped in `useCallback`? | Row component memoized? | Virtualization tuned (`initialNumToRender` / `maxToRenderPerBatch` / `windowSize`)? | `getItemLayout` where predictable? | Handler stability | Findings |
|---|---|---|---|---|---|---|---|
| `src/components/wardrobe/ItemGrid.tsx` | `renderItem` at 58; `FlatList` at 98-113; inline handlers at 73-77 | No | Yes (`ItemCard` is memoized in `src/components/wardrobe/ItemCard.tsx:134`) | No | No | Unstable closures per item (`onPress`, `onLongPress`, `onFavoritePress`) | Good row memoization, but list itself has no virtualization tuning; per-item closures are recreated each render pass. |
| `src/components/social/FeedItem.tsx` (feed row) + `src/components/outfits/OutfitsSocialFeedSection.tsx` (list) | Row component at 51-282; many inline handlers (143, 153, 195, 203, 222, etc.); list `FlatList` at `OutfitsSocialFeedSection.tsx:116-138` | No (row-level handlers are inline; list gets `renderItem={renderFeedItem(...)}`) | No (`FeedItemComponent` not wrapped in `React.memo`) | No | No | Unstable row handler props in dense feed actions | Highest-impact social feed risk: non-memoized row with many inline action closures and no FlatList tuning. |
| `src/components/calendar/CalendarContinuousGrid.tsx` | `days.map` at 173; `onPress={() => onDayPress(date)}` at 189; `getDayEntries` function at 57 | N/A (`map`, not FlatList) | No (`CalendarDayCell` is not memoized, see `CalendarDayCell.tsx:25`) | N/A | N/A | `onPress` recreated per cell | Calendar grid renders every day cell via `map` and allocates handlers for each; this scales poorly versus virtualized list/grid patterns. |
| `src/components/lookbooks/LookbookPickerModal.tsx` | `FlatList` at 157-191; inline `renderItem` at 160-180 | No | No | No | No | Unstable per-row `onPress={() => onSelectLookbook(item.id)}` at 167 | Modal list is simple but unoptimized; easy win to stabilize renderer and handlers. |
| `src/components/outfits/OutfitViewContent.tsx` | `outfitItems.map` at 273-315; inline `onPress` at 285 | N/A (`map`) | No extracted memoized row | N/A | N/A | Unstable per-item navigation closure | Item detail rows are rendered via direct map in a large component; okay for tiny lists, but degrades for larger outfits. |
| `src/components/UserWardrobeScreen.tsx` | `renderItem` at 187; `FlatList` at 237-246; inline row handlers at 195 and 211 | No | No | No | No | Unstable `onPress` closures inside row | Main wardrobe grid lacks virtualization tuning and stable row renderer in a high-frequency screen. |
| `src/components/social/DiscoverGrid.tsx` + `src/components/social/PostGrid.tsx` | `renderGridItem` at 107; list wrapper `PostGrid` at 105-126 | No (`renderGridItem` not memoized) | No extracted memoized row | No (`PostGrid` sets no window/batch props) | No | Multiple per-item closures (`handlePress`, `handleLongPress`, owner tap) | Community feed grid has similar renderer/handler churn and no flatlist tuning defaults. |
| `src/components/wardrobe/CategoryPills.tsx` | `FlatList` at 110-138; `scrollToIndex` usage at 91-95 and retry at 129-137 | No | No | No | **No** despite `scrollToIndex` usage | Inline `onSelectCategory` and fallback `onSelectSubcategory ?? (() => {})` at 124 | Missing `getItemLayout` is notable here because this list programmatically scrolls to indices and already handles failure retries. |
| `src/components/FindSimilarModal.tsx` | Three `FlatList`s at 117, 131, 145; renderer funcs at 52 and 56 | No | Result item memoization not evident here | No | No | Stable-ish local function references, but not memoized | Multiple lists in one modal without any virtualization tuning; can spike work when switching tabs. |
| `src/components/search/SearchResultsPanel.tsx` | `FlatList` at 41-67 with inline `renderItem` at 43-45 | No | Not evident at callsite | No | No | Inline row renderer | Search result rendering is straightforward but leaves easy performance wins untapped. |
| `src/components/shared/TabPillsRow.tsx` | Horizontal `FlatList` at 71-107; inline row handlers at 88-91 | No | `PillButton` behavior unknown at callsite | No | No | Unstable per-pill closures | Usually small data, but this pattern repeats across app; cheap to optimize once. |
| `src/components/outfits/MyOutfitsSection.tsx` | Feed `FlatList` at 79-103 | Depends on upstream `renderFeedItem` prop | Depends on row component | No | No | Depends on upstream prop stability | Feed mode list has no tuning; performance depends heavily on parent-provided renderer quality. |
| `src/components/wardrobe/headshot-selector/GridView.tsx` | `renderItem` `useCallback` at 24-50; `FlatList` at 55-73 | **Yes** | No extracted row component | No | No | Stable renderer/keyExtractor | Better than most list implementations in this codebase; still missing virtualization parameters. |
| `src/components/shared/EdgePeekSlider.tsx` | `internalRenderItem` `useCallback` at 137-144; `getItemLayout` at 146-153; `FlatList` at 168-187 | **Yes** | **Yes** (`React.memo` at 193) | Partial (good `snap` and `getItemLayout`, but no window/batch props) | **Yes** | Mostly stable handlers | Best-practice baseline in this sweep; use as template for other list-heavy components. |

## Part 2: Component Memoization (Top-20 Largest Components)

Only components with actionable issues are listed.

### 1) `src/components/outfits/OutfitViewContent.tsx`
- Not memoized despite large prop surface (`OutfitViewContent` at 70-101).
- Renders item cards with `outfitItems.map(...)` and inline navigation handler (`273-315`, `285-289`).

### 2) `src/components/wardrobe/OutfitCreatorCanvas.tsx`
- Heavy sort path: `sortedItems` uses `sort` + `findIndex` inside comparator (`292-300`, especially `296-297`), creating avoidable O(n^2 log n) behavior.
- Large mapped render with many inline handlers (`336-477`, e.g. `384-409`, `438-460`, `465-469`).
- Not wrapped in `React.memo` (`272` export component declaration only).

### 3) `src/components/headshots/MirrorTabContent.tsx`
- Not memoized with large prop set (`45-121`, component starts at `123`).
- Multiple inline object literals in JSX (`218`, `221`, `286`, `311`, `351`).
- Inline callbacks in hot interactive area (`319`, `333`, `380`).

### 4) `src/components/headshots/EditTabModal.tsx`
- Not memoized (`77` component export).
- Deep nested list rendering via `map` chains with inline handlers and inline dimension objects:
  - `categoryPills.map` (`166-175`)
  - `section.options.map` blocks (`203-219`, `233-248`, `279-297`, `319-330`, `341-356`)
  - repeated `style={{ width: presetTileSize, height: presetTileSize }}` (`208`, `237`, `286`, `320`, `345`)
- Repeated `filter().map()` in render for hair colors (`315-316`).

### 5) `src/components/social/FeedItem.tsx`
- Core feed row not memoized (`51-72`).
- Many inline action handlers across social controls and navigation (`143`, `153`, `195`, `203`, `222`, `231`, `239`, `246`, `251`, `261`, `273`).

### 6) `src/components/lookbooks/LookbookPickerModal.tsx`
- Not memoized (`51`).
- Inline style object on root layout (`78`) and inline `renderItem`/row handler for lookbook list (`160-180`, `167`).

### 7) `src/components/UserWardrobeScreen.tsx`
- Not memoized (`39`).
- `FlatList` row renderer is not `useCallback` and includes inline handlers (`187-227`, `195`, `211`).

### 8) `src/components/calendar/CalendarDaySheet.tsx`
- Not memoized (`42`).
- `entries.map` with several inline closures per row (`199-228`, especially `208-227`).
- Uses `ScrollView` for a potentially long entry list (`184-238`) instead of virtualized list.

### 9) `src/components/social/UserProfileHeader.tsx` (screen component)
- Not memoized (`60`).
- Two `PostGrid` usages pass inline `renderItem` closures for outfits and lookbooks (`195-227`, `245-272`).

### 10) `src/components/calendar/EntryCard.tsx`
- Not memoized (`31`).
- Recomputes `slotPresets.find(...)` and `outfits.find(...)` on every render (`47-61`) in addition to multiple inline handlers (`114`, `146`, `162`).

### 11) `src/components/headshots/DrawModeModal.tsx`
- Not memoized (`70`).
- Styles are regenerated each render (`StyleSheet.create` at `91-110`) rather than memoized.
- Template list rendered with `.map` + inline press handler (`296-321`, `300`).

### 12) `src/components/tabs/HeaderSearchMenu.tsx`
- Inline animated style object (`155-165`) recreated each render in connected title component.
- Multiple inline toggle/back handlers in header search interactions (`170-173`, `190-196`, `227-233`, `281`).

## Part 3: Context Re-render Risk

Consumer counts are quick `rg` hook-call counts across `src` (excluding `src/contexts`).

| Context | Value memoized? | Bundles fast-changing + stable values? | Consumer count | Risk |
|---|---|---|---:|---|
| `src/contexts/AuthContext.tsx` | **No** (`Provider value` object literal at `224-234`) | Yes: `session/user/loading` with auth methods in same object | 18 (`useAuth`) | **High**. Any auth state change recreates all function refs and provider value; all consumers re-render. |
| `src/contexts/FloatingTabBarContext.tsx` | **Yes** (`useMemo` at `60-68`) | Contains animated values + callbacks, but both are stable refs | 1 (`useFloatingTabBar`) | Low. Current implementation is solid. |
| `src/contexts/HeaderSearchContext.tsx` | **No** (`value` literal at `75-81`) | Yes: mutable header state + registry methods + version counter | 3 (`useHeaderSearch`) | Medium-High. Header registration/version bumps trigger broad consumer updates. |
| `src/contexts/TabSearchContext.tsx` | **No** (`value` literal at `53-58`) | Yes: route registry methods + version counter | 1 (`useTabSearch`) | Medium (currently low consumer count, but pattern is fragile). |
| `src/contexts/ThemeContext.tsx` | **Yes** (`value` memoized at `47-53`) | `mode/colors` and setters bundled, but updates are infrequent | 139 (`useThemeColors`) | Medium. Implementation is good; blast radius is naturally large due high adoption. |
| `src/contexts/NotificationsContext.tsx` | **No** (`value` literal at `104-110`) | Yes: frequently changing `notifications/unreadCount/loading` plus refresh functions | 3 (`useNotifications`) | Medium-High. Frequent realtime/poll updates recreate context value/functions. |
| `src/contexts/CalendarEntryFlowContext.tsx` | **Yes** (`useMemo` at `43-49`) | Mostly stable callbacks exposed; local modal state kept internal | 2 (`useCalendarEntryFlow`) | Low. Good separation of exposed API from internal modal state. |
| `src/contexts/CalendarPanelContext.tsx` | **No** (`value` literal at `39`) | Yes: `showCalendar` plus action callbacks in one object | 0 (`useCalendarPanel`) | Low currently (no consumers found), but would become medium once adopted. |

## Summary: Top 10 Quick Wins

Ranked by impact vs implementation risk.

1. Memoize social feed row: wrap `FeedItemComponent` in `React.memo` (`src/components/social/FeedItem.tsx:51`).
2. Stabilize feed `renderItem`: avoid `renderFeedItem(...)` call per render in `OutfitsSocialFeedSection` (`src/components/outfits/OutfitsSocialFeedSection.tsx:119`); pass memoized callback instead.
3. Add baseline FlatList tuning (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`) to high-traffic lists: `UserWardrobeScreen` (`237`), `OutfitsSocialFeedSection` (`116`), `PostGrid` (`105`), `ItemGrid` (`98`).
4. Add `getItemLayout` to `CategoryPills` because it uses `scrollToIndex` (`91-95`, `129-137`) and currently falls back to retry logic.
5. Convert `CalendarDaySheet` entries from `ScrollView + map` (`184-228`) to `FlatList` with stable row callbacks.
6. Memoize `UserWardrobeScreen` `renderItem` (`187`) and extract row component so save-state changes don’t churn full visible grid.
7. Memoize `LookbookPickerModal` list renderer (`157-180`) and visibility option handler map (`111-134`) to reduce modal interaction jitter.
8. In `OutfitCreatorCanvas`, precompute z-index map to remove `findIndex` inside sort comparator (`296-297`).
9. Memoize context provider values in `AuthContext` (`224-234`), `HeaderSearchContext` (`75-81`), `TabSearchContext` (`53-58`), and `NotificationsContext` (`104-110`).
10. Memoize `DrawModeModal` style creation (`91-110`) and template row handler (`296-321`) to reduce redraw churn while drawing.

## Summary: Structural Concerns

1. **Inconsistent list-performance baseline across the component layer**: `EdgePeekSlider` is high quality, but most other lists lack the same renderer stability + virtualization defaults. This is a systemic pattern, not isolated files.
2. **Large “controller + renderer” components** (`EditTabModal`, `MirrorTabContent`, `UserProfileHeader`, `UserWardrobeScreen`) mix state orchestration with heavy JSX list rendering, amplifying re-render cost and making memoization difficult.
3. **Context shape design causes avoidable fan-out** in `Auth`, `HeaderSearch`, and `Notifications`: frequently changing state and stable actions are exposed through one context value object, so every change invalidates all consumers.
4. **Frequent use of `ScrollView + map` for data lists** (calendar/day entries, preset grids, detail item lists) bypasses virtualization and makes scaling sensitive to data growth.
5. **Handler identity churn is widespread** (especially feed and grid rows), meaning even with memoized children, parent render paths still allocate many closures and can negate gains under interaction-heavy screens.
