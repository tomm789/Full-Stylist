# Full Stylist — Platform Compatibility Audit & Web Optimisation Directive

**Author**: Head Developer (Claude Opus)
**Date**: 2026-03-02
**Updated**: 2026-03-03 (validated against int/preview @ 15b0d93 and codex/optimise @ cf72f93)
**Branch**: `codex/optimise`
**Scope**: Identify every native-only feature, document web gaps, and implement optimal alternatives per platform.

---

## 1. Executive Summary

Full Stylist is built with Expo (React Native) targeting iOS, Android, and Web. Several critical features depend on native-only packages (`@shopify/react-native-skia`, `expo-camera`, `expo-media-library`) and have **no web implementation or fallback**. This audit catalogues every platform gap and prescribes the optimal web alternative for each.

**Key Finding**: 8 features are broken or missing on web. 5 already have stubs/fallbacks. 3 need new implementations.

### Recent Changes Since Original Audit (2026-03-02)

The following changes were merged into `int/preview` since the original audit was written:

1. **Phase 2A–2F Optimization Pass** (merged via `codex/optimise` → commit 9e6230d):
   - Extracted route flows: `useWardrobeCameraFlow.ts`, `useCreatorReset.ts`, `useOutfitSelectionFlow.ts`, `useGenerateOutfitFlow.ts`
   - Extracted components: `SessionPreviewStrip.tsx`, `WardrobeModalStack.tsx`
   - Decomposed hooks: `useWardrobeItemJobs.ts`, `useWardrobeItemCache.ts`, `useItemPicker.ts`, `useRenderPipeline.ts`, `useSaveAndArchive.ts`, `useOutfitNavigation.ts`
   - New shared utils: `src/lib/utils/timers.ts`, `src/utils/batchImageHelpers.ts`
   - **None of these introduce new platform compatibility issues** — all use universal APIs only.

2. **Wardrobe Browser Modal** (merged from `codex/wardrobe-browser-modal` → commit 15b0d93):
   - New files: `WardrobeBrowserModal.tsx`, `BrowserCategoryBar.tsx`, `useWardrobeBrowser.ts`
   - **Fully cross-platform** — no native-only imports, only safe `Platform.OS === 'ios'` for modal presentation style.
   - **NOTE**: These 3 files are on `int/preview` but NOT yet on `codex/optimise`. Codex should merge `int/preview` first, or these files will be absent.

3. **Existing Web Implementations Already In Place**:
   - `src/utils/clothing-grid.js` — **Web version already exists** alongside `clothing-grid.native.ts`. Uses HTML5 Canvas + DOM APIs. Metro resolves `.native.ts` on native and `.js` on web.
   - `src/utils/canvasTrimmer.js` — **Web version already exists** alongside `canvasTrimmer.native.ts`. Uses HTML5 Canvas `getImageData()`.
   - `src/components/wardrobe/ImageCropper.tsx` — **Web-only crop component already exists**, uses `react-easy-crop`. Returns `null` on native (guarded with `Platform.OS !== 'web'`).
   - `src/utils/canvasUtils.ts` — **Web crop helper already exists**, provides `getCroppedImg()` using DOM Canvas.

---

## 2. Architecture Context

### Platform Resolution
Metro selects files by extension:
- `.native.tsx` / `.native.ts` → iOS / Android
- `.web.tsx` / `.web.ts` → Web (if present)
- `.tsx` / `.ts` / `.js` → Default fallback (web uses this if no `.web.*` or `.native.*`)

**Important**: This project uses BOTH patterns:
- **File extension splitting**: `HeadshotDrawingCanvas.native.tsx` (Skia) + `HeadshotDrawingCanvas.tsx` (stub). Also `clothing-grid.native.ts` + `clothing-grid.js`.
- **Platform.OS guards**: `ImageCropper.tsx` returns null on native, renders on web. `image-helpers.ts` and `image-compression.ts` branch internally.

### Build Targets
| Target | Bundler | UI Layer |
|--------|---------|----------|
| iOS / Android | Metro | React Native |
| Web | Metro (Expo Web) | react-native-web + react-dom |

### Key Packages
| Package | Version | Platform |
|---------|---------|----------|
| `@shopify/react-native-skia` | 2.2.12 | Native only |
| `react-native-worklets` | 0.5.1 | Native only (Skia peer dep) |
| `expo-camera` | ~17.0.10 | Native only |
| `expo-media-library` | ~18.2.1 | Native only |
| `expo-image-picker` | ^17.0.10 | Has web stub (file input) |
| `expo-image-manipulator` | ^14.0.7 | Limited web support |
| `expo-haptics` | ~14.0.1 | Native only |
| `expo-file-system` | ^19.0.21 | Native only |
| `react-native-gesture-handler` | ~2.28.0 | Has web support |
| `react-native-reanimated` | ~4.1.1 | Has web support |
| `browser-image-compression` | ^2.0.2 | Web only |
| `react-easy-crop` | ^5.5.6 | Web only |

---

## 3. Feature-by-Feature Audit

### Legend
- **STATUS**: `BROKEN_WEB` = fails/missing on web | `STUB_EXISTS` = web stub returns null | `HAS_FALLBACK` = platform check routes to web code | `OK` = works on all platforms
- **PRIORITY**: P0 = crashes app on web | P1 = major feature missing | P2 = minor UX degradation | P3 = cosmetic

---

### 3.1 Drawing Canvas (Skia)

| Field | Value |
|-------|-------|
| **Status** | `STUB_EXISTS` — web stub returns null, feature invisible |
| **Priority** | P1 |
| **Native Files** | `src/components/headshots/HeadshotDrawingCanvas.native.tsx` |
| **Web Stub** | `src/components/headshots/HeadshotDrawingCanvas.tsx` (returns null) |
| **Dependencies** | `@shopify/react-native-skia`, `react-native-gesture-handler`, `react-native-reanimated` |
| **Used By** | `DrawModeModal.tsx`, `DrawModeInline.tsx` |
| **Hook** | `src/hooks/headshot/useDrawModeLogic.ts` |

**What it does on native**: GPU-accelerated drawing canvas with 8 colour categories (lips, eyeliner, eyeshadow, blush, foundation, brows, overall, hair). Supports 1-finger draw, 2-finger pinch-zoom (1x–4x), 2-finger pan, undo/redo, mask snapshot export as base64 PNG.

**Web alternative**: Implement `HeadshotDrawingCanvas.web.tsx` using **HTML5 Canvas API** (`<canvas>` element via `react-native-web`'s raw DOM access or a React wrapper).

**Implementation approach**:
1. Create `src/components/headshots/HeadshotDrawingCanvas.web.tsx`
2. Use HTML5 Canvas 2D context for stroke rendering
3. Map the same 8-colour system (see `src/lib/headshot/drawingColors.ts`)
4. Implement mouse/touch draw via `onPointerDown`/`onPointerMove`/`onPointerUp`
5. Implement zoom via scroll-wheel (`transform: scale()`) and drag-to-pan
6. Undo/redo via stroke history array (same pattern as native)
7. Export mask as PNG via `canvas.toDataURL('image/png')`
8. Match the `HeadshotDrawingCanvasRef` interface: `{ getSnapshot, getMaskSnapshot, clearAll, undo, redo, canUndo, canRedo }`

---

### 3.2 Draw Button Visibility

| Field | Value |
|-------|-------|
| **Status** | `BROKEN_WEB` — Draw button hidden via `Platform.OS !== 'web'` check |
| **Priority** | P1 (blocked by 3.1) |
| **File** | `src/components/headshots/MirrorTabContent.tsx` line 364 |

**Current code**:
```tsx
{previewHasImage && Platform.OS !== 'web' && (
  <PillButton label="Draw" icon="pencil-outline" ... />
)}
```

**Fix**: Once 3.1 is implemented, remove the `Platform.OS !== 'web'` guard so the Draw button appears on web.

---

### 3.3 Camera Capture (Wardrobe)

| Field | Value |
|-------|-------|
| **Status** | `BROKEN_WEB` — expo-camera has no web component |
| **Priority** | P0 (will crash if camera overlay opened on web) |
| **Files** | `src/components/wardrobe/WardrobeCameraOverlay.tsx` (imports `CameraView` from expo-camera), `src/hooks/wardrobe/useWardrobeCamera.ts` (imports `CameraView`, `useCameraPermissions`, `MediaLibrary`) |
| **Import Chain** | `app/(tabs)/wardrobe.tsx` line 80 → `useWardrobeCamera` → expo-camera. `WardrobeModalStack.tsx` → `WardrobeCameraOverlay` → expo-camera. |
| **Dependencies** | `expo-camera` (CameraView, useCameraPermissions), `expo-media-library` |

**What it does on native**: Full-screen camera overlay with front/back toggle, flash control, capture button, gallery thumbnail, lens selection. After capture, opens CropEditor for 1:1 crop.

**Web alternative — RECOMMENDED simpler approach**: On web, skip the camera overlay entirely and route directly to `expo-image-picker` (which already has web support via `<input type="file">`). Then pass the selected image through the existing `ImageCropper.tsx` (web-only crop component using `react-easy-crop`).

**Implementation approach**:
1. Create `src/components/wardrobe/WardrobeCameraOverlay.web.tsx` — a web-safe version that presents a file-upload UI using `expo-image-picker`
2. Add `Platform.OS !== 'web'` guard around `expo-media-library` calls in `useWardrobeCamera.ts` (gallery thumbnail fetch)
3. Add `Platform.OS !== 'web'` guard around `expo-camera` imports in `useWardrobeCamera.ts`, or better: split into `useWardrobeCamera.native.ts` + `useWardrobeCamera.web.ts`

---

### 3.4 Media Library Access

| Field | Value |
|-------|-------|
| **Status** | `BROKEN_WEB` — expo-media-library is native-only |
| **Priority** | P1 (tied to 3.3) |
| **File** | `src/hooks/wardrobe/useWardrobeCamera.ts` |

**What it does on native**: Fetches the most recent photo from device camera roll for a gallery thumbnail in the camera overlay.

**Web alternative**: Not applicable — browsers don't expose the photo library.

**Fix**: Guard with `Platform.OS !== 'web'` check. On web, show a static "Upload Photo" icon instead of the gallery thumbnail. The upload action should trigger `expo-image-picker` (which has web support via `<input type="file">`).

---

### ~~3.5 Crop Editor (Skia Overlay)~~ → ALREADY SOLVED

| Field | Value |
|-------|-------|
| **Status** | ~~`BROKEN_WEB`~~ → `HAS_FALLBACK` |
| **Priority** | ~~P1~~ → OK (no action needed) |

**UPDATE**: The web crop flow is already implemented:
- **Native**: `CropEditor.tsx` uses Skia + gesture handler + ImageManipulator for pinch-to-zoom crop
- **Web**: `ImageCropper.tsx` uses `react-easy-crop` + `canvasUtils.ts` `getCroppedImg()`. Returns `null` on native.
- The crop functionality works on BOTH platforms via different components. The parent flow needs to render the correct one per platform.

**Remaining concern**: Verify that the parent components (`WardrobeCameraOverlay`, `wardrobe/add.tsx`) properly route to `ImageCropper` on web instead of `CropEditor`. If `WardrobeCameraOverlay` is the only consumer of `CropEditor`, the web stub (3.3) will naturally bypass it.

---

### ~~3.6 Image Grid Generation (Skia)~~ → ALREADY SOLVED

| Field | Value |
|-------|-------|
| **Status** | ~~`BROKEN_WEB`~~ → `HAS_FALLBACK` |
| **Priority** | ~~P1~~ → OK (no action needed) |

**UPDATE**: Web version already exists:
- **Native**: `src/utils/clothing-grid.native.ts` — uses `@shopify/react-native-skia`
- **Web**: `src/utils/clothing-grid.js` — uses HTML5 Canvas DOM APIs
- Metro resolves `.native.ts` on native, falls back to `.js` on web.

---

### ~~3.7 Canvas Trimmer (Whitespace Removal)~~ → ALREADY SOLVED

| Field | Value |
|-------|-------|
| **Status** | ~~`BROKEN_WEB`~~ → `HAS_FALLBACK` |
| **Priority** | ~~P2~~ → OK (no action needed) |

**UPDATE**: Web version already exists:
- **Native**: `src/utils/canvasTrimmer.native.ts` — uses Skia pixel scanning
- **Web**: `src/utils/canvasTrimmer.js` — uses HTML5 Canvas `getImageData()` pixel scanning
- Metro resolves `.native.ts` on native, falls back to `.js` on web.

---

### 3.8 Haptic Feedback

| Field | Value |
|-------|-------|
| **Status** | `BROKEN_WEB` — expo-haptics is native-only |
| **Priority** | P3 (cosmetic UX) |
| **File** | `src/components/shared/EdgePeekSlider.tsx` line 9 (only usage in codebase) |

**Web alternative**: Wrap in `Platform.OS !== 'web'` guard. No web equivalent exists. Simply skip haptics on web — no user-facing impact.

---

### 3.9 File System Operations → OK

| Field | Value |
|-------|-------|
| **Status** | `HAS_FALLBACK` — already handles web via fetch/Blob |
| **Priority** | OK (no action needed) |
| **File** | `src/lib/utils/image-helpers.ts` |

**Current handling**: Platform checks at lines 48, 74, 137, 293 route native to `FileSystem.readAsStringAsync()` / `uploadAsync()` and web to `fetch()` + `Blob` API. Working as intended.

---

### 3.10 Image Compression → OK

| Field | Value |
|-------|-------|
| **Status** | `HAS_FALLBACK` — web uses `browser-image-compression` |
| **Priority** | OK (no action needed) |
| **File** | `src/utils/image-compression.ts` |

**Current handling**: `Platform.OS === 'web'` routes to `browser-image-compression`. Native uses `expo-image-manipulator`. Working as intended.

---

### 3.11 Image Picker → OK

| Field | Value |
|-------|-------|
| **Status** | `HAS_FALLBACK` — expo-image-picker has web support |
| **Priority** | OK (no action needed) |
| **Files** | Multiple hooks |

**Current handling**: `expo-image-picker` has a built-in `.web.ts` that uses `<input type="file">`. Working.

---

### 3.12 Layout Animation (Android)

| Field | Value |
|-------|-------|
| **Status** | `HAS_FALLBACK` — guarded with Platform.OS check |
| **Priority** | P3 |
| **Files** | `OutfitCreatorPanel.tsx`, `CategoryPills.tsx`, `LookbookCreatorPanel.tsx`, `BrowserCategoryBar.tsx` (new) |

**Current handling**: `UIManager.setLayoutAnimationEnabledExperimental` only called on Android. On web, LayoutAnimation is a no-op. No crash, but animations may not play.

**Web alternative**: CSS transitions via `react-native-web` style props. Low priority.

---

### 3.13 Edge Swipe Detection

| Field | Value |
|-------|-------|
| **Status** | `BROKEN_WEB` — uses PanGestureHandler with velocity detection |
| **Priority** | P2 |
| **File** | `src/hooks/useEdgeSwipe.tsx` |

**What it does**: Detects edge swipes (left/right/top/bottom) with velocity thresholds for camera/navigation.

**Web alternative**: Web gesture handler support exists but edge swipe UX doesn't translate well to desktop. On web, use explicit button/icon navigation instead of swipe gestures. Add `Platform.OS === 'web'` guard to disable edge swipe and ensure the button alternatives are visible.

---

### 3.14 Headshot Camera (Selector)

| Field | Value |
|-------|-------|
| **Status** | OK — does NOT use expo-camera |
| **Priority** | ~~P1~~ → OK (no action needed) |

**UPDATE**: Re-examined `src/components/wardrobe/headshot-selector/CameraView.tsx` — it does NOT import `expo-camera`. It's a UI-only component that shows mirror selfie instructions and a preview image. The actual camera capture is handled by the parent via `expo-image-picker` (which has web support). **No changes needed.**

---

## 4. Priority Matrix (Updated)

### P0 — App Crashes on Web
| # | Feature | Fix Complexity |
|---|---------|----------------|
| 3.3 | Camera Capture (wardrobe) — expo-camera + expo-media-library top-level imports | Medium — create `.web.tsx` stub or guard imports |

### P1 — Major Feature Missing on Web
| # | Feature | Fix Complexity |
|---|---------|----------------|
| 3.1 | Drawing Canvas (Skia stub returns null) | High — full HTML5 Canvas implementation |
| 3.2 | Draw Button hidden (blocked by 3.1) | Low — remove platform guard after 3.1 |

### P2 — Minor Feature Missing
| # | Feature | Fix Complexity |
|---|---------|----------------|
| 3.13 | Edge Swipe (gesture may not work on desktop) | Low — disable on web, ensure button nav |

### P3 — Cosmetic / No User Impact
| # | Feature | Fix Complexity |
|---|---------|----------------|
| 3.8 | Haptic Feedback | Low — wrap in platform guard |
| 3.12 | Layout Animation | Low — CSS transitions |

### Already Working (no action needed)
| # | Feature | How |
|---|---------|-----|
| 3.5 | Crop Editor | `ImageCropper.tsx` (react-easy-crop) on web, `CropEditor.tsx` (Skia) on native |
| 3.6 | Image Grid Generation | `clothing-grid.js` (Canvas) on web, `clothing-grid.native.ts` (Skia) on native |
| 3.7 | Canvas Trimmer | `canvasTrimmer.js` (Canvas) on web, `canvasTrimmer.native.ts` (Skia) on native |
| 3.9 | File System Operations | Platform guards in `image-helpers.ts` |
| 3.10 | Image Compression | `browser-image-compression` on web, `expo-image-manipulator` on native |
| 3.11 | Image Picker | `expo-image-picker` has built-in web support |
| 3.14 | Headshot Camera Selector | Does not use expo-camera, uses image picker |

---

## 5. Implementation Order (Recommended)

Work in this order to unblock features progressively:

### Phase 1 — Stop Crashes (P0)
1. **Guard `expo-camera` imports** in `WardrobeCameraOverlay.tsx`:
   - Option A (preferred): Create `WardrobeCameraOverlay.web.tsx` that uses `expo-image-picker` for file upload + `ImageCropper.tsx` for crop
   - Option B: Rename current file to `.native.tsx`, create new `.tsx` default with file-upload UI
2. **Guard `expo-media-library` and `expo-camera` imports** in `useWardrobeCamera.ts`:
   - Option A (preferred): Split into `useWardrobeCamera.native.ts` + `useWardrobeCamera.web.ts`
   - Option B: Add `Platform.OS !== 'web'` guards around all camera/media-library calls
3. **Guard `expo-haptics`** in `EdgePeekSlider.tsx` — wrap import/call with `Platform.OS !== 'web'`

### Phase 2 — Drawing Canvas (P1, largest effort)
4. **HeadshotDrawingCanvas.web.tsx** — Full HTML5 Canvas implementation matching `HeadshotDrawingCanvasRef` interface
5. **useDrawModeLogic web support** — The hook uses `react-native-reanimated` shared values and `react-native-gesture-handler` Gesture API. On web, reanimated has support but the gesture composition (1-finger draw + 2-finger pinch + 2-finger pan) may need mouse/wheel event mapping.
6. **Remove Draw button platform guard** in `MirrorTabContent.tsx` line 364

### Phase 3 — Polish (P2/P3)
7. **Edge swipe** — Add `Platform.OS === 'web'` early return in `useEdgeSwipe.tsx`
8. **Layout animations** — CSS transition fallbacks (optional, very low priority)

---

## 6. File Creation Checklist

New files to create:

```
src/components/wardrobe/WardrobeCameraOverlay.web.tsx         ← Phase 1 (file-upload UI)
src/hooks/wardrobe/useWardrobeCamera.web.ts                   ← Phase 1 (web-safe camera hook)
  — OR modify useWardrobeCamera.ts with Platform guards
src/components/headshots/HeadshotDrawingCanvas.web.tsx         ← Phase 2 (HTML5 Canvas drawing)
```

Existing files to modify:

```
src/hooks/wardrobe/useWardrobeCamera.ts          ← Phase 1: Guard expo-camera/media-library imports
src/components/shared/EdgePeekSlider.tsx          ← Phase 1: Guard expo-haptics import (line 9)
src/components/headshots/MirrorTabContent.tsx     ← Phase 2: Remove Draw button web guard (line 364)
src/hooks/useEdgeSwipe.tsx                        ← Phase 3: Add Platform.OS === 'web' early return
```

Files that do NOT need changes (web implementations already exist):

```
src/utils/clothing-grid.js                ← Web version of clothing-grid.native.ts ✓
src/utils/canvasTrimmer.js                ← Web version of canvasTrimmer.native.ts ✓
src/components/wardrobe/ImageCropper.tsx   ← Web crop component (react-easy-crop) ✓
src/utils/canvasUtils.ts                  ← Web crop helper ✓
src/lib/utils/image-helpers.ts            ← Already has Platform.OS guards ✓
src/utils/image-compression.ts            ← Already has Platform.OS guards ✓
```

---

## 7. Testing Checklist

After implementation, verify each feature on web:

- [ ] App loads without crashes on `npx expo start --web`
- [ ] Wardrobe tab: "Add item" shows file picker on web (no camera crash)
- [ ] Wardrobe tab: Crop works via ImageCropper (react-easy-crop) on web
- [ ] Hair & Makeup: Draw button visible on web (after Phase 2)
- [ ] Hair & Makeup: Drawing canvas renders on web with HTML5 Canvas
- [ ] Hair & Makeup: Undo/redo works on web drawing
- [ ] Hair & Makeup: Mask export (PNG) works on web
- [ ] Outfit creator: Clothing grid generates correctly on web (already working via clothing-grid.js)
- [ ] Headshot selector: Works on web (already using image picker, no camera)
- [ ] Edge swipe: Disabled on web, no gesture errors
- [ ] Haptics: No crash on web when slider used
- [ ] All modals: KeyboardAvoidingView doesn't break layout on web

---

## 8. Existing Patterns to Follow

### Pattern A — Platform-Specific File Extensions (preferred for large divergences)
```
Component.tsx          ← default / web version
Component.native.tsx   ← native-only version
```
Metro resolves `.native.tsx` on iOS/Android, falls back to `.tsx` on web.
**Used by**: `HeadshotDrawingCanvas`, `clothing-grid`, `canvasTrimmer`

### Pattern B — Platform.OS Guards (preferred for small divergences)
```tsx
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // native-only code
}
```
**Used by**: `image-helpers.ts`, `image-compression.ts`, `ImageCropper.tsx`, `MirrorTabContent.tsx`

### Pattern C — Web-Only Component With Native Null Return
```tsx
if (Platform.OS !== 'web') {
  return null;  // native has its own component/flow
}
// ... web-only implementation
```
**Used by**: `ImageCropper.tsx`

### Conditional Import Pattern (for heavy native packages)
```tsx
// Do NOT import expo-camera at the top of a file that runs on web
// Use platform file splitting instead
```

---

## 9. Import Chain Map (for P0 crash risk)

The critical question: which native-only imports are reachable from web routes?

```
app/(tabs)/wardrobe.tsx
  └─ imports useWardrobeCamera (line 80)
     └─ useWardrobeCamera.ts imports: expo-camera, expo-media-library  ← P0 CRASH
  └─ renders WardrobeModalStack
     └─ WardrobeModalStack.tsx imports WardrobeCameraOverlay (line 7)
        └─ WardrobeCameraOverlay.tsx imports: expo-camera, CropEditor
           └─ CropEditor.tsx imports: @shopify/react-native-skia, expo-image-manipulator  ← P0 CRASH

app/hair-and-make-up.tsx
  └─ renders MirrorTabContent (Draw button hidden on web ← P1 HIDDEN)
     └─ renders DrawModeModal/DrawModeInline
        └─ imports HeadshotDrawingCanvas
           └─ HeadshotDrawingCanvas.tsx (web stub, returns null) ← SAFE (won't crash, just hidden)

src/components/shared/EdgePeekSlider.tsx
  └─ imports expo-haptics (line 9) ← P3 (may or may not crash depending on tree-shaking)
```

**Conclusion**: The ONLY P0 crash path is `wardrobe.tsx` → `useWardrobeCamera` → `expo-camera` / `expo-media-library` and `WardrobeCameraOverlay` → `CropEditor` → `Skia`. Phase 1 fixes address this entire chain.
