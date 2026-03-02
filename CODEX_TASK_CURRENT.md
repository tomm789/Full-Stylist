# Codex Task: Phase 2F — Structural Refactoring (4 sub-tasks)

## Context

You are working on the Full Stylist app (Expo 54 / React Native). This is the **final implementation phase**. Phases 2A–2E are complete (stability, shared utilities, memoization, hook deduplication, image optimization). This phase refactors the largest files into manageable modules.

**Risk level: HIGH** — These changes move code between files. Preserve all existing behavior. Read each file carefully before extracting. After each extraction, verify imports and exports are correct.

---

## Sub-task 2F-1: Extract wardrobe.tsx route logic

**Target:** `app/(tabs)/wardrobe.tsx` (~1043 lines → target ~500 lines)

Extract the following into new files. For each extraction: move the code, add the necessary imports/exports, and replace the original code with a call to the new hook or component.

### Extract 1: `src/hooks/wardrobe/useCreatorReset.ts`

**Source:** `resetOutfitCreatorState` function (~lines 450-463, ~14 lines)

This function resets all outfit creator state across multiple systems. Extract it as a hook that accepts the setters and returns the reset function.

```typescript
interface UseCreatorResetProps {
  setSelectedOutfitItems: (items: string[]) => void;
  setSelectedOutfitItemMap: (map: Map<string, any>) => void;
  canvas: {
    setOutfitCanvasLayouts: (val: Record<string, any>) => void;
    setOutfitCanvasTrims: (val: Record<string, any>) => void;
    setOutfitCanvasTrimStatuses: (val: Record<string, any>) => void;
  };
  setIsCreatorExpanded: (val: boolean) => void;
  setOutfitCreatorMode: (val: boolean) => void;
  handleCategorySelect: (id: string | null) => void;
  updateFilter: (key: string, val: any) => void;
  sessionData: { endSession: () => void };
  sessionNav: { clearPreview: () => void };
  setAutoSelectNext: (val: boolean) => void;
}

// Returns: { resetOutfitCreatorState: () => void }
```

### Extract 2: `src/hooks/wardrobe/useOutfitSelectionFlow.ts`

**Source:** `handleOutfitSelectionAttempt` function (~lines 488-559, ~72 lines)

Also include the helper functions it depends on: `upsertSelectedOutfitItem` (~lines 433-439) and `removeSelectedOutfitItem` (~lines 441-448).

The hook takes the relevant state and returns the handlers:
```typescript
// Returns: { handleOutfitSelectionAttempt, upsertSelectedOutfitItem, removeSelectedOutfitItem }
```

Dependencies: `selectedWardrobeItems`, `outfitCreatorMode`, `outfitDraft` (hasDraft, restoreDraft, clearDraft), `getCategoryById`, state setters for selected items and creator mode. Also uses a `findConflictingItem` utility — check if it's defined locally or imported, and handle accordingly.

### Extract 3: `src/hooks/wardrobe/useWardrobeCameraFlow.ts`

**Source:** `handleOpenCamera`, `handleCameraImageReady`, `handleCameraClose` (~lines 390-425, ~34 lines)

```typescript
// Returns: { handleOpenCamera, handleCameraImageReady, handleCameraClose }
```

Dependencies: `wardrobeCamera` hook return, `router`, `setTabBarOpacity`. Platform-specific logic (web vs mobile) is included.

### Extract 4: `src/hooks/wardrobe/useGenerateOutfitFlow.ts`

**Source:** `handleGenerateOutfit` function (~lines 561-588, ~28 lines)

```typescript
// Returns: { handleGenerateOutfit }
```

Dependencies: `selectedOutfitItems`, `selectedWardrobeItems`, `hasCustomCreatorLayout`, `activeOutfitCanvasLayouts`, `activeOutfitCanvasTrims`, `sessionData.ensureSession`, `generateOutfit`, `setAutoSelectNext`.

### Extract 5: `src/components/wardrobe/SessionPreviewStrip.tsx`

**Source:** Session preview + thumbnail strip JSX (~lines 865-954, ~90 lines)

Extract as a presentational component. Move the JSX block that renders the preview image, GenerationThumbnailStrip, and action buttons (View/Done). All data and callbacks passed as props.

```typescript
interface SessionPreviewStripProps {
  previewImageUrl: string | null;
  previewOutfitId: string | null;
  thumbnailItems: Array<{ id: string; imageUrl: string | null; isActive: boolean }>;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  onThumbnailSelect: (id: string) => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onSaveVariation: (id: string) => void;
  onViewOutfit: (outfitId: string) => void;
  onClose: () => void;
  bottomOffset: number;
  panelCollapsedHeight: number;
}
```

### Extract 6: `src/components/wardrobe/WardrobeModalStack.tsx`

**Source:** Modal renders at the bottom of the component (~lines 843-1040, ~198 lines)

This includes: ItemDetailModal, OutfitCreatorOptionsModal, HeadshotSelectorModal, and WardrobeCameraOverlay. Extract as a single component that wraps all modals. Pass all required state and callbacks as props.

The props interface will be large (each modal has its own set of props). Group them by modal:

```typescript
interface WardrobeModalStackProps {
  // Item Detail Modal
  activeTab: string;
  showItemModal: boolean;
  selectedItem: any;
  imageCache: Map<string, string>;
  userId: string | undefined;
  filteredItems: any[];
  onCloseItemModal: () => void;
  onItemAddToOutfit: (item: any) => void;
  onItemOpenDetail: () => void;
  onItemEdit: () => void;
  onItemDelete: () => void;

  // Creator Options Modal
  showCreatorOptionsModal: boolean;
  onCloseCreatorOptionsModal: () => void;
  onCreatorExpand: (expanded: boolean) => void;
  onSaveDraft: () => void;
  onResetCreator: () => void;

  // Headshot Modal
  showHeadshotSelector: boolean;
  onCloseHeadshotSelector: () => void;
  bodyShot: any; // ReturnType<typeof useBodyShotGeneration>

  // Camera Overlay
  wardrobeCamera: any;
  onCameraImageReady: (uri: string) => void;
  onCameraClose: () => void;
}
```

### How wardrobe.tsx should look after extractions

The file should:
1. Import the new hooks and call them at the top
2. Import `SessionPreviewStrip` and `WardrobeModalStack` components
3. Replace inline logic with hook calls
4. Replace inline JSX with component usage
5. Keep the remaining hook calls, effects, computed values, and main JSX structure

**Success criteria:** `wardrobe.tsx` is under 550 lines. All extracted code works identically. No behavior changes.

---

## Sub-task 2F-2: Extract outfits/index.tsx route logic

**Target:** `app/(tabs)/outfits/index.tsx` (~900 lines → target ~600 lines)

### Extract 1: `src/components/outfits/LookbooksTabContent.tsx`

**Source:** Lookbooks tab render block (~lines 701-770, ~70 lines)

The block with `{activeTab === 'lookbooks' ? ...}` that renders:
- Loading state with LoadingSpinner
- Empty state with EmptyState component
- ScrollView with system lookbooks horizontal list + user lookbooks grid

Extract as a presentational component:
```typescript
interface LookbooksTabContentProps {
  systemLookbooks: any[];
  sortedLookbooks: any[];
  lookbookThumbnails: Map<string, string | null>;
  lookbookLoadingIds: Set<string>;
  lookbooksLoading: boolean;
  allLookbooksEmpty: boolean;
  onScroll: (event: any) => void;
  onCreateLookbook: () => void;
  onNavigate: (path: string) => void;
  listBottomPadding: number;
}
```

### Extract 2: `src/components/outfits/SocialTabContent.tsx`

**Source:** Explore and Following tab render blocks (~lines 776-840, ~65 lines)

Both the explore and following tabs render `OutfitsSocialTab` with different data sources. Extract as a component that takes a `feedType` prop ('explore' | 'following') along with the data and callbacks:

```typescript
interface SocialTabContentProps {
  feedType: 'explore' | 'following';
  activeView: string;
  feed: any[];
  gridImages: Map<string, string | null>;
  feedOutfitImages: Map<string, string | null>;
  feedLookbookImages: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMore?: () => void;
  hasMore: boolean;
  // ... remaining OutfitsSocialTab props
  emptyCopy: { title: string; message: string };
  listBottomPadding: number;
}
```

Alternatively, keep it simpler: just move the JSX blocks out and pass props through. The explore tab has `onLoadMore` and `hasMore`, the following tab does not. Use conditional props or render both inline with the component just wrapping `OutfitsSocialTab`.

### Extract 3: `src/hooks/outfits/useOutfitNavigation.ts`

**Source:** `handleOutfitPress` function (~lines 451-472, ~22 lines)

This builds a query string from filtered outfits and active filters, then navigates:

```typescript
export function useOutfitNavigation(
  router: ReturnType<typeof useRouter>,
  filteredOutfits: Array<{ id: string }>,
  filters: { searchQuery: string; showFavoritesOnly: boolean; sortBy: string; sortOrder: string },
  getSortLabel: () => string
) {
  const handleOutfitPress = useCallback((outfitId: string) => {
    // Build query with outfit IDs, filter summary
    // router.push(...)
  }, [router, filteredOutfits, filters, getSortLabel]);

  return { handleOutfitPress };
}
```

**Success criteria:** `outfits/index.tsx` is under 700 lines. Extracted tab content renders identically.

---

## Sub-task 2F-3: Decompose mega hooks

### Hook 1: `src/hooks/outfits/useOutfitEditorActions.ts` (~445 lines)

Split into 3 sub-hooks + thin composition parent:

**1a. `src/hooks/outfits/useItemPicker.ts`**
- State: `showItemPicker`, `selectedCategory`, `categoryItems`
- Functions: `openItemPicker` (~lines 127-183), `selectItem`, `removeItem`
- Dependencies: `user`, wardrobe item fetching

**1b. `src/hooks/outfits/useRenderPipeline.ts`**
- State: `rendering`, `generationPhase`, `activeMessage`
- Refs: `descriptionDripRef`, `cancelDescriptionDrip`
- Sub-hooks: `useItemRevealAnimation`, `useDescriptionPolling`, `useOutfitRenderJob`
- Functions: `handleRender` (~lines 214-395), `stopAll`
- Cleanup effect
- This is the largest sub-hook (~200 lines)

**1c. `src/hooks/outfits/useSaveAndArchive.ts`**
- State: `saving`
- Functions: `handleSave` (~lines 188-210), `handleDelete` (~lines 399-423)

**Parent hook becomes:**
```typescript
export function useOutfitEditorActions(props: UseOutfitEditorActionsProps) {
  const { user } = useAuth();
  const router = useRouter();

  const picker = useItemPicker({ user, ... });
  const saveArchive = useSaveAndArchive({ user, outfit, isNew, saveOutfit, router });
  const render = useRenderPipeline({ user, outfitId, isNew, outfitItems, itemImageUrls, categories, notes, saveOutfit, router, onDescriptionReady });

  return {
    ...picker,
    ...saveArchive,
    ...render,
  };
}
```

### Hook 2: `src/hooks/wardrobe/useWardrobeItemDetail.ts` (~570 lines)

Split into sub-hooks focusing on the massive initialization effect:

**2a. `src/hooks/wardrobe/useWardrobeItemJobs.ts`**
- State: All job ID states (`productShotJobId`, `autoTagJobId`, `batchJobId`, `renderJobId`, `generateJobId`)
- State: `isGeneratingProductShot`, `generationFailed`
- The 5 polling start/stop effects (~lines 303-346)
- Function: `retryGeneration`
- All polling hook calls (`useWardrobeItemPolling` × 5)

**2b. `src/hooks/wardrobe/useWardrobeItemCache.ts`**
- State: `initialImageDataUri`, `initialTitle`, `initialDescription`, `jobSucceededAt`
- State: `lastSucceededJobId`, `lastSucceededJobFeedbackAt`, `lastSucceededJobType`
- State: `loading`
- The large initialization effect (~lines 349-560) — this is the hardest part
- This effect detects pending jobs, loads cached data, loads full item data, detects active jobs, and handles feedback status

**Parent hook becomes:**
```typescript
export function useWardrobeItemDetail({ itemId, userId }: Props) {
  const data = useWardrobeItemData({ itemId });
  const display = useWardrobeItemDisplay(data.displayImages);
  const periodic = usePeriodicRefresh(itemId, userId, callbacks);
  const cache = useWardrobeItemCache({ itemId, userId, data, periodic });
  const jobs = useWardrobeItemJobs({ itemId, userId, cache, periodic, data });

  return {
    ...data,
    ...display,
    loading: cache.loading,
    isGeneratingProductShot: jobs.isGeneratingProductShot,
    generationFailed: jobs.generationFailed,
    retryGeneration: jobs.retryGeneration,
    ...cache, // initialImageDataUri, etc.
  };
}
```

**Important:** The massive init effect (212 lines) is tightly coupled — it reads item data, detects job states, and writes to both cache and job state. When splitting, the init effect should go into `useWardrobeItemCache` which exposes job-related setters that `useWardrobeItemJobs` consumes.

### Skip: `useHairAndMakeup.ts`

This hook is already well-decomposed with 8 sub-hooks. The parent is a thin composition layer. **Do not refactor** — it doesn't need further splitting.

**Success criteria:** Each parent hook is a thin composition layer under 80 lines. Sub-hooks are focused on a single concern. No behavior changes.

---

## Sub-task 2F-4: Clean up dead code from audits

### Item 1: Remove unused comment state from lookbook view

**File:** `app/lookbooks/[id]/view.tsx`
- Remove: `const [commentText, setCommentText] = useState('');` (~line 70)
- Remove: `const [submittingComment, setSubmittingComment] = useState(false);` (~line 71)
- Remove: `const handleSubmitComment = async () => { ... }` function (~line 222)
- These are unused because `CommentsModal` manages its own comment state internally.

### Item 2: Remove unused styles from layout

**File:** `app/(tabs)/_layout.tsx`
- Remove: `createButtonContainer` style (~lines 255-259)
- Remove: `createButton` style (~lines 260-268)
- These style objects are never referenced by any component.

### Item 3: Fix object URL memory leak in imageProcessor

**File:** `src/utils/imageProcessor.ts`
- In `trimImageWhitespace` function (~line 210): after `img.src = URL.createObjectURL(file)`, the object URL is never revoked.
- Add `URL.revokeObjectURL(img.src)` in the `img.onload` callback after the canvas operations complete and the data URL is extracted.
- Note: `processAndStackImages` correctly revokes at ~line 271 — use the same pattern.

### Item 4: Add temp file cleanup after headshot share

**File:** `src/hooks/headshot/useHeadshotImageActions.ts`
- In `getShareableUri` (~lines 54-59): downloads a file to `targetUri` for sharing but never deletes it after.
- After `Share.share()` completes in `handleSharePreview` (~line 65), add `FileSystem.deleteAsync(shareUri, { idempotent: true })` in a `finally` block.
- Import `FileSystem` from `expo-file-system` if not already imported.

**Success criteria:** All 4 dead code items resolved. No unused variables. Memory leaks fixed.

---

## General rules

- **Preserve existing behavior** — these are structural changes only, no functional changes.
- **Read before extracting** — read each source file fully before moving code. Understand all dependencies.
- **Maintain imports** — when moving code to a new file, carry all required imports. When the source file no longer uses an import, remove it.
- **Type safety** — use proper TypeScript interfaces for extracted hook props and component props. If an exact type is complex, use `any` with a `// TODO: type properly` comment rather than breaking the extraction.
- **Test by reading** — after each extraction, re-read both the source and destination files to verify:
  1. All imports are correct
  2. All exports are correct
  3. The source file calls the extracted hook/component correctly
  4. No circular dependencies
- **Use `if (__DEV__)` for any new console.log calls.**
- Commit all changes with a descriptive message.

## Output

Write a summary to `CODEX_TASK_REPORT_2F.md` listing:
1. wardrobe.tsx extraction: which hooks/components were extracted, final line count
2. outfits/index.tsx extraction: which components/hooks were extracted, final line count
3. Hook decomposition: which sub-hooks were created, parent hook structure
4. Dead code cleanup: what was removed/fixed
5. Any issues, decisions, or things that couldn't be extracted safely
