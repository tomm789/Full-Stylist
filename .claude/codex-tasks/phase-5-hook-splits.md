# Task: Split large hooks by concern

## Files to read first
- `src/hooks/wardrobe/useWardrobeItemDetail.ts` (659 lines)
- `src/hooks/profile/useImageGeneration.ts` (597 lines)
- `src/hooks/wardrobe/useAddWardrobeItem.ts` (524 lines)
- `src/hooks/wardrobe/index.ts` (barrel)
- `src/hooks/profile/index.ts` (barrel)

## Overview

Extract self-contained sub-concerns from three large hooks into smaller files. Each original hook becomes an orchestrator that composes the new sub-hooks. **Public API of each hook must not change.** No screen file modifications needed.

---

## Hook 1: `useWardrobeItemDetail.ts` (659 lines)

### 1a. Create `src/hooks/wardrobe/useWardrobeItemDisplay.ts`

Move from `useWardrobeItemDetail.ts`:
- The `activeImageId` state (line 81)
- The useEffect that sets activeImageId based on displayImages (lines 604-622)
- The `displayImagesOrdered` useMemo (lines 625-633)

```tsx
import { useState, useEffect, useMemo } from 'react';

interface DisplayImage {
  id: string;
  image_id: string;
  type: string;
  image: any;
}

interface UseWardrobeItemDisplayProps {
  displayImages: DisplayImage[];
}

export function useWardrobeItemDisplay({ displayImages }: UseWardrobeItemDisplayProps) {
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  // Single source of truth: prefer generated (product_shot) when present
  useEffect(() => {
    // [paste lines 605-621 exactly]
  }, [displayImages]);

  // Reorder so active image is first; carousel shows index 0 = active
  const displayImagesOrdered = useMemo(() => {
    // [paste lines 626-633 exactly]
  }, [displayImages, activeImageId]);

  return { activeImageId, displayImagesOrdered };
}
```

### 1b. Create `src/hooks/wardrobe/usePeriodicRefresh.ts`

Move from `useWardrobeItemDetail.ts`:
- `periodicImageRefreshRef`, `periodicImageTimeoutRef` (lines 99-100)
- `periodicAttributeRefreshRef`, `periodicAttributeTimeoutRef` (lines 101-102)
- `startPeriodicImageRefresh` function (lines 105-125)
- `stopPeriodicImageRefresh` function (lines 127-136)
- `startPeriodicAttributeRefresh` function (lines 138-157)
- `stopPeriodicAttributeRefresh` function (lines 159-168)

```tsx
import { useRef, useEffect } from 'react';

interface UsePeriodicRefreshProps {
  refreshImages: () => Promise<void>;
  refreshAttributes: () => Promise<void>;
  /** Called when image refresh timeout expires (stop showing spinner). */
  onImageRefreshTimeout: () => void;
  itemId: string | undefined;
}

export function usePeriodicRefresh({
  refreshImages,
  refreshAttributes,
  onImageRefreshTimeout,
  itemId,
}: UsePeriodicRefreshProps) {
  const periodicImageRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const periodicImageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicAttributeRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const periodicAttributeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPeriodicImageRefresh = () => {
    // [paste lines 106-124 exactly]
    // CHANGE: replace `await data.refreshImages()` with `await refreshImages()`
    // CHANGE: replace `setIsGeneratingProductShot(false)` with `onImageRefreshTimeout()`
  };

  const stopPeriodicImageRefresh = () => {
    // [paste lines 128-135 exactly]
  };

  const startPeriodicAttributeRefresh = () => {
    // [paste lines 140-156 exactly]
    // CHANGE: replace `await data.refreshAttributes()` with `await refreshAttributes()`
  };

  const stopPeriodicAttributeRefresh = () => {
    // [paste lines 160-167 exactly]
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPeriodicImageRefresh();
      stopPeriodicAttributeRefresh();
    };
  }, []);

  return {
    startPeriodicImageRefresh,
    stopPeriodicImageRefresh,
    startPeriodicAttributeRefresh,
    stopPeriodicAttributeRefresh,
  };
}
```

### 1c. Update `useWardrobeItemDetail.ts`

After extraction:
- Import `useWardrobeItemDisplay` from `./useWardrobeItemDisplay`
- Import `usePeriodicRefresh` from `./usePeriodicRefresh`
- Remove the moved code (activeImageId state, the two display effects/memo, the 4 periodic refs, 4 periodic functions)
- Call the sub-hooks:

```tsx
const periodicRefresh = usePeriodicRefresh({
  refreshImages: data.refreshImages,
  refreshAttributes: data.refreshAttributes,
  onImageRefreshTimeout: () => setIsGeneratingProductShot(false),
  itemId,
});

// ... after data is available:
const { activeImageId, displayImagesOrdered } = useWardrobeItemDisplay({
  displayImages: data.displayImages,
});
```

- Replace all references to `startPeriodicImageRefresh()` → `periodicRefresh.startPeriodicImageRefresh()`
- Replace all references to `stopPeriodicImageRefresh()` → `periodicRefresh.stopPeriodicImageRefresh()`
- Same for attribute refresh functions
- Replace `displayImagesOrdered` usage in return with the one from the sub-hook
- The cleanup in the main `useEffect` return (lines 581-589) should remove the `stopPeriodicImageRefresh()` and `stopPeriodicAttributeRefresh()` calls (cleanup is now in `usePeriodicRefresh`)
- The `useEffect` that checks `isGeneratingProductShot` when images refresh (lines 593-601) STAYS in the orchestrator (it depends on `isGeneratingProductShot` + calls `stopPeriodicImageRefresh`)

Return statement stays exactly the same.

---

## Hook 2: `useImageGeneration.ts` (597 lines)

### 2a. Create `src/hooks/profile/useImagePicker.ts`

Move from `useImageGeneration.ts`:
- `uploadedUri` state (line 72)
- `uploadedBlob` state (line 73)
- `applyPickedAsset` function (lines 80-88)
- `isPortraitFourByThree` function (lines 90-94)
- `centerCropToAspect` function (lines 96-121)
- `pickImage` function (lines 123-163)
- `pickHeadshotCameraImage` function (lines 165-167)
- `pickBodyShotCameraImage` function (lines 169-171)
- `pickHeadshotLibraryImage` function (lines 173-206)
- `clearImage` function (lines 208-211)

```tsx
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { uriToBlob } from '@/lib/utils/image-helpers';

export interface UseImagePickerReturn {
  uploadedUri: string | null;
  uploadedBlob: Blob | null;
  pickImage: (
    useCamera?: boolean,
    options?: {
      cameraType?: 'front' | 'back';
      allowsEditing?: boolean;
      aspect?: [number, number];
    }
  ) => Promise<void>;
  pickHeadshotCameraImage: () => Promise<void>;
  pickHeadshotLibraryImage: () => Promise<void>;
  pickBodyShotCameraImage: () => Promise<void>;
  clearImage: () => void;
}

export function useImagePicker(): UseImagePickerReturn {
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);

  // [paste applyPickedAsset, isPortraitFourByThree, centerCropToAspect,
  //  pickImage, pickHeadshotCameraImage, pickBodyShotCameraImage,
  //  pickHeadshotLibraryImage, clearImage — all unchanged]

  return {
    uploadedUri,
    uploadedBlob,
    pickImage,
    pickHeadshotCameraImage,
    pickHeadshotLibraryImage,
    pickBodyShotCameraImage,
    clearImage,
  };
}
```

### 2b. Update `useImageGeneration.ts`

After extraction:
- Import `useImagePicker` from `./useImagePicker`
- Remove all moved code
- Remove `ImagePicker`, `ImageManipulator`, and `uriToBlob` imports (now only in useImagePicker)
- Call the sub-hook at the top:

```tsx
const {
  uploadedUri,
  uploadedBlob,
  pickImage,
  pickHeadshotCameraImage,
  pickHeadshotLibraryImage,
  pickBodyShotCameraImage,
  clearImage,
} = useImagePicker();
```

- All generation functions (`generateHeadshot`, `generateBodyShot`, `generateBodyShotFromSelfies`, `saveUploadedImage`) continue to reference `uploadedUri` and `uploadedBlob` as local variables — no changes needed in their logic
- Return statement stays exactly the same

---

## Hook 3: `useAddWardrobeItem.ts` (524 lines)

### 3a. Create `src/hooks/wardrobe/useAddWardrobeImages.ts`

Move from `useAddWardrobeItem.ts`:
- `selectedImages` state (line 62)
- `cropperVisible` state (line 71)
- `cropperImageUri` state (line 72)
- `centerCropToSquare` callback (lines 78-98)
- `handleTakePhoto` callback (lines 275-306)
- `handleUploadPhoto` callback (lines 308-341)
- `removeImage` callback (lines 343-345)
- `addImageFromUri` callback (lines 347-362)
- `handleCropperCancel` callback (lines 364-367)
- `handleCropperDone` callback (lines 369-398)

The `SelectedImage` interface (lines 24-28) should be moved here and exported.

```tsx
import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface SelectedImage {
  uri: string;
  type: string;
  name: string;
}

export interface UseAddWardrobeImagesReturn {
  selectedImages: SelectedImage[];
  setSelectedImages: (images: SelectedImage[]) => void;
  handleTakePhoto: () => Promise<void>;
  handleUploadPhoto: () => Promise<void>;
  addImageFromUri: (uri: string) => Promise<void>;
  removeImage: (index: number) => void;
  cropperVisible: boolean;
  cropperImageUri: string | null;
  handleCropperCancel: () => void;
  handleCropperDone: (blob: Blob, fileName: string) => void;
}

export function useAddWardrobeImages(): UseAddWardrobeImagesReturn {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [cropperVisible, setCropperVisible] = useState(false);
  const [cropperImageUri, setCropperImageUri] = useState<string | null>(null);

  // [paste centerCropToSquare, handleTakePhoto, handleUploadPhoto,
  //  removeImage, addImageFromUri, handleCropperCancel, handleCropperDone
  //  — all unchanged]

  return {
    selectedImages,
    setSelectedImages,
    handleTakePhoto,
    handleUploadPhoto,
    addImageFromUri,
    removeImage,
    cropperVisible,
    cropperImageUri,
    handleCropperCancel,
    handleCropperDone,
  };
}
```

### 3b. Update `useAddWardrobeItem.ts`

After extraction:
- Import `useAddWardrobeImages` from `./useAddWardrobeImages`
- Import `SelectedImage` type from `./useAddWardrobeImages`
- Remove the `SelectedImage` interface definition
- Remove `ImagePicker` and `ImageManipulator` imports
- Remove all moved code
- Call the sub-hook at the top:

```tsx
const {
  selectedImages,
  setSelectedImages,
  handleTakePhoto,
  handleUploadPhoto,
  addImageFromUri,
  removeImage,
  cropperVisible,
  cropperImageUri,
  handleCropperCancel,
  handleCropperDone,
} = useAddWardrobeImages();
```

- The `handleSubmit` callback uses `selectedImages` — it stays as-is since `selectedImages` is in scope from destructuring
- Return statement stays exactly the same

---

## Barrel export updates

### `src/hooks/wardrobe/index.ts`

No changes needed. `useWardrobeItemDetail` and `useAddWardrobeItem` keep their existing exports. The new sub-hooks (`useWardrobeItemDisplay`, `usePeriodicRefresh`, `useAddWardrobeImages`) are internal implementation details — do NOT add them to the barrel.

### `src/hooks/profile/index.ts`

No changes needed. `useImageGeneration` keeps its existing export. `useImagePicker` is an internal implementation detail — do NOT add it to the barrel.

---

## Constraints

- Do NOT change any public API (return types, parameter types, exported names)
- Do NOT change any screen files — they import from the barrel or from the orchestrator only
- Do NOT change any hook behavior, logging, or timing logic
- Move code exactly as-is; only change internal variable references as noted (e.g., `data.refreshImages()` → `refreshImages()`)
- Keep all `__DEV__` guards and console.log statements
- New sub-hook files should have the same JSDoc-style file header as their parent

## Acceptance criteria

- [ ] `src/hooks/wardrobe/useWardrobeItemDisplay.ts` exists, exports `useWardrobeItemDisplay`
- [ ] `src/hooks/wardrobe/usePeriodicRefresh.ts` exists, exports `usePeriodicRefresh`
- [ ] `src/hooks/profile/useImagePicker.ts` exists, exports `useImagePicker`
- [ ] `src/hooks/wardrobe/useAddWardrobeImages.ts` exists, exports `useAddWardrobeImages` and `SelectedImage`
- [ ] `useWardrobeItemDetail.ts` composes `useWardrobeItemDisplay` and `usePeriodicRefresh`; no longer contains the moved code
- [ ] `useImageGeneration.ts` composes `useImagePicker`; no longer contains the moved code
- [ ] `useAddWardrobeItem.ts` composes `useAddWardrobeImages`; no longer contains the moved code
- [ ] Barrel files (`src/hooks/wardrobe/index.ts`, `src/hooks/profile/index.ts`) are unchanged
- [ ] No TypeScript errors (pre-existing jest type error is OK)
- [ ] `UseWardrobeItemDetailReturn`, `UseImageGenerationReturn`, `UseAddWardrobeItemReturn` interfaces unchanged
