# Codex Task: Phase 2E — Image Optimization (2 sub-tasks)

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is an **implementation task**. Phases 2A–2D are complete. This phase applies the image transform helpers and standard expo-image prop sets created in Phase 2B across the codebase.

**Phase 2B created these utilities (already on this branch):**
- `src/lib/images/transforms.ts` — `getImageUrl(bucket, path, size)` with sizes: `'thumb'` (150×150, q70), `'card'` (400×400, q80), `'full'` (no transform)
- `src/lib/images/defaults.ts` — Standard prop sets: `GRID_IMAGE_PROPS`, `DETAIL_IMAGE_PROPS`, `AVATAR_IMAGE_PROPS`, `FEED_IMAGE_PROPS`
- `src/lib/images/index.ts` — Barrel exports

Read these files first to understand the exact APIs before making changes.

---

## Sub-task 2E-1: Apply image URL transforms at URL generation points

### Problem

Grid, list, and feed images currently load full-resolution originals from Supabase storage. Supabase supports server-side image transforms via URL parameters. The `getImageUrl` helper (from Phase 2B) generates transformed URLs, but nothing uses it yet.

### Where to apply transforms

**1. `src/utils/batchImageHelpers.ts`** (created in Phase 2D)
- This is the centralized batch image fetcher used by 5 hooks.
- Currently calls `supabase.storage.from(bucket).getPublicUrl(key)` — full resolution.
- Add an optional `size` parameter (default `'full'` for backward compatibility):
  ```typescript
  export async function batchGetOutfitCoverImages(
    outfits: OutfitWithCover[],
    size: ImageSizeClass = 'full'
  ): Promise<Map<string, string | null>>
  ```
- When `size !== 'full'`, use `getImageUrl(bucket, key, size)` instead of `getPublicUrl`.
- Import `getImageUrl` and `ImageSizeClass` from `@/lib/images`.

**2. Update callers of `batchGetOutfitCoverImages` to pass appropriate sizes:**
- `src/hooks/social/useFeed.ts` — pass `'card'` (feed images are ~400px wide)
- `src/hooks/social/useDiscoverFeed.ts` — pass `'card'`
- `src/hooks/social/useDiscoverOutfits.ts` — pass `'card'`
- `src/hooks/social/useUserProfile.ts` — pass `'card'` (profile grid items)
- `src/hooks/profile/useProfileData.ts` — pass `'card'`

**3. `src/lib/images.ts`** — Update the standalone image URL helpers:
- `getPublicImageUrl(image)` — add an optional `size` parameter:
  ```typescript
  export function getPublicImageUrl(
    image: { storage_bucket?: string; storage_key?: string },
    size: ImageSizeClass = 'full'
  ): string | null
  ```
  When `size !== 'full'` and both bucket+key exist, use `getImageUrl(bucket, key, size)`.
- `getOutfitCoverImages(outfits)` — add optional `size` parameter, use it when generating URLs.
- `getOutfitCoverImageUrl(outfit)` — this is used for detail views, keep as `'full'` (no change needed).

**4. Components with direct `getPublicUrl()` calls in grid/list contexts:**
- `src/components/wardrobe/ItemImageCarousel.tsx` (lines ~37-42) — uses direct `.getPublicUrl()` in a loop. This is a carousel so `'card'` size is appropriate.

### Important constraints
- Default to `'full'` when no size is specified — backward-compatible.
- Detail views should remain `'full'` resolution (single large images).
- Grid/list/feed contexts should use `'card'` (400×400).
- Avatar contexts should use `'thumb'` (150×150) where applicable.
- Only apply transforms where the source is Supabase storage (not local files, data URIs, or external URLs).

### Success criteria
- `batchGetOutfitCoverImages` supports a `size` parameter and all 5 callers pass `'card'`.
- `getPublicImageUrl` and `getOutfitCoverImages` in `src/lib/images.ts` support a `size` parameter.
- Grid/list/feed contexts receive appropriately sized image URLs.
- Detail/single views remain full resolution.

---

## Sub-task 2E-2: Apply standard expo-image props and add recyclingKey

### Problem

Most image components are missing standard performance props (`cachePolicy`, `transition`, `recyclingKey`). Some components use React Native's `Image` when they should use `expo-image`. The standard prop sets from Phase 2B need to be applied.

### What to apply

**Standard prop sets (from `src/lib/images/defaults.ts`):**
- `GRID_IMAGE_PROPS` — for grid cells, list items, thumbnails
- `FEED_IMAGE_PROPS` — for feed cards
- `DETAIL_IMAGE_PROPS` — for detail views, full-screen
- `AVATAR_IMAGE_PROPS` — for avatar circles

**`recyclingKey` rule:** Add `recyclingKey={imageUrl}` (or `recyclingKey={item.id}`) to every `<Image>` rendered inside a FlatList `renderItem`. This prevents stale images when cells are recycled.

### Files to update

**Group A: Convert React Native `Image` to expo-image + apply props**

Check each file's import — if it imports `Image` from `react-native`, convert to `import { Image } from 'expo-image'`. Then spread the appropriate prop set.

1. **`src/components/shared/layout/HeaderAvatarButton.tsx`** — Convert to expo-image, spread `{...AVATAR_IMAGE_PROPS}`
2. **`src/components/social/FeedOutfitCard.tsx`** — Convert to expo-image, spread `{...FEED_IMAGE_PROPS}`, add `recyclingKey`
3. **`src/components/social/FeedLookbookCarousel.tsx`** — Convert to expo-image, spread `{...FEED_IMAGE_PROPS}`, add `recyclingKey`
4. **`src/components/outfits/OutfitCard.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`, add `recyclingKey`
5. **`src/components/lookbooks/LookbookCard.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`, add `recyclingKey`
6. **`src/components/lookbooks/LookbookCreatorPanel.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
7. **`src/components/lookbooks/SystemLookbookCard.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
8. **`src/components/calendar/CalendarDayCell.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
9. **`src/components/calendar/EntryCard.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
10. **`src/components/calendar/OutfitGridPicker.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`, add `recyclingKey`
11. **`src/components/outfits/CategorySlotSelector.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
12. **`src/components/outfits/ItemPickerModal.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`, add `recyclingKey`
13. **`src/components/outfits/OutfitNavigation.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
14. **`src/components/outfits/CategorySelector.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
15. **`src/components/wardrobe/ItemCard.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`, add `recyclingKey`
16. **`src/components/wardrobe/ItemNavigation.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
17. **`src/components/wardrobe/NavigationSlider.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
18. **`src/components/wardrobe/ItemDetailModal.tsx`** — Convert to expo-image, spread `{...DETAIL_IMAGE_PROPS}`
19. **`src/components/wardrobe/PanelCards.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`
20. **`src/components/wardrobe/HeadshotSelectorCard.tsx`** — Convert to expo-image, spread `{...GRID_IMAGE_PROPS}`

**IMPORTANT**: Before converting imports, verify the file actually uses React Native's `Image`. Some files import `Image` from `expo-image` already. If a file already imports from `expo-image`, skip the import conversion and just add missing props.

**Group B: Already using expo-image — add missing props**

These files already import from `expo-image` but are missing standard props.

1. **`src/components/social/DiscoverGrid.tsx`** — Add `recyclingKey`, `transition={200}` (already has `cachePolicy`)
2. **`src/components/social/FeedCard.tsx`** — Add `recyclingKey`
3. **`src/components/social/FeedItem.tsx`** — Add `recyclingKey`
4. **`src/components/social/HeadshotFeedCard.tsx`** — Add `recyclingKey`, `transition={200}`
5. **`src/components/social/SlideshowSlide.tsx`** — Add `recyclingKey` (already has good props)
6. **`src/components/profile/ProfileTabs.tsx`** — Add `recyclingKey`, `transition={200}`
7. **`src/components/profile/ProfileImageGallery.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`, `transition={200}`
8. **`src/components/profile/HeadshotSection.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`, `transition={200}`
9. **`src/components/profile/BodyShotSection.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`, `transition={200}`
10. **`src/components/lookbooks/LookbookOutfitGrid.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`, `transition={200}`
11. **`src/components/lookbooks/AddOutfitsModal.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`, `transition={200}`
12. **`src/components/outfits/MyOutfitFeedCard.tsx`** — Add `recyclingKey`, `transition={200}`
13. **`src/components/outfits/MyOutfitsItemRenderers.tsx`** — Add `recyclingKey`, `transition={200}`
14. **`src/components/wardrobe/headshot-selector/GridView.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`
15. **`src/components/shared/GenerationThumbnailStrip.tsx`** — Add `cachePolicy="memory-disk"`, `recyclingKey`

**Group C: Headshot/detail views — apply DETAIL_IMAGE_PROPS**

1. **`src/components/wardrobe/headshot-selector/DetailView.tsx`** — spread `{...DETAIL_IMAGE_PROPS}`
2. **`src/components/wardrobe/headshot-selector/CameraView.tsx`** — spread `{...DETAIL_IMAGE_PROPS}`
3. **`src/components/shared/images/ImageCarousel.tsx`** — spread `{...DETAIL_IMAGE_PROPS}`

### How to apply prop sets

Use the spread pattern. If the component already has some props that conflict with the spread, keep the explicit props (they'll override the spread):

```tsx
import { GRID_IMAGE_PROPS } from '@/lib/images';

// Before:
<Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />

// After:
<Image
  {...GRID_IMAGE_PROPS}
  source={{ uri: imageUrl }}
  style={styles.image}
  recyclingKey={item.id}
/>
```

If a component already has a `contentFit` that differs from the default in the prop set (e.g., `contentFit="contain"` for detail views), put it after the spread to override.

### How to determine recyclingKey

- In FlatList `renderItem`: use the item's `id` or the image URL
- In map iterations: use the array item's unique key
- In non-list contexts (single images, headers): `recyclingKey` is not needed

### Important constraints

- **Only change image-related props** — don't restructure components, change layouts, or modify styles.
- **Preserve existing behavior** — spread props should ADD optimizations, not change visible behavior.
- **`expo-image`'s `Image` is a drop-in replacement** for React Native's `Image` for remote URLs. The main API differences: `contentFit` instead of `resizeMode`, `source` accepts `string | { uri: string }`.
  - If a component uses `resizeMode`, replace with `contentFit` (the prop set includes `contentFit`).
  - If a component uses `source={{ uri: url }}`, it works as-is with expo-image. But `source={url}` (string) also works.
- **Don't change local/asset images** — only apply transforms to remote Supabase URLs.
- Verify each file's current import before changing. Don't double-import.

### Success criteria
- All FlatList-rendered images have `recyclingKey`.
- All image components have `cachePolicy="memory-disk"` (or appropriate policy).
- All image components have `transition` for smooth loading.
- `HeaderAvatarButton` uses expo-image.
- No React Native `Image` used for remote URLs in grid/list/feed contexts.

---

## General rules

- **Preserve existing behavior** — these are performance optimizations only, no visual changes.
- **Minimal changes** — add/spread props, update imports. Don't restructure.
- **Verify by reading** — after changes, re-read each file to confirm correctness.
- **Use `if (__DEV__)` for any new console.log calls.**
- Commit all changes with a descriptive message.

## Output

Write a summary to `CODEX_TASK_REPORT_2E.md` listing:
1. URL transform changes: which URL generation points were updated, what sizes are used where
2. Prop changes: which components were updated, what props were added
3. Import conversions: which components were converted from RN Image to expo-image
4. recyclingKey additions: which components got recyclingKey and what key was used
5. Any issues, edge cases, or decisions made
