# Three-Column Image Grid Analysis

## Grid Inventory

| Component | File | Aspect | Own FlatList? | Use Case |
|-----------|------|--------|---------------|----------|
| **ItemGrid** | `src/components/wardrobe/ItemGrid.tsx` | 1:1 | Yes | Wardrobe clothing items |
| **PostGrid** | `src/components/social/PostGrid.tsx` | 3:4 | Yes | Generic reusable grid (shared by 4 consumers) |
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
