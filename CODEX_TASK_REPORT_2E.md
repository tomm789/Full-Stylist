# Phase 2E Report — Image Optimization

## 1) URL transform changes

Updated URL generation points to support `ImageSizeClass` and Supabase transforms via `getImageUrl`:

- `src/utils/batchImageHelpers.ts`
  - Added `size` parameter to `batchGetOutfitCoverImages(outfits, size = 'full')`.
  - Uses transformed URLs via `getImageUrl(bucket, key, size)` when `size !== 'full'`.
  - Preserves backward compatibility by defaulting to `'full'`.
- `src/lib/images.ts`
  - `getPublicImageUrl(image, size = 'full')` now accepts size and uses `getImageUrl` for non-`full` sizes.
  - `getOutfitCoverImages(outfits, size = 'full')` now accepts size and passes it through URL generation.
  - `getOutfitCoverImageUrl(outfit)` left unchanged for detail/single views (full-resolution behavior retained).
- `src/components/wardrobe/ItemImageCarousel.tsx`
  - Replaced direct `supabase.storage.getPublicUrl()` call with `getImageUrl(..., 'card')` for carousel contexts.

Updated all required feed/profile batch caller contexts to `card` size:

- `src/hooks/social/useFeed.ts`
  - `batchGetOutfitCoverImages(outfits, 'card')`
  - `batchGetOutfitCoverImages(lookbookOutfits, 'card')`
- `src/hooks/social/useDiscoverFeed.ts`
  - `batchGetOutfitCoverImages(outfits, 'card')`
- `src/hooks/social/useDiscoverOutfits.ts`
  - `batchGetOutfitCoverImages(outfits, 'card')`
- `src/hooks/social/useUserProfile.ts`
  - all 4 call sites now pass `'card'`
- `src/hooks/profile/useProfileData.ts`
  - `batchGetOutfitCoverImages(outfits, 'card')`

## 2) Prop changes (standard expo-image props)

Applied standard prop sets in Group A files:

- `AVATAR_IMAGE_PROPS`
  - `src/components/shared/layout/HeaderAvatarButton.tsx`
- `FEED_IMAGE_PROPS`
  - `src/components/social/FeedOutfitCard.tsx`
  - `src/components/social/FeedLookbookCarousel.tsx`
- `GRID_IMAGE_PROPS`
  - `src/components/outfits/OutfitCard.tsx`
  - `src/components/lookbooks/LookbookCard.tsx`
  - `src/components/lookbooks/LookbookCreatorPanel.tsx`
  - `src/components/lookbooks/SystemLookbookCard.tsx`
  - `src/components/calendar/CalendarDayCell.tsx`
  - `src/components/calendar/EntryCard.tsx`
  - `src/components/calendar/OutfitGridPicker.tsx`
  - `src/components/outfits/CategorySlotSelector.tsx`
  - `src/components/outfits/ItemPickerModal.tsx`
  - `src/components/outfits/OutfitNavigation.tsx`
  - `src/components/outfits/CategorySelector.tsx`
  - `src/components/wardrobe/ItemCard.tsx`
  - `src/components/wardrobe/ItemNavigation.tsx`
  - `src/components/wardrobe/NavigationSlider.tsx`
  - `src/components/wardrobe/PanelCards.tsx`
  - `src/components/wardrobe/HeadshotSelectorCard.tsx`
- `DETAIL_IMAGE_PROPS`
  - `src/components/wardrobe/ItemDetailModal.tsx`
  - `src/components/wardrobe/headshot-selector/DetailView.tsx`
  - `src/components/wardrobe/headshot-selector/CameraView.tsx`
  - `src/components/shared/images/ImageCarousel.tsx`

Added missing Group B props where required:

- `transition={200}` and/or `cachePolicy="memory-disk"` and/or `recyclingKey` in:
  - `src/components/social/DiscoverGrid.tsx`
  - `src/components/social/FeedCard.tsx`
  - `src/components/social/FeedItem.tsx`
  - `src/components/social/HeadshotFeedCard.tsx`
  - `src/components/social/SlideshowSlide.tsx`
  - `src/components/profile/ProfileTabs.tsx`
  - `src/components/profile/ProfileImageGallery.tsx`
  - `src/components/profile/HeadshotSection.tsx`
  - `src/components/profile/BodyShotSection.tsx`
  - `src/components/lookbooks/LookbookOutfitGrid.tsx`
  - `src/components/lookbooks/AddOutfitsModal.tsx`
  - `src/components/outfits/MyOutfitFeedCard.tsx`
  - `src/components/outfits/MyOutfitsItemRenderers.tsx`
  - `src/components/wardrobe/headshot-selector/GridView.tsx`
  - `src/components/shared/GenerationThumbnailStrip.tsx`

## 3) Import conversions (RN Image -> expo-image)

Converted from React Native `Image` to `expo-image`:

- `src/components/shared/layout/HeaderAvatarButton.tsx`

All other Group A targets were already on `expo-image`; only missing prop standardization was applied.

## 4) recyclingKey additions (and key used)

Added `recyclingKey` to all requested list/grid/feed render contexts:

- Feed/grid/list cards:
  - `FeedOutfitCard`: `imageUrl`
  - `FeedLookbookCarousel`: `thumbnailUrl`, `outfit.id`
  - `OutfitCard`: `outfit.id`
  - `LookbookCard`: `thumbnailUrl`
  - `LookbookCreatorPanel`: `item.id` (both collapsed/expanded draggable lists)
  - `OutfitGridPicker`: `item.id`
  - `ItemPickerModal`: `item.id`
  - `ItemCard`: `item.id`
  - `DiscoverGrid`: `entityId`
  - `LookbookOutfitGrid`: `item.id`
  - `AddOutfitsModal`: `item.id`
  - `MyOutfitFeedCard`: `outfit.id`
  - `MyOutfitsItemRenderers`: `item.id`
  - `GridView` (headshot selector): `item.id`
  - `GenerationThumbnailStrip`: `item.id`
  - `ProfileTabs`: `img.id` (headshots/bodyshots)
- Avatar/detail/other image contexts updated in Phase 2E scope:
  - `FeedCard` avatar: `item.owner.id`
  - `FeedItem` avatar: `item.owner.id`
  - `HeadshotFeedCard`: `headshot.id`
  - `SlideshowSlide`: `outfit.id`
  - `ProfileImageGallery`: `image.id`
  - `HeadshotSection`: `activeHeadshotId || headshotImageUrl`, `uploadedUri`
  - `BodyShotSection`: `activeBodyShotId || bodyShotImageUrl`, `uploadedUri`
  - `CalendarDayCell`: `firstEntry?.outfit_id || imageUrl`, and static silhouette key
  - `EntryCard`: `entry.outfit_id || imageUrl`
  - `OutfitNavigation`: `navOutfit.id`
  - `CategorySlotSelector`: `selectedItem.id`
  - `CategorySelector`: `selectedItem.id`
  - `ItemNavigation`: `navItem.id`
  - `NavigationSlider`: `item.id`
  - `PanelCards`: `item.id`
  - `HeadshotSelectorCard`: `headshotUrl`
  - `ItemDetailModal`: `item.id`
  - `DetailView`: `headshot.id`
  - `CameraView`: `cameraUri`
  - `ImageCarousel`: `image.id`

## 5) Issues, edge cases, and decisions

- Kept detail/single-outfit URL behavior full-resolution by default (`size = 'full'`), as required.
- Applied `'card'` transforms only to required grid/list/feed generation points.
- Kept explicit `contentFit` where needed after spread (detail-style overrides remain explicit).
- `src/lib/images.ts` now re-exports Phase 2B defaults/transforms so components can import from `@/lib/images` consistently.
- Validation:
  - `npm run typecheck` currently fails due an environment/project baseline issue unrelated to Phase 2E changes:
    - `TS2688: Cannot find type definition file for 'jest'`.
