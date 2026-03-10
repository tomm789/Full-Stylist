# Three-Column Image Grid Analysis

## Grid Inventory

| Component | File | Aspect | Own FlatList? | Use Case |
|-----------|------|--------|---------------|----------|
| **ItemGrid** | `src/components/wardrobe/ItemGrid.tsx` | 1:1 | Yes | Wardrobe clothing items |
| **PostGrid** | `src/components/social/PostGrid.tsx` | 3:4 | Yes | Generic reusable grid (shared by 6 consumers) |
| **MyOutfitGridItem** | `src/components/outfits/MyOutfitsItemRenderers.tsx` | 3:4 | No (via MyOutfitsSection → PostGrid) | My outfits grid tile |
| **OutfitCard** | `src/components/outfits/OutfitCard.tsx` | 3:4 | No (uses postGridStyles) | Standalone outfit card (reusable) |
| **DiscoverGrid** | `src/components/social/DiscoverGrid.tsx` | 3:4 | No (wraps PostGrid) | Public community feed |
| **GridView** | `src/components/wardrobe/headshot-selector/GridView.tsx` | 1:1 | Yes | Headshot selection |
| **LookbookOutfitGrid** | `src/components/lookbooks/LookbookOutfitGrid.tsx` | 3:4 | No (wraps PostGrid) | Outfits inside a lookbook |
| **OutfitGridSelector** | `src/components/lookbooks/OutfitGridSelector.tsx` | 3:4 | No (wraps PostGrid) | Multi-select outfits for lookbook |
| **OutfitGridPicker** | `src/components/calendar/OutfitGridPicker.tsx` | 3:4 | No (wraps PostGrid) | Single-select outfit for calendar |
| **SkeletonGrid** | `src/components/shared/loading/SkeletonGrid.tsx` | Both | No (View-based) | Loading placeholder (wardrobe preset=1:1, outfit preset=3:4) |

---

## Shared Code (already common or should be)

### FlatList Performance Config
All FlatList-based grids use identical tuning:
```
initialNumToRender={8}
maxToRenderPerBatch={4}
windowSize={5}
getItemLayout (pre-calculated row heights)
```
- **ItemGrid**: Has its own FlatList with these settings
- **PostGrid**: Has its own FlatList with these settings
- **GridView**: Has its own FlatList with these settings

### Column Count
All grids use `numColumns={3}`. ItemGrid accepts it as a prop (default 3); the rest hard-code it.

### Image Rendering (ExpoImage)
All grids render images with:
```
contentFit="cover"
cachePolicy="memory-disk"
recyclingKey={item.id}
transition={200}  // some omit this
```

### Image Caching
All grids receive pre-resolved image URLs via a `Map<string, string | null>` prop (except LookbookOutfitGrid which resolves its own via `useEffect`).

### Placeholder Pattern
When no image URL is available, all grids show a colored background with centered content (icon or text). The specific placeholder content varies.

### Selection Badge
Used by: DiscoverGrid, OutfitGridSelector, OutfitGridPicker, GridView (as checkmark badge).
Pattern: absolute-positioned circle overlay, top-right corner, primary color background, centered icon.

### Info Overlay
Used by: DiscoverGrid, LookbookOutfitGrid, OutfitGridSelector, OutfitGridPicker.
Pattern: absolute-positioned bar at bottom with semi-transparent black background, white text.

### Empty State
All grids show an empty state. Implementations vary:
- ItemGrid: Renders `EmptyState` shared component with configurable title/message/action
- DiscoverGrid: Custom inline empty view (icon + title + subtitle)
- GridView: Custom inline empty view (icon + title + subtitle)
- LookbookOutfitGrid: Simple text message
- OutfitGridPicker: Simple text message

### Pull-to-Refresh
Used by: ItemGrid (own RefreshControl), PostGrid (passed through), DiscoverGrid (via PostGrid).
Not used by: GridView, LookbookOutfitGrid, OutfitGridSelector, OutfitGridPicker (embedded/scroll-disabled).

---

## PostGrid Consumers (3:4 Aspect Ratio)

PostGrid exports `postGridStyles` used by all its consumers. These 4 components share:

### Shared via PostGrid
- 3-column layout, 3:4 aspect ratio
- `ITEM_WIDTH = SCREEN_WIDTH / 3 - 1` (0.5px margin each side)
- `ROW_HEIGHT = ITEM_WIDTH * (4/3) + 1`
- `gridItem` style: `flexBasis: 33.333%`, `maxWidth: 33.333%`, `aspectRatio: 3/4`, `margin: 0.5`
- `gridRow` style: `gap: 1`
- `gridImage` style: full-width/height, tertiary background
- `gridImagePlaceholder` style: centered content, tertiary background
- `infoOverlay` style: absolute bottom, semi-transparent black
- `selectionBadge` style: absolute top-right, primary circle

### Additional PostGrid Consumers (missed in initial inventory)

#### MyOutfitGridItem (via MyOutfitsSection → PostGrid)
- `MyOutfitsSection` wraps PostGrid for grid view, FlatList for feed view
- `MyOutfitGridItem` in `MyOutfitsItemRenderers.tsx` renders each grid tile using `postGridStyles`
- Uses `postGridStyles.gridItem`, `gridImage`, `gridImagePlaceholder`, `infoOverlay`, `selectionBadge`
- Has its own schedule overlay text, selection mode, long-press activation
- Press handler calls `onOpenFeed(outfitId)` — opens **outfit feed view** (not direct outfit detail)

#### OutfitCard (standalone card component)
- Used as a reusable outfit card, imports `postGridStyles` directly
- Uses `GRID_IMAGE_PROPS` from `@/lib/images`
- Shows title, favorite heart, rating, date in `infoOverlay`
- Press handler: generic `onPress` callback (caller decides destination)

---

## Press Handler / Navigation Map

This is the key differentiator between grids showing the same content type. The grid rendering is identical; the destination on press is what changes.

| Component | Content | On Press → Destination | Navigation Path |
|-----------|---------|----------------------|-----------------|
| **MyOutfitGridItem** | User's own outfits | Outfit feed view (scrollable) | `onOpenFeed(outfitId)` — caller routes to feed |
| **DiscoverGrid** | Community posts | User's feed at specific post | `/users/{ownerId}/feed?postId={postId}` |
| **DiscoverGrid** | Community posts (no owner) | Direct outfit/lookbook view | `/outfits/{id}/view` or `/lookbooks/{id}` |
| **DiscoverGrid** | Owner handle press | User profile | `/users/{ownerId}` |
| **LookbookOutfitGrid** | Lookbook outfits | Outfit viewer (with lookbook context) | `/outfits/{id}/view` with lookbookId + index params |
| **OutfitGridSelector** | Outfits for lookbook | Toggle selection (no navigation) | `onToggle(outfitId)` |
| **OutfitGridPicker** | Outfits for calendar | Toggle selection (no navigation) | `onSelectOutfit(id \| null)` |
| **OutfitCard** | Any outfit | Caller-defined | Generic `onPress` callback |
| **ItemGrid** | Wardrobe items | Item detail | `onItemPress(item)` — caller routes |
| **GridView** | Headshots | Select headshot (no navigation) | `onSelect(headshot)` |

### Press Handler Categories

1. **Navigate to feed view** — MyOutfitGridItem, DiscoverGrid (with owner). Opens a scrollable feed positioned at the tapped post.
2. **Navigate to detail view** — DiscoverGrid (no owner), LookbookOutfitGrid, ItemGrid. Opens a standalone detail/viewer page.
3. **Selection only (no navigation)** — OutfitGridSelector, OutfitGridPicker, GridView. Toggles selection state in-place.
4. **Caller-defined** — OutfitCard. Generic callback, destination depends on where it's used.

### Implication for Shared Components
The press handler is **not** part of the grid infrastructure — it's always provided by the consumer or parent screen. The shared `GridImageTile` and `ImageGrid` components should remain navigation-agnostic: they accept `onPress` / `renderItem` callbacks and never import `router`. This is already the pattern in PostGrid (generic `renderItem`), so no architectural change needed. The navigation logic stays in each consumer.

---

### Unique to Each Consumer

#### DiscoverGrid
- **Owner overlay**: Username handle at bottom of each tile, tappable to navigate to user profile
- **Entity-type placeholders**: Different Ionicon per type (shirt-outline, person-circle-outline, albums-outline)
- **Infinite scroll**: `onEndReached` pagination with loading spinner footer
- **Long-press**: Haptic feedback, 500ms delay, triggers selection mode
- **Multi-select mode**: Toggle selection with Set tracking
- **Press routing**: Navigates to entity detail page or user profile depending on entity type
- **Theme colors**: Uses `useThemeColors()` for dynamic styling

#### LookbookOutfitGrid
- **Favorite button**: Heart icon overlay, top-right, red when favorited, with `stopPropagation`
- **Menu button**: Vertical ellipsis in info overlay, triggers action sheet
- **Async image resolution**: Calls `getOutfitCoverImageUrl()` per item in `useEffect` (does NOT use Map cache prop)
- **Scroll disabled**: Embedded in scrollable parent
- **Hardcoded colors**: Uses literal hex values (`#000`, `#999`, `#e0e0e0`) instead of theme tokens
- **Press routing**: Navigates to `/outfits/{id}/view` with lookbookId param

#### OutfitGridSelector
- **Multi-select**: Toggle via `onToggle(outfitId)`, tracks with `Set<string>`
- **Selection badge**: Checkmark overlay when selected
- **Memoized item**: `OutfitCard` wrapped in `React.memo`
- **Scroll disabled**: Embedded in modal
- **Theme-aware styles**: Uses `createStyles(colors)` pattern

#### OutfitGridPicker
- **Single-select toggle**: Pressing selected item deselects it (`onSelectOutfit(null)`)
- **Selection badge**: Checkmark overlay when selected
- **`GRID_IMAGE_PROPS` constant**: Shared image optimization config
- **Scroll disabled**: Embedded in form
- **Theme-aware styles**: Uses `createStyles(colors)` pattern
- **Container label**: Section title above grid

---

## Standalone Grids (Own FlatList)

### ItemGrid (Wardrobe) — The Outlier

#### What's Different
- **1:1 aspect ratio** (square items, not 3:4 portrait)
- **Own FlatList** with full control (not wrapping PostGrid)
- **Item size**: `(SCREEN_WIDTH - 2 - 2) / 3` with 1px gaps and 1px list padding
- **Renders `ItemCard` sub-component** (not inline renderItem)
- **Favorite toggle**: Via `onFavoritePress` callback
- **Long-press**: For multi-selection
- **Dimming**: `dimmedItems` prop visually dims certain items
- **Multi-select**: `selectedItems` array
- **Configurable columns**: `numColumns` prop (only grid that supports this)
- **Scroll tracking**: `onScroll` + `scrollEventThrottle` pass-through
- **Custom empty state**: Configurable title, message, action label, action callback via `EmptyState` component

#### What Could Be Shared
- FlatList performance config (identical to PostGrid)
- Selection badge pattern (same concept, different implementation)
- Empty state rendering (already uses shared `EmptyState` component)
- Pull-to-refresh pattern

### GridView (Headshots) — Close to Standard but Styled Differently

#### What's Different
- **1:1 aspect ratio** (square, like ItemGrid)
- **Own FlatList** (not wrapping PostGrid)
- **Larger gaps**: Uses `spacing.md` (~12px) between items, not 1px
- **Padding**: `spacing.lg` grid padding (vs 1px in others)
- **Item width**: `(SCREEN_WIDTH - 2 * GRID_PADDING - 2 * COLUMN_GAP) / 3` (accounts for padding + gaps)
- **Border radius + shadows**: Items have rounded corners and drop shadows (unique among all grids)
- **Checkmark badge**: 28px circle with shadow (vs 24px in PostGrid, no shadow)
- **Single selection**: Checkmark on active item, `disabled={loading}` on all items during load
- **No info overlay**: No title/text overlay on items
- **Theme-aware**: Full theme integration via `useThemeColors()`

#### What Could Be Shared
- FlatList performance config (identical)
- Selection badge pattern (same concept, styled differently)
- Empty state pattern (same structure, inline implementation)

---

## Style Inconsistencies

| Property | ItemGrid | PostGrid consumers | GridView |
|----------|----------|-------------------|----------|
| Aspect ratio | 1:1 | 3:4 | 1:1 |
| Gap | 1px | 1px (row), 0.5px (item margin) | spacing.md (~12px) |
| List padding | 1px | 0 | spacing.lg |
| Border radius | None | None | borderRadius.md |
| Shadows | None | None | shadows.sm |
| Theme colors | Partial (some hardcoded) | Mixed (PostGrid uses lightColors; consumers vary) | Full theme |
| Selection indicator | Via ItemCard | postGridStyles.selectionBadge (24px) | checkmarkBadge (28px, shadow) |
| Empty state | EmptyState component | Varies per consumer | Inline custom |

### Hardcoded Color Issues
- **PostGrid**: `lightColors.backgroundTertiary` imported directly (not theme-aware)
- **LookbookOutfitGrid**: Literal hex values (`#000`, `#999`, `#e0e0e0`, `#fff`)
- **ItemGrid**: Uses `imageCache` Map but doesn't reference theme colors for placeholder

---

## SkeletonGrid Alignment

SkeletonGrid has two relevant presets that should stay in sync with their real counterparts:

| Preset | Matches | Columns | Aspect | Gap |
|--------|---------|---------|--------|-----|
| `'wardrobe'` | ItemGrid | 3 | 1:1 | 1px |
| `'outfit'` | PostGrid consumers | 3 | 3:4 | 0.5px |

If grid dimensions change during unification, SkeletonGrid presets must update to match.

---

## Key Observations for Unification

1. **PostGrid already serves as a shared base** for 4 of 7 image grids. The pattern works.
2. **Two aspect ratios exist**: 1:1 (wardrobe items, headshots) and 3:4 (outfits, social posts). A unified grid needs to support both.
3. **GridView is the most visually distinct** — larger gaps, rounded corners, shadows. This may warrant keeping it separate or making spacing/decoration configurable.
4. **ItemGrid is the most functionally distinct** — favorite toggle, dimming, multi-select, configurable columns. However, its FlatList config is identical to PostGrid.
5. **LookbookOutfitGrid has the most tech debt** — hardcoded colors, per-item async image loading instead of Map cache, inline hex values.
6. **Selection patterns are reimplemented 4 times** with slightly different badge sizes and styles.
7. **Empty states are implemented 3 different ways** — shared component, custom inline, simple text.

---

# Implementation Plan

## Strategy

Evolve **PostGrid** into a general-purpose `ImageGrid` that supports both aspect ratios and all current spacing variants. Extract repeated sub-patterns (selection badge, info overlay, grid image + placeholder) into small shared components. Refactor consumers one at a time with no behaviour changes.

## Phase 1 — Shared Sub-Components (no consumer changes yet)

### 1A. `GridSelectionBadge`
**Create:** `src/components/shared/grid/GridSelectionBadge.tsx`

Extracts the selection checkmark badge reimplemented in PostGrid, DiscoverGrid, OutfitGridSelector, OutfitGridPicker, and GridView.

```
Props:
  visible: boolean
  size?: number          // default 24 (PostGrid default), GridView passes 28
  shadow?: boolean       // default false, GridView passes true
  style?: ViewStyle      // escape hatch for positioning overrides
```

Renders: absolute-positioned circle, top-right, primary background, Ionicons checkmark. Uses `useThemeColors()`.

Replaces:
- `postGridStyles.selectionBadge` usage in DiscoverGrid, OutfitGridSelector, OutfitGridPicker
- `styles.checkmarkBadge` in GridView

### 1B. `GridImageTile`
**Create:** `src/components/shared/grid/GridImageTile.tsx`

Extracts the repeated image-or-placeholder rendering pattern.

```
Props:
  imageUrl: string | null
  recyclingKey?: string
  placeholderIcon?: string    // Ionicons name, default 'image-outline'
  placeholderText?: string    // e.g. "No Image", shown if no icon
  aspectRatio?: number        // default 3/4
  style?: ViewStyle
  imageStyle?: ViewStyle
```

Renders: ExpoImage with `{...GRID_IMAGE_PROPS}` when URL exists, otherwise themed placeholder (icon or text). Uses `useThemeColors()`.

Replaces: The duplicated `{imageUrl ? <Image .../> : <View placeholder .../>}` block in every consumer.

### 1C. `GridInfoOverlay`
**Create:** `src/components/shared/grid/GridInfoOverlay.tsx`

Extracts the bottom info bar used by DiscoverGrid, LookbookOutfitGrid, OutfitGridSelector, OutfitGridPicker.

```
Props:
  children: ReactNode    // title text, menu buttons, etc.
  style?: ViewStyle
```

Renders: absolute-positioned bottom bar, `rgba(0,0,0,0.55)` background, horizontal padding. Currently hardcoded in `postGridStyles.infoOverlay`.

### 1D. Export barrel
**Create:** `src/components/shared/grid/index.ts`

Re-exports all three components for clean imports.

---

## Phase 2 — Generalise PostGrid → `ImageGrid`

### 2A. Make PostGrid aspect-ratio-agnostic
**Modify:** `src/components/social/PostGrid.tsx`

Changes:
- Add `aspectRatio` prop (default `3/4` for backward compat)
- Add `gap` prop (default `1`)
- Add `itemPadding` prop (default `spacing.lg` for grid padding, `0` for embedded)
- Derive `ITEM_WIDTH` and `ROW_HEIGHT` from props instead of constants
- Replace `lightColors.*` references with `useThemeColors()` so styles are theme-aware
- Keep `postGridStyles` export temporarily for backward compat (deprecated)
- Export new `createGridStyles(aspectRatio, gap)` function for consumers that need raw styles

### 2B. Rename file (optional, deferred)
`PostGrid.tsx` → `ImageGrid.tsx` with re-export from old path. Can be done after all consumers migrate. Low priority.

---

## Phase 3 — Migrate PostGrid Consumers (one at a time)

Each migration replaces inline rendering with shared sub-components. No behaviour changes.

### 3A. OutfitGridPicker (simplest consumer)
**Modify:** `src/components/calendar/OutfitGridPicker.tsx`

- Replace inline image/placeholder block with `<GridImageTile>`
- Replace inline selection badge with `<GridSelectionBadge>`
- Replace inline info overlay with `<GridInfoOverlay>`
- Remove local styles that are now handled by shared components
- Already uses `GRID_IMAGE_PROPS` and theme colors — cleanest starting point

### 3B. OutfitGridSelector
**Modify:** `src/components/lookbooks/OutfitGridSelector.tsx`

- Same as 3A: swap in `GridImageTile`, `GridSelectionBadge`, `GridInfoOverlay`
- Keep `React.memo` on the OutfitCard sub-component

### 3C. DiscoverGrid
**Modify:** `src/components/social/DiscoverGrid.tsx`

- Swap in shared sub-components
- Keep unique logic: owner overlay content inside `<GridInfoOverlay>`, entity-type placeholder icons via `GridImageTile.placeholderIcon`, long-press / multi-select / infinite scroll (all stay in this component)

### 3D. MyOutfitGridItem
**Modify:** `src/components/outfits/MyOutfitsItemRenderers.tsx`

- Replace inline image/placeholder/loading block with `<GridImageTile>`
- Replace inline selection badge with `<GridSelectionBadge>`
- Replace inline info overlay with `<GridInfoOverlay>`
- Keep: schedule overlay content, selection mode logic, long-press activation
- Keep: `onOpenFeed` press handler (navigates to feed view, not detail view)
- Note: empty `gridImage`/`gridImagePlaceholder` style overrides in createStyles can be removed

### 3E. OutfitCard
**Modify:** `src/components/outfits/OutfitCard.tsx`

- Replace inline image/placeholder/loading block with `<GridImageTile>`
- Replace inline info overlay with `<GridInfoOverlay>`
- Keep: title + meta row (favorite heart, rating, date) inside overlay — this is unique content
- Already uses `GRID_IMAGE_PROPS` and theme colors — clean consumer

### 3F. LookbookOutfitGrid (most tech debt)
**Modify:** `src/components/lookbooks/LookbookOutfitGrid.tsx`

- Swap in shared sub-components
- **Replace hardcoded hex colors** with theme tokens via `useThemeColors()`
- **Replace per-item `useEffect` image loading** with `Map<string, string | null>` cache prop (matching all other consumers). This requires the parent (`LookbookDetailScreen` or similar) to pre-resolve images — check caller.
- Move favorite button into a pattern consistent with ItemCard (same overlay position, same icon logic)
- Keep unique: menu button in overlay, lookbook-specific routing

---

## Phase 4 — Migrate Standalone Grids

### 4A. GridView (headshot-selector)
**Modify:** `src/components/wardrobe/headshot-selector/GridView.tsx`

- Swap in `<GridSelectionBadge size={28} shadow>` (replacing checkmarkBadge)
- Swap in `<GridImageTile aspectRatio={1}>` (replacing inline image/placeholder)
- **Keep own FlatList** — spacing model (spacing.md gaps, spacing.lg padding, border radius, shadows) is intentionally different from the tight 1px grids. Making ImageGrid support this via props would add complexity for one consumer.
- Move grid item styles (borderRadius, shadows) out of headshot-selector/styles.ts into the component or into a `GridView`-specific createStyles — they're not shared.

### 4B. ItemGrid (wardrobe)
**Modify:** `src/components/wardrobe/ItemGrid.tsx`

- **Keep own FlatList** — configurable columns, dimming, and the ItemCard sub-component make this sufficiently different.
- ItemCard already uses `GRID_IMAGE_PROPS` and `useThemeColors()` — it's the best-practice reference.
- Only change: if `EmptyState` usage in other grids is standardised (Phase 5), ensure ItemGrid stays consistent.

**No structural refactor needed.** ItemGrid + ItemCard are already well-factored. The 1:1 square wardrobe grid with selection/dimming/favorites is a genuinely different UX from the other grids.

---

## Phase 5 — Standardise Empty States

### 5A. Adopt `EmptyState` component everywhere
**Modify:** DiscoverGrid, GridView, LookbookOutfitGrid, OutfitGridPicker

All grids should use the existing shared `EmptyState` component (`src/components/shared/layout/EmptyState.tsx`) instead of inline empty views.

Changes per file:
- **DiscoverGrid**: Replace custom `emptyContainer`/`emptyText`/`emptySubtext` with `<EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />`
- **GridView**: Replace inline "No headshots yet" view with `<EmptyState icon="image-outline" title="No headshots yet" message="..." />`
- **LookbookOutfitGrid**: Replace `emptyContainer`/`emptyText` with `<EmptyState icon="albums-outline" title="No outfits yet" message="..." />`
- **OutfitGridPicker**: Replace inline "No outfits available" text with `<EmptyState icon="shirt-outline" title="No outfits available" />`

---

## Phase 6 — Cleanup

### 6A. Remove deprecated `postGridStyles` export
Once all consumers use shared sub-components and/or the new `createGridStyles()`:
- Delete the `postGridStyles` named export from PostGrid
- Update any remaining imports

### 6B. Update SkeletonGrid presets
**Modify:** `src/components/shared/loading/SkeletonGrid.tsx`

Ensure preset dimensions match the final grid constants. If `ImageGrid` exports its dimension calculation, SkeletonGrid should import from there rather than duplicating the math.

### 6C. Delete dead styles
Remove any style definitions in consumer files that are now handled by shared components.

---

## Task Sizing (for delegation)

| Phase | Estimated Scope | Delegate to Codex? |
|-------|----------------|-------------------|
| 1A-1D | ~120 lines new, 4 new files | Yes — straightforward component creation |
| 2A | ~40 lines changed in PostGrid | No — architectural, needs careful backward compat |
| 3A | ~20 lines changed (OutfitGridPicker) | Yes |
| 3B | ~20 lines changed (OutfitGridSelector) | Yes |
| 3C | ~30 lines changed (DiscoverGrid) | Yes |
| 3D | ~25 lines changed (MyOutfitGridItem) | Yes |
| 3E | ~20 lines changed (OutfitCard) | Yes |
| 3F | ~60 lines changed (LookbookOutfitGrid — most refactoring) | Yes — but review closely |
| 4A | ~20 lines changed (GridView) | Yes |
| 4B | No changes needed (ItemGrid) | — |
| 5A | ~40 lines changed across 4 files | Yes — batch task |
| 6A-6C | ~30 lines removed | Yes — cleanup pass |

**Total estimated**: ~450 lines touched, 4 new files created, 0 files deleted.

---

## Risks & Mitigations

1. **Backward compat during Phase 2**: Keep `postGridStyles` export until Phase 6. Consumers migrate one at a time.
2. **LookbookOutfitGrid image loading change (3D)**: Changing from per-item useEffect to Map cache requires the parent screen to provide the Map. Verify the parent already has this data or add it there first.
3. **GridView visual regression (4A)**: The larger gaps and shadows are intentional design. Only extract sub-components; don't change spacing.
4. **SkeletonGrid drift (6B)**: If grid dimensions change at all, skeleton presets must update in the same PR.
