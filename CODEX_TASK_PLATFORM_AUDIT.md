# Codex Task: Platform Compatibility — Search, Validate & Fix

## Branch: `codex/optimise`
## Pre-requisite: Merge `int/preview` into `codex/optimise` first (it's behind by ~5 commits including wardrobe browser modal and the optimization merge)

## Context
You are working on a React Native / Expo app that targets iOS, Android, and Web. The head developer has written a detailed audit at `PLATFORM_COMPATIBILITY_AUDIT.md` in the repo root. Your job is to **validate every finding, then implement the fixes in the order specified**.

### CRITICAL: What's Already Solved
The following features ALREADY have web implementations. Do NOT create duplicates:
- **Clothing Grid**: `clothing-grid.js` (web) coexists with `clothing-grid.native.ts` (native)
- **Canvas Trimmer**: `canvasTrimmer.js` (web) coexists with `canvasTrimmer.native.ts` (native)
- **Image Cropper**: `ImageCropper.tsx` uses `react-easy-crop` on web, returns null on native
- **Canvas Utils**: `canvasUtils.ts` provides `getCroppedImg()` for web canvas cropping
- **Image Compression**: `image-compression.ts` already branches on `Platform.OS`
- **Image Helpers**: `image-helpers.ts` already branches on `Platform.OS`
- **Headshot Camera Selector**: `headshot-selector/CameraView.tsx` does NOT use expo-camera — it's a display-only component

---

## PHASE A — Validation Search (Read-Only)

Run these searches and compile results. Do NOT modify any files in this phase.

### Search 1: Find ALL native-only imports
Search every `.ts` and `.tsx` file for imports from these packages:
- `expo-camera`
- `expo-media-library`
- `expo-haptics`
- `expo-file-system`
- `expo-image-manipulator`
- `@shopify/react-native-skia`
- `react-native-worklets`

For each match, record: **file path, line number, what is imported, and whether a Platform.OS guard exists**.

**Expected findings** (from audit):
- `expo-camera`: `WardrobeCameraOverlay.tsx` (line 18), `useWardrobeCamera.ts` (lines 9-10)
- `expo-media-library`: `useWardrobeCamera.ts` (line 11)
- `expo-haptics`: `EdgePeekSlider.tsx` (line 9)
- `@shopify/react-native-skia`: `HeadshotDrawingCanvas.native.tsx` (line 28), `CropEditor.tsx` (line 27)
- `expo-image-manipulator`: `CropEditor.tsx` (line 29), `image-compression.ts`, `image-helpers.ts`
- `expo-file-system`: `image-helpers.ts`

Flag any NEW occurrences not listed above.

### Search 2: Find ALL Platform.OS checks
Search for `Platform.OS`, `Platform.select` across `src/` and `app/`. Verify each properly handles the `'web'` case.

### Search 3: Find ALL platform-specific files
Look for files matching: `*.native.tsx`, `*.native.ts`, `*.web.tsx`, `*.web.ts`
For each `.native.*` file, verify the web counterpart exists.

**Expected pairs**:
- `HeadshotDrawingCanvas.native.tsx` ↔ `HeadshotDrawingCanvas.tsx` (stub, returns null)
- `clothing-grid.native.ts` ↔ `clothing-grid.js` (full web implementation)
- `canvasTrimmer.native.ts` ↔ `canvasTrimmer.js` (full web implementation)

### Search 4: Trace import chains for crash risk
Starting from `app/(tabs)/wardrobe.tsx`, trace ALL imports to find any path that leads to a native-only package without a Platform guard. The known crash path is:
```
wardrobe.tsx → useWardrobeCamera → expo-camera (CRASH)
wardrobe.tsx → WardrobeModalStack → WardrobeCameraOverlay → expo-camera (CRASH)
wardrobe.tsx → WardrobeModalStack → WardrobeCameraOverlay → CropEditor → Skia (CRASH)
```

---

## PHASE B — Gap Analysis

Compare your Phase A findings against `PLATFORM_COMPATIBILITY_AUDIT.md` sections 3.1 through 3.14. Write a brief summary:

1. **Confirmed findings** — items validated by search
2. **New findings** — native-only code the audit missed (if any)
3. **False positives** — items in the audit that are fine on web

---

## PHASE C — Implementation

### Phase 1 — Stop Crashes (P0) — HIGHEST PRIORITY

**Task 1a: Create `src/components/wardrobe/WardrobeCameraOverlay.web.tsx`**

This is a web-safe replacement for the native camera overlay. On web, there is no camera hardware access, so show a file upload interface instead.

Requirements:
- Accept the same props as `WardrobeCameraOverlay.tsx` (read its `WardrobeCameraOverlayProps` interface)
- Instead of rendering `CameraView`, show a centered upload area with an icon and "Upload Photo" button
- Use `expo-image-picker` `launchImageLibraryAsync()` for file selection (this works on web)
- After selection, pass the image URI to `ImageCropper` (the existing web crop component) for 1:1 crop
- Call `onCapture(croppedUri)` with the result
- Do NOT import `expo-camera`, `expo-media-library`, or `@shopify/react-native-skia`
- Style to match the app's theme (use `useThemeColors()` and `theme` from `@/styles`)

Then rename the existing `WardrobeCameraOverlay.tsx` to `WardrobeCameraOverlay.native.tsx` so Metro resolves the correct file per platform.

**Task 1b: Split `src/hooks/wardrobe/useWardrobeCamera.ts`**

The current hook imports `expo-camera` and `expo-media-library` at the top level, which crashes on web.

Option A (preferred): Rename to `useWardrobeCamera.native.ts` and create `useWardrobeCamera.ts` (web default) that:
- Returns the same hook interface (`UseWardrobeCameraReturn`)
- Replaces camera capture with `expo-image-picker.launchImageLibraryAsync()`
- Skips gallery thumbnail (set to null)
- Skips camera permissions (not needed on web)

Option B: Add `Platform.OS !== 'web'` guards around every expo-camera and expo-media-library call in the existing file, with web fallbacks inline.

**Task 1c: Guard `expo-haptics` in `src/components/shared/EdgePeekSlider.tsx`**

Wrap the import and usage:
```tsx
// Replace:
import * as Haptics from 'expo-haptics';

// With:
import { Platform } from 'react-native';
let Haptics: any = null;
if (Platform.OS !== 'web') {
  Haptics = require('expo-haptics');
}

// And guard all Haptics.* calls:
if (Haptics) { Haptics.impactAsync(...); }
```

**Commit after Phase 1**: `Phase 1: Guard native-only imports for web safety (P0 fix)`

---

### Phase 2 — Drawing Canvas (P1) — LARGEST EFFORT

**Task 2a: Create `src/components/headshots/HeadshotDrawingCanvas.web.tsx`**

This is a full web implementation of the drawing canvas that currently only works on native via Skia.

Read the existing files first:
- `HeadshotDrawingCanvas.native.tsx` — understand the Skia implementation and ref interface
- `HeadshotDrawingCanvas.tsx` — current web stub (returns null)
- `src/lib/headshot/drawingColors.ts` — the 8-colour category system
- `src/hooks/headshot/useDrawModeLogic.ts` — the hook that drives the canvas

Requirements:
- Use an HTML5 `<canvas>` element (access via `useRef<HTMLCanvasElement>`)
- Note: `react-native-web` supports raw DOM elements via the `ref` prop on `View` or via `document.createElement`
- Implement the `HeadshotDrawingCanvasRef` interface:
  - `getSnapshot(): Promise<string | null>` — returns base64 PNG of canvas
  - `getMaskSnapshot(): Promise<{ uri: string; colors: DrawnColorEntry[] } | null>` — returns base64 PNG mask + color map
  - `clearAll(): void`
  - `undo(): void`
  - `redo(): void`
  - `canUndo: boolean`
  - `canRedo: boolean`
- Drawing:
  - Track strokes as arrays of `{x, y}` points with associated color
  - Render strokes as smooth paths (use `ctx.beginPath()`, `ctx.moveTo()`, `ctx.lineTo()`, `ctx.stroke()`)
  - Stroke width should match native (read from native implementation)
- Zoom:
  - Scroll wheel → zoom (1x to 4x, same as native)
  - CSS `transform: scale()` on the canvas container
  - When zoomed, drag to pan
- Mask export:
  - Create a second off-screen canvas
  - Draw only the strokes (no background) on white-on-black or colour-on-transparent
  - Export as PNG data URL
- Match the component's prop types from the native version

**Task 2b: Update `src/hooks/headshot/useDrawModeLogic.ts` for web**

The hook currently uses:
- `react-native-reanimated` `useSharedValue` / `useAnimatedStyle` / `withSpring`
- `react-native-gesture-handler` `Gesture.Pan()`, `Gesture.Pinch()`, etc.

These have web support via their respective packages, but the gesture composition may need testing. If gestures don't work on web:
- Add a `Platform.OS === 'web'` branch that uses `onPointerDown`/`onPointerMove`/`onPointerUp` mouse events
- Map scroll wheel to zoom
- Keep the reanimated animated styles (they work on web)

**Task 2c: Remove Draw button platform guard**

In `src/components/headshots/MirrorTabContent.tsx` line 364, change:
```tsx
{previewHasImage && Platform.OS !== 'web' && (
```
to:
```tsx
{previewHasImage && (
```

**Commit after Phase 2**: `Phase 2: Implement HTML5 Canvas drawing for web (P1 fix)`

---

### Phase 3 — Polish (P2/P3)

**Task 3a: Edge swipe web guard**

In `src/hooks/useEdgeSwipe.tsx`, add an early return for web:
```tsx
export function useEdgeSwipe(...) {
  if (Platform.OS === 'web') {
    return { /* no-op handlers */ };
  }
  // ... existing implementation
}
```

**Task 3b: Haptics guard verification**

Verify the Phase 1 haptics guard works. If `expo-haptics` is imported elsewhere (unlikely based on search), guard those too.

**Commit after Phase 3**: `Phase 3: Disable edge swipe and guard haptics on web (P2/P3 polish)`

---

## Rules

1. **Do not modify native behaviour** — all changes must be additive `.web.*` / `.native.*` files or guarded with `Platform.OS === 'web'` checks. Existing iOS/Android functionality must remain identical.
2. **Match interfaces** — every `.web.*` component must accept the same props and expose the same ref methods as its `.native.*` counterpart.
3. **Use existing dependencies** — `react-easy-crop` and `browser-image-compression` are already in `package.json`. Do not add new packages without documenting why.
4. **Follow existing patterns** — look at:
   - `HeadshotDrawingCanvas.tsx` (existing web stub) for the stub pattern
   - `ImageCropper.tsx` for how to build a web-only component with `Platform.OS` guard
   - `clothing-grid.js` + `clothing-grid.native.ts` for the file-extension split pattern
   - `image-compression.ts` for inline `Platform.OS` branching
5. **Do NOT create files that already exist** — `clothing-grid.web.ts`, `canvasTrimmer.web.ts`, `CropEditor.web.tsx` are NOT needed. These already have web implementations (see "What's Already Solved" above).
6. **Test mental model** — before creating each web file, trace the import chain from the app route to confirm the component actually loads on web. Don't create stubs for components that are already unreachable on web.
7. **Commit after each phase** — use descriptive commit messages.
