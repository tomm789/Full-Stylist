# Implement Drawing Functionality for Localized Makeup Generation

We need to add a feature to the `app/hair-and-make-up.tsx` screen where users can draw on their headshot preview with specific semantic colors to guide AI makeup generation.

We will use `@shopify/react-native-skia` to implement a drawing canvas over the headshot. The user will select a makeup type, which sets a specific "control color" (e.g., pure magenta `#FF00FF` for lipstick), and draw on the image. Before generation, we capture the drawn canvas as a separate mask image to send to the AI.

## ⚠️ IMPORTANT: Safety Checks & Architecture Constraints
Before writing any code, carefully analyze the existing codebase and ensure your implementation accounts for the following constraints:

1. **Gesture Conflicts (two-layer problem)**:
   - The drawing canvas lives inside `HeadshotSlideItem`, which sits inside an `EdgePeekSlider`, which sits inside a `PanGestureHandler` in `hair-and-make-up.tsx`.
   - **Layer 1 — `EdgePeekSlider`**: `edgeSwipeEnabled` is already `false` on the `EdgePeekSlider` in `hair-and-make-up.tsx`, so the slider's own edge-swipe is not a concern. The `FlatList` inside `EdgePeekSlider` does use momentum scrolling, but drawing on the Skia canvas (a child view) will not interfere with horizontal FlatList scrolling as long as the drawing gesture is consumed before it reaches the FlatList.
   - **Layer 2 — outer `PanGestureHandler` (camera swipe)**: The entire screen is wrapped in a `PanGestureHandler` at line ~273 of `hair-and-make-up.tsx` (the `cameraSwipe` from `useEdgeSwipe`). Its `enabled` prop must also be set to `false` when `isDrawMode` is true, otherwise the camera-swipe gesture will compete with drawing strokes.
   - **Action:** Add `isDrawMode` state to `useHairAndMakeup.ts`. In `hair-and-make-up.tsx`, add `&& !isDrawMode` to the `cameraSwipe` `enabled` computation (the object passed to `useEdgeSwipe`). No changes to the `EdgePeekSlider` props are needed since `edgeSwipeEnabled` is already `false`.

2. **Payload Size Limits (`ai_jobs` Database)**:
   - **Check:** `triggerHeadshotGenerateWithPrompt` in `src/lib/ai-jobs/types.ts` calls `createAIJob`, which stores input in the `input_json` column. Embedding a large base64 mask string directly would bloat the table and may hit row-size limits.
   - **Action:** Use `uploadBase64ImageToStorage` from `src/lib/utils/image-helpers.ts` to upload the mask to Supabase Storage first. It returns `{ data: { path, fullPath } | null, error }` — store the `path` and pass it as `mask_storage_path` and `mask_storage_bucket` in the AI job input. **Do not** pass the raw base64 into `input_json`.

3. **Aspect Ratio Alignment**:
   - **Check:** `HeadshotSlideItem` uses `width: '100%', height: '100%'` with no explicit aspect ratio of its own. The 3/4 ratio is enforced by the parent `EdgePeekSlider` (`aspectRatio={3/4}` prop). The Skia `<Canvas>` must fill exactly the same pixel bounds as the `ExpoImage` — use `StyleSheet.absoluteFill` and do **not** set an independent `aspectRatio` style on the canvas.
   - **Action:** In `HeadshotDrawingCanvas`, give the `<Canvas>` `style={StyleSheet.absoluteFill}` so it overlays the image exactly. When `makeImageSnapshot()` is called, the snapshot will cover the full canvas bounds and align 1:1 with the underlying image.

4. **Skia `makeImageSnapshot()` returns `SkImage`, not a string**:
   - `canvasRef.current.makeImageSnapshot()` returns a Skia `SkImage` object. You must call `.encodeToBase64()` on it to obtain the base64 PNG string before returning from `makeMaskSnapshot`.

5. **`React.memo` + `forwardRef` composition in `HeadshotSlideItem`**:
   - `HeadshotSlideItem` is currently `React.memo(Component)`. Do **not** add `forwardRef` to `HeadshotSlideItem` itself. Instead, pass the ref as a regular typed prop (e.g., `drawingCanvasRef: React.RefObject<HeadshotDrawingCanvasRef>`). Apply `forwardRef` only to `HeadshotDrawingCanvas` to expose its `makeMaskSnapshot` method. This avoids the memo+forwardRef ordering pitfall.

6. **Backend storage download mismatch**:
   - The backend's existing `downloadImageFromStorage(supabase, imageId, ...)` in `netlify/functions/utils.js` expects an **image ID** from the `images` DB table, not a raw storage path. Since the mask is uploaded via `uploadBase64ImageToStorage` (which writes to storage only, no DB record), using `downloadImageFromStorage` would fail.
   - **Action:** In `headshot_generate.js`, when a `mask_storage_path` and `mask_storage_bucket` are present in the input, download the mask directly using `supabase.storage.from(mask_storage_bucket).download(mask_storage_path)`, convert the resulting Blob to a base64 string, and pass it to `callGeminiAPI` alongside `selfieResult`. Do not use `downloadImageFromStorage` for the mask.

## Implementation Steps:

### Step 1: Install Dependencies
Ensure `@shopify/react-native-skia` is installed (it is not currently in `package.json`). `react-native-gesture-handler` is already configured.

### Step 2: Create the Drawing Component
Create a new component at `src/components/headshots/HeadshotDrawingCanvas.tsx`.
1. Props: `drawingEnabled: boolean`, `currentColor: string`. (No need for `imageUrl` — the underlying `ExpoImage` is already rendered by `HeadshotSlideItem`.)
2. Wrap it with `React.forwardRef` to expose a `makeMaskSnapshot(): Promise<string | null>` function via `useImperativeHandle`.
3. Implement `Gesture.Pan()` from `react-native-gesture-handler` inside a Skia `GestureDetector`. Only activate the gesture if `drawingEnabled`.
4. Maintain a `paths` array in a Skia shared value (or `useState`) storing each stroke's path and color.
5. The `<Canvas>` should use `style={StyleSheet.absoluteFill}` so it overlays the parent image exactly.
6. The `makeMaskSnapshot` imperative function should:
   - Set a `maskMode` state to `true`, which changes the canvas background to pure black (`#000000`) and removes the photo from the render.
   - After a brief `requestAnimationFrame`/`setTimeout` to allow a re-render, call `canvasRef.current.makeImageSnapshot()` to get a `SkImage`.
   - Call `.encodeToBase64()` on the `SkImage` to obtain the base64 PNG string.
   - Set `maskMode` back to `false` to restore the normal view.
   - Return the base64 string.

### Step 3: Integrate into `HeadshotSlideItem`
Modify `src/components/headshots/HeadshotSlideItem.tsx`:
1. Add props: `drawingEnabled: boolean`, `currentColor: string`, and `drawingCanvasRef: React.RefObject<HeadshotDrawingCanvasRef>`.
2. Inside the component, when `isActive` is true and `item.url` is truthy, render `<HeadshotDrawingCanvas>` with `style={StyleSheet.absoluteFill}` absolutely positioned over the `ExpoImage`. Pass `drawingEnabled`, `currentColor`, and `ref={drawingCanvasRef}` to it.
3. Keep `HeadshotSlideItem` as `React.memo` — do **not** add `forwardRef` to it.

### Step 4: Update State in `useHairAndMakeup.ts`
Modify `src/hooks/headshot/useHairAndMakeup.ts`:
1. Add `const [isDrawMode, setIsDrawMode] = useState(false)`.
2. Add `const drawingCanvasRef = useRef<HeadshotDrawingCanvasRef>(null)`.
3. Add `currentDrawColor` computed from `editTab`: `'makeup' → '#FF00FF'`, `'hair' → '#00FFFF'`, others → a sensible default or `null` to disable drawing.
4. Update `handleGenerateVariation`:
   - If `isDrawMode` and `drawingCanvasRef.current`, call `const maskBase64 = await drawingCanvasRef.current.makeMaskSnapshot()`.
   - If `maskBase64`, call `uploadBase64ImageToStorage('user-images', \`${userId}/masks/mask-${Date.now()}.png\`, maskBase64, 'image/png')` to upload, capturing the returned `path` and bucket name.
   - Pass `mask_storage_path` and `mask_storage_bucket` into the options object given to `triggerHeadshotGenerateWithPrompt`.
5. Export `isDrawMode`, `setIsDrawMode`, `drawingCanvasRef`, and `currentDrawColor` from the hook's return object.

### Step 5: Update `triggerHeadshotGenerateWithPrompt` signature
Modify `src/lib/ai-jobs/types.ts`:
1. Add `maskStoragePath?: string` and `maskStorageBucket?: string` to the `options` parameter of `triggerHeadshotGenerateWithPrompt`.
2. Forward them as `mask_storage_path` and `mask_storage_bucket` in the `createAIJob` input payload.

### Step 6: Add UI Controls
In `app/hair-and-make-up.tsx`:
1. Destructure `isDrawMode`, `setIsDrawMode`, `drawingCanvasRef`, and `currentDrawColor` from `state`.
2. In the `cameraSwipe` options passed to `useEdgeSwipe`, add `&& !isDrawMode` to the `enabled` field so the outer `PanGestureHandler` is disabled during drawing. No `EdgePeekSlider` prop changes are needed (it already has `edgeSwipeEnabled={false}`).
3. In `renderSliderItem`, pass `drawingEnabled={isDrawMode}`, `currentColor={state.currentDrawColor}`, and `drawingCanvasRef={state.drawingCanvasRef}` to `HeadshotSlideItem`.
4. Add a "Draw Mode" icon toggle button (e.g., a pencil icon `"pencil-outline"`) visually near the image preview — suggested placement: beside the existing `faceMenuButton` area, or as a floating button below the `EdgePeekSlider`. Pressing it calls `state.setIsDrawMode((prev) => !prev)`. Only show this button when `pageTab === 'mirror'` and `item.url` is truthy.

### Step 7: Update Backend AI Function
Modify `netlify/functions/processes/headshot_generate.js`:
1. Destructure `mask_storage_path` and `mask_storage_bucket` from `input`.
2. If both are present:
   - Download the mask directly: `const { data: maskBlob, error } = await supabase.storage.from(mask_storage_bucket).download(mask_storage_path)`.
   - Convert the Blob to a base64 string (using `Buffer.from(await maskBlob.arrayBuffer()).toString('base64')`).
   - Build a `maskResult` object in the same shape as `selfieResult` (i.e., `{ base64, mimeType: 'image/png' }`).
   - Pass `[selfieResult, maskResult]` to `callGeminiAPI`.
   - Prepend to the prompt: `"\nImage 2 is a semantic mask on a black background. Pure Magenta (#FF00FF) marks where to apply makeup, Cyan (#00FFFF) marks hair modifications. Apply changes only where the mask color indicates."` (adjust the image index to match Gemini's multi-image ordering).
3. Do **not** use `downloadImageFromStorage` for the mask — that function requires an image ID from the `images` DB table, which the mask does not have.
