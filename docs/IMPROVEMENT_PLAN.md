# Full Stylist — Improvement Implementation Plan

**Created:** 2026-03-06
**Reference:** [CODEBASE_ASSESSMENT.md](./CODEBASE_ASSESSMENT.md)
**Approach:** Each task includes specific files, exact changes, and delegation guidance (Claude vs Codex).

---

## Overview

4 phases, 25 task groups, ~150 individual changes. Each task group is scoped for a single Codex session or Claude direct fix.

| Phase | Focus | Tasks | Est. Effort |
|-------|-------|-------|-------------|
| 1 | Foundation Fixes | 8 task groups | 1 week |
| 2 | Quality & Reliability | 7 task groups | 1-2 weeks |
| 3 | Polish & Accessibility | 5 task groups | 1-2 weeks |
| 4 | New Features | 5 task groups | Ongoing |

---

# Phase 1: Foundation Fixes

_Goal: Fix broken patterns, rule violations, and inconsistencies. No new features._

---

## 1.1 Fix Boundary Rule Violations (5 hooks)

**Owner:** Codex (batched — all 5 hooks in one session)
**Branch:** `fix/boundary-violations`

### Task Description

Move direct Supabase calls out of hooks into `lib/` functions. The hooks layer must never import `supabase` directly.

### Changes Required

#### 1.1.1 `src/hooks/calendar/useUserOutfits.ts`

**Problem:** Lines 33-36 query `supabase.from('images')` directly. Lines 48-50 call `supabase.storage.from().getPublicUrl()`.

**Fix:** Replace with existing `getOutfitCoverImages()` from `@/lib/images`.

```
Before:
  import { supabase } from '@/lib/supabase';
  ...
  const { data: coverImages } = await supabase.from('images').select(...)
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key)

After:
  import { getOutfitCoverImages } from '@/lib/images';
  ...
  const imageUrls = await getOutfitCoverImages(outfits);
  // imageUrls is Map<outfitId, url> — use directly
```

- Remove `import { supabase }` from this file
- Remove the manual image query + URL generation loop
- Replace with single `getOutfitCoverImages(outfits)` call which returns a Map

#### 1.1.2 `src/hooks/outfits/useOutfitEditor.ts`

**Problem:** Lines 67-73 define a local `getPublicImageUrl()` that calls `supabase.storage.from().getPublicUrl()`.

**Fix:** Import `getPublicImageUrl` from `@/lib/images` instead.

```
Before:
  import { supabase } from '@/lib/supabase';
  const getPublicImageUrl = (image: any): string | null => {
    if (!image?.storage_key) return null;
    const { data: urlData } = supabase.storage.from(image.storage_bucket || 'media').getPublicUrl(image.storage_key);
    return urlData?.publicUrl ?? null;
  };

After:
  import { getPublicImageUrl } from '@/lib/images';
  // Remove local function definition entirely
  // Usage stays the same: getPublicImageUrl(image)
```

- Remove `import { supabase }` from this file
- Remove local `getPublicImageUrl` function (lines 67-73)
- Add import from `@/lib/images`

#### 1.1.3 `src/hooks/search/useFindSimilar.ts`

**Problem:** Lines 119-125 call `supabase.storage.from(bucket).getPublicUrl(key)` inside `getItemImageUrl()`.

**Fix:** Use `getPublicImageUrl` from `@/lib/images`.

```
Before:
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
  return urlData.publicUrl;

After:
  import { getPublicImageUrl } from '@/lib/images';
  ...
  return getPublicImageUrl(img);
```

- Remove `import { supabase }` from this file
- Replace storage call with `getPublicImageUrl(img)` (the `img` object already has `storage_key` and `storage_bucket`)

#### 1.1.4 `src/hooks/social/useHeadshotFollowingFeed.ts`

**Problem:** Multiple direct Supabase calls:
- Lines 39-43: 5 parallel queries on `likes`, `saves`, `comments` tables
- Lines 87-91: Direct query on `follows` table
- Lines 118-120: `supabase.storage.from().getPublicUrl()`

**Fix:** Three changes needed:

1. **Storage URL** (lines 118-120): Replace with `getPublicImageUrl(h)` from `@/lib/images`

2. **Engagement queries** (lines 39-43): Create new lib function:
   - **New file:** `src/lib/engagement/batch.ts`
   - **Function:** `batchGetEngagementCounts(entityType: string, entityIds: string[], userId: string)`
   - Move the 5-query `Promise.all` into this function
   - Export from `src/lib/engagement/index.ts`

3. **Follows query** (lines 87-91): Create new lib function:
   - **Add to:** `src/lib/user/follows.ts`
   - **Function:** `getFollowedUserIds(userId: string): Promise<string[]>`
   - Move the `follows` table query into this function

After all three changes, remove `import { supabase }` from this hook.

#### 1.1.5 `src/hooks/social/useHeadshotDiscoverFeed.ts`

**Problem:** Lines 59-67 call `supabase.storage.from().getPublicUrl()` in a loop.

**Fix:** Replace with `getPublicImageUrl(h)` from `@/lib/images`.

```
Before:
  const { data } = supabase.storage.from(h.storage_bucket || 'user-images').getPublicUrl(h.storage_key);
  newImageCache.set(h.id, data.publicUrl);

After:
  import { getPublicImageUrl } from '@/lib/images';
  ...
  const url = getPublicImageUrl(h);
  newImageCache.set(h.id, url);
```

- Remove `import { supabase }` from this file

### Verification
After changes, run:
```bash
grep -r "from '@/lib/supabase'" src/hooks/ --include="*.ts" --include="*.tsx"
```
Should return 0 results (no hooks importing supabase directly).

---

## 1.2 Fix Hardcoded Colors — Priority Components

**Owner:** Codex (batched)
**Branch:** `fix/theme-colors`

### Task Description

Replace hardcoded hex/rgba colors with theme tokens in components that don't already use `useThemeColors()`. Each component needs:
1. Import `useThemeColors` from `@/styles`
2. Call `const colors = useThemeColors();` at top of component
3. Replace hardcoded values with token references

### Changes Required

#### 1.2.1 `src/components/search/SearchResultsPanel.tsx`

| Line | Before | After |
|------|--------|-------|
| 56 | `color="#ccc"` | `color={colors.gray400}` |
| 62 | `color="#ccc"` | `color={colors.gray400}` |
| 79 | `backgroundColor: '#fafafa'` | `backgroundColor: colors.gray50` |
| 100 | `color: '#333'` | `color: colors.textPrimary` |
| 106 | `color: '#666'` | `color: colors.textSecondary` |

If component already uses `createStyles(colors)` pattern, move hardcoded values into the styles function. If not, add `const colors = useThemeColors()`.

#### 1.2.2 `src/components/auth/BiometricLockScreen.tsx`

| Line | Before | After |
|------|--------|-------|
| 29 | `color="#fff"` | `color={colors.white}` |
| 45 | `backgroundColor: '#000'` | `backgroundColor: colors.black` |
| 55 | `color: '#fff'` | `color: colors.white` |
| 61 | `color: 'rgba(255, 255, 255, 0.6)'` | `color: colors.textSecondary` (dark variant) |
| 68 | `backgroundColor: 'rgba(255, 255, 255, 0.15)'` | `backgroundColor: colors.glassBackground` |
| 72 | `color: '#fff'` | `color: colors.white` |

**Note:** BiometricLockScreen is intentionally dark (lock screen). Consider using `darkColors` directly or accepting that this component always uses dark theme regardless of user setting. If so, import `darkColors` from `@/styles` and use those tokens directly.

#### 1.2.3 `src/components/social/SocialActionBar.tsx`

| Line | Before | After |
|------|--------|-------|
| 51 | `color="#ff0000"` | `color={colors.favorite}` |
| 73 | `color="#00ba7c"` | `color={colors.success}` |

**New token needed:** Add `repost: '#00ba7c'` to both `lightColors` and `darkColors` in `src/styles/themeColors.ts` if `colors.success` (#34C759) isn't the right shade. Or use `colors.success` if close enough.

#### 1.2.4 Additional Components (lower priority, same session)

Apply the same pattern to:
- `src/components/wardrobe/ItemAttributes.tsx` (5 hardcoded colors)
- `src/components/wardrobe/ItemImageCarousel.tsx` (6 hardcoded colors)
- `src/components/wardrobe/ItemNavigation.tsx` (5 hardcoded colors)
- `src/components/lookbooks/LookbookOutfitGrid.tsx` (6 hardcoded colors)
- `src/components/lookbooks/FilterDefinitionEditor.tsx` (8 hardcoded colors)
- `src/components/wardrobe/find-similar/FindSimilarModal.tsx` (1 hardcoded color: `#007AFF` → `colors.primary`)

### Token Reference (from `themeColors.ts`)
```
colors.black       = '#000'          colors.white       = '#fff'
colors.gray900     = '#111'          colors.gray800     = '#333'
colors.gray600     = '#666'          colors.gray400     = '#ccc'
colors.gray200     = '#e0e0e0'       colors.gray100     = '#f0f0f0'
colors.gray50      = '#f9f9f9'       colors.primary     = '#007AFF'
colors.favorite    = '#ff0000'       colors.success     = '#34C759'
colors.error       = '#FF3B30'       colors.textPrimary (theme-aware)
colors.textSecondary (theme-aware)   colors.borderLight (theme-aware)
colors.overlayDark = 'rgba(0,0,0,0.7)'
colors.glassBackground (theme-aware)
```

### Verification
```bash
# Should find zero results in the fixed files:
grep -n '#333\|#666\|#ccc\|#fafafa\|#ff0000\|#00ba7c' src/components/search/SearchResultsPanel.tsx src/components/auth/BiometricLockScreen.tsx src/components/social/SocialActionBar.tsx
```

---

## 1.3 Consolidate SocialActionBar

**Owner:** Claude (architectural decision + implementation)
**Branch:** `fix/social-action-bar`

### Task Description

Two separate `SocialActionBar` components exist with different APIs. Consolidate into one shared component.

### Current State

| | outfits/ version | social/ version |
|---|---|---|
| Props | Individual booleans (`liked`, `saved`) + counts | `EngagementCounts` object |
| Like | Heart icon, no loading | Heart icon + ActivityIndicator |
| Comment | Chat icon | Chat icon |
| Repost | **Missing** | Repeat icon + ActivityIndicator |
| Save | Bookmark icon, no loading | Bookmark icon + ActivityIndicator |
| Find Similar | **Missing** | Optional magnifying glass |
| Loading states | None | `liking`, `saving`, `reposting` booleans |

### Implementation

1. **Create** `src/components/shared/SocialActionBar.tsx`
   - Use the social/ version as base (it's more complete)
   - Props interface:
     ```typescript
     interface SocialActionBarProps {
       counts: EngagementCounts;
       onLike: () => void;
       onComment: () => void;
       onRepost?: () => void;       // optional — outfits don't repost
       onSave: () => void;
       onFindSimilar?: () => void;  // optional
       liking?: boolean;
       saving?: boolean;
       reposting?: boolean;
       showBorder?: boolean;        // outfits version had bottom border
     }
     ```
   - Use theme colors (not hardcoded `#ff0000` / `#00ba7c`)
   - Add accessibility labels: `"Like"`, `"Comment"`, `"Repost"`, `"Save"`, `"Find similar"`

2. **Update consumers:**
   - Find all imports of `outfits/SocialActionBar` → switch to `shared/SocialActionBar`
   - Find all imports of `social/SocialActionBar` → switch to `shared/SocialActionBar`
   - Adapt props at call sites (outfits consumers need to wrap individual values into `EngagementCounts`)

3. **Delete** old files:
   - `src/components/outfits/SocialActionBar.tsx`
   - `src/components/social/SocialActionBar.tsx`

### Verification
```bash
grep -r "SocialActionBar" src/ --include="*.tsx" --include="*.ts" -l
# All should point to shared/SocialActionBar
```

---

## 1.4 Clean Up Empty/Hidden Tabs

**Owner:** Claude (direct fix — small change)
**Branch:** `fix/clean-tabs`

### Task Description

Remove the `social` and `create` hidden tabs from the tab layout. They serve no purpose (social returns blank, create returns null).

### Changes Required

**File:** `app/(tabs)/_layout.tsx`

1. Remove the `<Tabs.Screen name="social" ... />` entry
2. Remove the `<Tabs.Screen name="create" ... />` entry
3. Keep `calendar` hidden tab (it's used as a navigation target)

**File:** `app/(tabs)/social.tsx` — Delete this file
**File:** `app/(tabs)/create.tsx` — Delete this file

### Risk Assessment
- Search codebase for `/(tabs)/social` and `/(tabs)/create` navigation references
- If any code navigates to these tabs, update those references first
- The floating pill menu likely navigates to standalone routes (not tab routes), so this should be safe

### Verification
```bash
grep -r "tabs)/social\|tabs)/create" app/ src/ --include="*.ts" --include="*.tsx"
```

---

## 1.5 Add Error Boundaries to Major Domains

**Owner:** Codex (batched — create 4 boundaries + wrap screens)
**Branch:** `fix/error-boundaries`

### Task Description

Replicate the `CalendarErrorBoundary` pattern for wardrobe, outfits, social, and headshots domains.

### Template (from `src/components/calendar/CalendarErrorBoundary.tsx`)

```typescript
// Pattern:
// 1. Class component with { hasError: boolean, error: Error | null } state
// 2. getDerivedStateFromError() → sets hasError
// 3. componentDidCatch() → logs error
// 4. Renders fallback with icon, message, dev stack trace, "Try Again" button
// 5. Reset method clears error state
```

### Files to Create

1. **`src/components/shared/ErrorBoundary.tsx`** — Generic reusable boundary
   - Copy CalendarErrorBoundary pattern
   - Make `title` and `icon` configurable via props
   - Props: `{ children, title?: string, onReset?: () => void }`
   - This replaces the need for per-domain boundaries

### Screens to Wrap

Add `<ErrorBoundary>` wrapper in these route files around the main content:

| Route File | Wrap Around |
|------------|-------------|
| `app/(tabs)/wardrobe.tsx` | Main wardrobe content |
| `app/(tabs)/outfits/index.tsx` | Outfits tab content |
| `app/hair-and-make-up.tsx` | Hair & makeup content |
| `app/wardrobe/item/[id]/index.tsx` | Item detail content |
| `app/outfits/[id].tsx` | Outfit editor content |
| `app/outfits/[id]/view.tsx` | Outfit view content |

### Verification
```bash
grep -r "ErrorBoundary" app/ src/components/ --include="*.tsx" -l
# Should show the new file + all wrapped routes
```

---

## 1.6 Fix FindSimilarOnlineResultItem TODO

**Owner:** Claude (direct fix — small change)
**Branch:** `fix/find-similar-online`

### Task Description

The `FindSimilarOnlineResultItem` component has a TODO comment where online results should open in the browser but don't.

### Changes Required

**File:** `src/components/wardrobe/find-similar/FindSimilarOnlineResultItem.tsx`

1. Import `openInAppBrowser` from `@/utils/browser`
2. In the `onPress` handler, call `openInAppBrowser(item.url)` (or whatever property holds the external URL)
3. Remove the TODO comment

### Verification
Test by tapping an online similar result — should open in-app browser.

---

## 1.7 Consolidate Duplicate `getVisibilityLabel`

**Owner:** Claude (direct fix — small change)
**Branch:** `fix/visibility-label`

### Task Description

`getVisibilityLabel()` is defined in both `src/utils/wardrobeUtils.ts` (typed, supports 'inherit') and `src/utils/lookbookHelpers.ts` (untyped, missing 'inherit').

### Changes Required

1. **Keep** the version in `wardrobeUtils.ts` (more complete, typed)
2. **Update** `lookbookHelpers.ts`:
   - Remove the local `getVisibilityLabel` function
   - Re-export from wardrobeUtils: `export { getVisibilityLabel } from './wardrobeUtils';`
3. **Update** `utils/index.ts` to export `lookbookHelpers`:
   ```typescript
   export * from './wardrobeUtils';
   export * from './formatUtils';
   export * from './canvasUtils';
   export * from './lookbookHelpers';  // ADD
   export * from './imageUtils';       // ADD
   ```

### Verification
```bash
grep -rn "getVisibilityLabel" src/ --include="*.ts" --include="*.tsx"
# Should show single definition in wardrobeUtils + re-export in lookbookHelpers
```

---

## 1.8 Add `repost` Color Token to Theme

**Owner:** Claude (direct fix)
**Branch:** Part of `fix/theme-colors`

### Changes Required

**File:** `src/styles/themeColors.ts`

Add `repost` token to both palettes:

```typescript
// In lightColors:
repost: '#00ba7c',

// In darkColors:
repost: '#00ba7c',
```

**File:** `src/styles/themeColors.ts` — Update `ThemeColors` type to include `repost: string`.

This token is then used in Task 1.2.3 (SocialActionBar fix).

---

# Phase 2: Quality & Reliability

_Goal: Improve robustness, developer experience, and prevent regressions._

---

## 2.1 Set Up CI/CD Pipeline

**Owner:** Claude (architectural — write workflow files)
**Branch:** `infra/ci-cd`

### Task Description

Create GitHub Actions workflows for automated quality checks on PRs.

### Files to Create

#### `/.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test -- --ci --coverage
      - run: npx expo export -p web  # verify web build
```

### Package.json Script Additions

Ensure these scripts exist:
```json
{
  "typecheck": "tsc --noEmit",
  "lint": "eslint src/ app/ --ext .ts,.tsx"
}
```

### Optional: Add ESLint if not present
Check if `.eslintrc` exists. If not, add basic config:
```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks
```

---

## 2.2 Enable TypeScript Strict Mode (Progressive)

**Owner:** Claude (plan) → Codex (fix errors per domain)
**Branch:** `infra/strict-ts`

### Strategy

Enable strict checks incrementally to avoid a massive single PR.

### Step 1: Enable `strictNullChecks` only

**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    // Keep other flags as-is for now
  }
}
```

### Step 2: Fix errors domain by domain

Run `npx tsc --noEmit 2>&1 | head -200` to see the scope.

Fix in this order (least dependencies first):
1. `src/utils/` — Pure functions, easiest
2. `src/constants/` — Static data
3. `src/lib/` — Data layer (add null checks to return types)
4. `src/hooks/` — Add optional chaining where needed
5. `src/components/` — Largest, fix last
6. `app/` — Route files, fix last

### Codex Delegation Template
```
Task: Fix strictNullChecks errors in src/utils/
Context: We enabled strictNullChecks in tsconfig.json. Fix all resulting type errors.
Requirements:
- Add null checks (optional chaining, nullish coalescing) where needed
- Do NOT use `as` type assertions to silence errors — fix properly
- Do NOT add `// @ts-ignore` comments
- Run `npx tsc --noEmit` after fixes to verify
Patterns to follow: Existing null-safe patterns in the codebase
```

---

## 2.3 Standardize Loading States

**Owner:** Codex (batched)
**Branch:** `fix/loading-states`

### Task Description

Ensure consistent loading patterns across the app:
- **Lists/grids:** Use `SkeletonGrid` with appropriate preset
- **Action buttons:** Use `ActivityIndicator` with `size="small"`
- **Full-screen blocking:** Use `LoadingOverlay`
- **Never show blank space** while loading

### Existing Components (no changes needed)
- `src/components/shared/loading/LoadingSpinner.tsx` — Inline spinner
- `src/components/shared/loading/SkeletonGrid.tsx` — Grid skeleton (presets: wardrobe, outfit, lookbook)
- `src/components/shared/loading/SkeletonBox.tsx` — Base skeleton element
- `src/components/shared/loading/LoadingOverlay.tsx` — Full-screen modal loading

### New Component

**Create:** `src/components/shared/loading/SkeletonList.tsx`
- Renders N `SkeletonBox` rows (for non-grid lists like notifications, comments)
- Props: `{ count?: number, rowHeight?: number }`
- Uses moti/skeleton for shimmer

### Screens to Update

| Screen | Current | Target |
|--------|---------|--------|
| Wardrobe grid | `LoadingSpinner` in center | `SkeletonGrid preset="wardrobe"` |
| Outfits grid | `LoadingSpinner` in center | `SkeletonGrid preset="outfit"` |
| Lookbooks grid | Spinner | `SkeletonGrid preset="lookbook"` |
| Notifications list | Spinner | `SkeletonList count={8}` |
| Comments modal | Spinner | `SkeletonList count={5}` |
| User profile | Spinner | `SkeletonProfileCard` + `SkeletonGrid` |
| Search results | Spinner | `SkeletonList count={6}` |

### Codex Delegation Template
```
Task: Standardize loading states across all screens
Files to modify: [list from table above — find exact files]
Context: Replace LoadingSpinner with skeleton loading in all list/grid views.
Requirements:
- Import SkeletonGrid/SkeletonList from @/components/shared/loading/
- Show skeleton when `loading` is true AND data is empty
- Keep LoadingSpinner for refresh indicators (pull-to-refresh)
- Keep LoadingOverlay for blocking operations (AI generation)
Patterns to follow: Look at any screen already using SkeletonGrid.
Do NOT: Remove pull-to-refresh spinners. Only replace initial load spinners.
```

---

## 2.4 Standardize Error Handling UX

**Owner:** Codex (batched)
**Branch:** `fix/error-handling`

### Task Description

Establish consistent error notification patterns:

| Error Type | Pattern | When |
|-----------|---------|------|
| Recoverable mutation failure | `showErrorToast(message)` | Save failed, network error |
| Blocking failure | `ErrorModal` or `AlertModal` | Can't proceed without fixing |
| Component crash | `ErrorBoundary` (Phase 1.5) | Unhandled exception in render |
| User cancellation | Silent (no notification) | User cancelled share/upload |

### Files to Update

Search for `console.error` in components where there's no user feedback:

| File | Current | Fix |
|------|---------|-----|
| `src/components/lookbooks/EditLookbookModal.tsx:68` | `console.error` only | Add `showErrorToast('Failed to save lookbook')` |
| `src/components/wardrobe/ImageCropper.web.tsx:78` | `console.error` only | Add `showErrorToast('Failed to crop image')` |
| `src/components/outfits/OutfitScheduleSection.tsx:44` | `console.error` + silent return | Add `showErrorToast('Failed to load schedule')` |
| `src/components/wardrobe/CropEditor.tsx:234` | `console.error` + silent fallback | OK as-is (graceful fallback to original image) |

### Pattern to Follow
```typescript
import { showErrorToast } from '@/utils/toast';

try {
  await doSomething();
} catch (error: any) {
  // Skip user-initiated cancellations
  if (error?.message === 'User cancelled') return;

  if (__DEV__) console.error('Context:', error);
  showErrorToast('User-friendly message');
}
```

---

## 2.5 Implement Native ImageCropper

**Owner:** Codex
**Branch:** `feature/native-image-cropper`

### Task Description

`src/components/wardrobe/ImageCropper.native.tsx` currently returns `null`. Implement a native image cropper.

### Implementation Options

**Option A: expo-image-manipulator (Recommended)**
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

// Crop image to square
const result = await ImageManipulator.manipulateAsync(
  uri,
  [{ crop: { originX, originY, width, height } }],
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);
```

**Option B: react-native-image-crop-picker**
More feature-rich but adds native dependency.

### Architecture

Match the web version's API:
```typescript
interface ImageCropperProps {
  imageUri: string;
  onCropComplete: (croppedUri: string) => void;
  onCancel: () => void;
  aspectRatio?: number; // default 1 (square)
}
```

### Files to Modify
- `src/components/wardrobe/ImageCropper.native.tsx` — Full implementation
- May need `expo install expo-image-manipulator` if not already installed

---

## 2.6 Add Sentry Error Reporting

**Owner:** Claude (setup) → Codex (instrument)
**Branch:** `infra/sentry`

### Task Description

Add crash reporting and performance monitoring.

### Setup Steps

1. `npx expo install sentry-expo @sentry/react-native`
2. Configure in `app.config.js`:
   ```javascript
   plugins: [
     ['sentry-expo', { organization: 'full-stylist', project: 'mobile' }]
   ]
   ```
3. Initialize in `app/_layout.tsx`:
   ```typescript
   import * as Sentry from '@sentry/react-native';
   Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
   ```
4. Wrap root component with `Sentry.wrap()`
5. Add `EXPO_PUBLIC_SENTRY_DSN` to `.env.local`

### Integration Points
- Error boundaries: Call `Sentry.captureException(error)` in `componentDidCatch()`
- Netlify functions: Add `@sentry/node` to server-side functions
- Performance: Add Sentry performance tracing to AI job polling

---

## 2.7 Implement Unsaved Changes Guards

**Owner:** Codex
**Branch:** `feature/unsaved-changes`

### Task Description

Warn users before navigating away from forms with unsaved changes.

### Implementation

**Create:** `src/hooks/ui/useUnsavedChanges.ts`

```typescript
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export function useUnsavedChanges(isDirty: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!isDirty) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [isDirty, navigation]);
}
```

### Screens to Wire Up

| Screen | `isDirty` Condition |
|--------|-------------------|
| `app/wardrobe/item/[id]/edit.tsx` | Any field changed from initial values |
| `app/lookbooks/new.tsx` | Title or description has content (already calculated but unused) |
| `app/outfits/[id].tsx` (editor) | Title, notes, or items changed |
| `app/headshot/new.tsx` | Image selected or presets chosen |
| `app/onboarding.tsx` | Form fields filled (skip guard if completing onboarding) |

### Codex Delegation Template
```
Task: Add unsaved changes detection to form screens
Files to modify: [screens listed above]
Context: New hook useUnsavedChanges(isDirty) shows confirmation dialog on back navigation.
Requirements:
- Import useUnsavedChanges from @/hooks/ui/useUnsavedChanges
- Calculate isDirty by comparing current state to initial state
- lookbooks/new.tsx already has isDirty calculated (line 44-50) — just wire it up
- Do NOT block programmatic navigation after successful save
Patterns to follow: See the hook implementation for the pattern.
```

---

# Phase 3: Polish & Accessibility

_Goal: Improve user experience, accessibility, and consistency._

---

## 3.1 Accessibility Audit & Fix

**Owner:** Codex (batched — large task)
**Branch:** `fix/accessibility`

### Task Description

Add `accessibilityRole` and `accessibilityLabel` to all interactive elements.

### Pattern Reference (from SearchHeaderRow.tsx)
```typescript
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Close search"
  onPress={onClose}
>
```

### Components Needing Labels (~30)

#### Social Actions (High Priority)
| Component | Elements | Labels Needed |
|-----------|----------|--------------|
| `shared/SocialActionBar.tsx` (after consolidation) | Like, Comment, Repost, Save, Find Similar | `"Like, 5 likes"`, `"Comment, 3 comments"`, etc. |
| `wardrobe/ItemCard.tsx` | Favorite button, card press | `"Favorite item"`, `"View [item name]"` |

#### Grid Items
| Component | Elements | Labels Needed |
|-----------|----------|--------------|
| `wardrobe/ItemGrid.tsx` | Each grid item | `"View item"` (or item name if available) |
| `social/DiscoverGrid.tsx` | Each grid item | `"View post"` |
| `headshots/HeadshotSocialTab.tsx` | Each grid item | `"View headshot"` |

#### Buttons Without Labels
| Component | Elements | Labels Needed |
|-----------|----------|--------------|
| `hair-and-makeup/ColorPresetTile.tsx` | Tile press, info button | `"Select [color name]"`, `"Info about [color]"` |
| `hair-and-makeup/PresetGridTile.tsx` | Tile press, info button | `"Select [preset name]"`, `"Info about [preset]"` |
| `headshots/FaceMenuModal.tsx` | Menu items | `"Set as active"`, `"Share"`, `"Delete"` |
| `wardrobe/VisibilitySelector.tsx` | Toggle buttons | `"Set visibility to public"`, etc. |
| `shared/layout/EmptyState.tsx` | Action button | Dynamic label from `actionLabel` prop |
| `calendar/StatusSelector.tsx` | Status buttons | `"Set status to worn"`, etc. |

#### Images
| Component | Elements | Labels Needed |
|-----------|----------|--------------|
| `wardrobe/ItemImageCarousel.tsx` | Images | `accessibilityLabel="Item photo [n] of [total]"` |
| `profile/ProfileHeader.tsx` | Avatar | `accessibilityLabel="Profile photo"` |

### Codex Delegation Template
```
Task: Add accessibility labels to 30 components
Context: We need accessibilityRole and accessibilityLabel on all interactive elements.
Requirements:
- Every TouchableOpacity/Pressable needs accessibilityRole="button" + accessibilityLabel
- Every Image needs accessibilityLabel describing what it shows
- Tab-like elements need accessibilityRole="tab"
- Include dynamic counts where relevant: "Like, 5 likes"
- Match the pattern in src/components/search/SearchHeaderRow.tsx
Do NOT: Add labels to non-interactive View elements or decorative icons
```

---

## 3.2 Standardize Empty States

**Owner:** Codex (batched)
**Branch:** `fix/empty-states`

### Task Description

Replace inline "no results" text and blank spaces with the `EmptyState` component.

### EmptyState API (from `src/components/shared/layout/EmptyState.tsx`)
```typescript
<EmptyState
  icon="folder-open-outline"  // Ionicons name
  title="No items yet"
  message="Add your first wardrobe item to get started"
  actionLabel="Add Item"
  onAction={() => router.push('/wardrobe/add')}
/>
```

### Screens to Update

| Screen | Current | EmptyState Config |
|--------|---------|-------------------|
| Wardrobe (no items) | Varies | `icon="shirt-outline"` title="Your wardrobe is empty" action="Add your first item" |
| Outfits (no outfits) | Varies | `icon="color-palette-outline"` title="No outfits yet" action="Create an outfit" |
| Lookbooks (no lookbooks) | Varies | `icon="albums-outline"` title="No lookbooks yet" action="Create a lookbook" |
| Search (no results) | Inline text | `icon="search-outline"` title="No results found" message="Try a different search term" |
| Notifications (none) | Varies | `icon="notifications-off-outline"` title="No notifications" message="You're all caught up" |
| Calendar (no entries) | Varies | `icon="calendar-outline"` title="Nothing scheduled" action="Plan an outfit" |
| Following feed (empty) | Varies | `icon="people-outline"` title="No posts yet" message="Follow people to see their posts" |
| Comments (none) | Varies | `icon="chatbubble-outline"` title="No comments yet" message="Be the first to comment" |

---

## 3.3 Standardize Modal Behavior

**Owner:** Claude (document pattern) → Codex (apply)
**Branch:** `fix/modal-consistency`

### Task Description

Document and enforce consistent modal patterns.

### Modal Pattern Guide

| Modal Type | Component | Use Case | Gesture |
|-----------|-----------|----------|---------|
| **Bottom Sheet** | `@gorhom/bottom-sheet` | Content selection, pickers, filters | Swipe down to close |
| **Alert/Confirm** | `AlertModal` or `Modal` | Confirmations, warnings, errors | Tap backdrop or buttons |
| **Full-screen** | Stack navigation or `Modal presentationStyle="fullScreen"` | Complex forms, editors | Back button/gesture |
| **Dropdown** | `DropdownMenuModal` | Context menus (3-dot menus) | Tap backdrop |

### Inconsistencies to Fix

Audit all modal usage. Each modal should match the pattern for its type. Key areas:
- Bottom sheets should all use `@gorhom/bottom-sheet` (not custom `Modal` with slide animation)
- Alert dialogs should use `AlertModal` consistently
- Ensure all modals have backdrop dismiss (unless blocking)

---

## 3.4 Add Analytics Infrastructure

**Owner:** Claude (setup) → Codex (instrument)
**Branch:** `infra/analytics`

### Task Description

Add event tracking for key user journeys.

### Recommended: PostHog or Mixpanel (React Native SDKs)

### Setup

1. Install: `npm install posthog-react-native`
2. Initialize in `app/_layout.tsx`
3. Create `src/lib/analytics.ts`:
   ```typescript
   export function trackEvent(name: string, properties?: Record<string, any>) {
     if (__DEV__) {
       console.log('[Analytics]', name, properties);
       return;
     }
     posthog.capture(name, properties);
   }
   ```

### Key Events to Track

| Event | When | Properties |
|-------|------|-----------|
| `wardrobe_item_added` | Item created | `category`, `source` (camera/gallery) |
| `outfit_generated` | AI generation complete | `item_count`, `duration_ms` |
| `outfit_saved` | Outfit saved | `visibility`, `item_count` |
| `headshot_generated` | Headshot AI complete | `preset_type`, `duration_ms` |
| `lookbook_created` | Lookbook created | `outfit_count` |
| `calendar_entry_added` | Calendar entry saved | `status`, `has_outfit` |
| `search_performed` | Search executed | `query_length`, `filter_type`, `result_count` |
| `follow_user` | Follow action | — |
| `share_content` | Share action | `content_type` |
| `onboarding_completed` | Onboarding finished | `steps_completed`, `skipped_selfie` |

---

## 3.5 Expand Test Coverage

**Owner:** Codex (multiple batched sessions)
**Branch:** `test/expand-coverage`

### Current State
- 7 test suites, 149 tests (all passing)
- Coverage: `src/utils/` and `src/lib/` pure functions only
- Testing libraries installed: jest, jest-expo, @testing-library/react-native

### Target: 300+ tests

### Priority Test Groups

#### Group 1: Remaining utility functions
| File | Tests Needed |
|------|-------------|
| `src/utils/lookbookHelpers.ts` | `isLookbookEditable`, `isSystemLookbook`, `getVisibilityLabel` |
| `src/utils/storeReview.ts` | Milestone tracking, eligibility checks |
| `src/utils/imageUtils.ts` | Edge cases: 0-dimension images, unsupported types |

#### Group 2: Lib functions (data layer)
| Module | Tests Needed |
|--------|-------------|
| `src/lib/engagement/likes.ts` | `likeEntity`, `unlikeEntity` (mock Supabase) |
| `src/lib/engagement/saves.ts` | `saveEntity`, `unsaveEntity` |
| `src/lib/engagement/comments.ts` | `createComment`, `getComments`, `deleteComment` |
| `src/lib/user/follows.ts` | `followUser`, `unfollowUser`, `isFollowing` |
| `src/lib/wardrobe/categories.ts` | Category cache, `getCachedWardrobeCategories` |
| `src/lib/ai-jobs/polling.ts` | `pollAIJob`, circuit breaker logic |
| `src/lib/images/transforms.ts` | `getImageUrl` with different size classes |
| `src/lib/images/helpers.ts` | `isValidImageType`, `getPublicImageUrl` |

#### Group 3: Hook tests (most impactful)
| Hook | Tests Needed | Mock Dependencies |
|------|-------------|-------------------|
| `useEngagementEntity` | Like/save toggles, optimistic updates, rollback | Mock `lib/engagement/*` |
| `useEngagementFeed` | Batch operations, deduplication | Mock `lib/engagement/*` |
| `useSearch` | Debounce, filter changes, empty results | Mock `lib/` search functions |
| `useFilters` | Filter application, clear, state updates | None (pure state) |
| `useCalendarEntries` | Date range queries, image batching | Mock Supabase |

#### Group 4: Component tests
| Component | Tests Needed |
|-----------|-------------|
| `EmptyState` | Renders icon, title, message, optional action |
| `LoadingSpinner` | Renders with/without text |
| `ItemCard` | Renders image, favorite state, memoization |
| `SocialActionBar` | Button states, loading indicators, counts |
| `SearchResultsPanel` | Empty state, results list, filter bar |

### Codex Delegation Template
```
Task: Write tests for [module/hook/component]
Files to create: src/[path]/__tests__/[name].test.ts
Context: Expanding test coverage. Use existing test patterns.
Requirements:
- Use jest + @testing-library/react-native for components
- Mock Supabase with jest.mock('@/lib/supabase')
- Mock lib functions with jest.mock('@/lib/[module]')
- Test happy path + error cases + edge cases
- Use describe/it blocks with clear names
Patterns to follow: Look at src/utils/__tests__/wardrobeUtils.test.ts for structure
Do NOT: Test implementation details. Test behavior and return values.
```

---

# Phase 4: New Features

_Goal: Build missing features. Each is a standalone project._

---

## 4.1 Marketplace (Browse & Buy)

**Owner:** Claude (architecture) → Codex (implementation)
**Branch:** `feature/marketplace`

### Scope
- Browse listings from other users
- View listing detail with images, price, condition
- "Buy" button (initially just creates a transaction record)
- Seller dashboard: view own listings, manage status

### Architecture

**New files needed:**
- `app/marketplace.tsx` — Replace placeholder with browse view
- `app/marketplace/[id].tsx` — Listing detail
- `src/components/marketplace/` — ListingCard, ListingGrid, PriceTag, ConditionBadge
- `src/hooks/marketplace/` — useListings, useListingDetail, useCreateListing
- `src/lib/marketplace/` — Browse queries, search, filtering (extend existing `lib/listings/`)

**Database:** Use existing `listings`, `listing_images`, `transactions` tables.

### Phases
1. Seller: Create listing from wardrobe item (form + photo selection)
2. Browse: Grid view with filters (category, price, size, condition)
3. Detail: Full listing view with image carousel
4. Purchase: "Buy" creates transaction (no real payment yet)

---

## 4.2 Bulk Import

**Owner:** Claude (architecture) → Codex (implementation)
**Branch:** `feature/import`

### Scope
- Select multiple photos from gallery
- AI auto-tags each photo (category, color, brand detection)
- User reviews/edits before saving
- Batch create wardrobe items

### Architecture

**New files needed:**
- `app/import.tsx` — Replace placeholder with import flow
- `src/components/import/` — PhotoPicker, ImportPreview, BatchTagEditor
- `src/hooks/import/` — useImportFlow, useBatchAutoTag
- `src/lib/import/` — Batch upload, batch AI tagging orchestration

### Flow
1. User taps "Import" → opens multi-photo picker
2. Selected photos shown in review grid
3. "Auto-tag All" triggers batch AI job
4. User reviews/edits each item's category, attributes
5. "Import All" batch-creates wardrobe items

---

## 4.3 Social Hub Tab

**Owner:** Claude (architecture) → Codex (implementation)
**Branch:** `feature/social-hub`

### Scope
- Dedicated social tab replacing the blank one
- Aggregated feed: outfits + lookbooks + headshots from followed users
- Trending/discover section
- Activity summary (who liked/followed/commented recently)

### Architecture

This largely exists already in the social/ components. The task is to create a proper screen that composes them:

**File:** `app/(tabs)/social.tsx` — Full implementation using:
- `useFeed` hook (already complete)
- `FeedCard`, `FeedOutfitCard`, `FeedLookbookCarousel` (already complete)
- `DiscoverGrid` (already complete)
- Add tab pills: "Following" | "Discover" | "Activity"

---

## 4.4 Calendar Reminders

**Owner:** Codex
**Branch:** `feature/calendar-reminders`

### Scope
- Push notification reminders for scheduled outfits
- Configurable: morning of, night before, or custom time
- Managed via calendar entry form

### Architecture

**New files needed:**
- `src/lib/calendar/reminders.ts` — Schedule/cancel local notifications
- Add `reminder_time` field to calendar entry form
- Use `expo-notifications` `scheduleNotificationAsync` for local scheduling

### Implementation
1. When calendar entry is saved with a reminder time, schedule a local notification
2. Notification content: "Your outfit for today: [outfit name]" with outfit thumbnail
3. Tapping notification deep-links to `/calendar/day/[date]`
4. When entry is deleted, cancel the scheduled notification

---

## 4.5 i18n Infrastructure

**Owner:** Claude (setup) → Codex (extract strings)
**Branch:** `infra/i18n`

### Scope
- Set up react-i18next
- Extract hardcoded English strings into locale files
- Support language switching in settings

### Setup

1. `npm install react-i18next i18next`
2. Create `src/i18n/`:
   - `index.ts` — i18next initialization
   - `locales/en.json` — English strings
3. Wrap app with `I18nextProvider` in `app/_layout.tsx`

### String Extraction Priority

Start with:
1. `src/constants/generationMessages.ts` — All AI generation messages
2. `src/components/shared/layout/EmptyState.tsx` — Empty state messages
3. Navigation labels in `app/(tabs)/_layout.tsx`
4. Auth screen text (`app/auth/login.tsx`, `signup.tsx`)
5. Settings screen labels (`app/account-settings.tsx`)

### Codex Delegation Template
```
Task: Extract hardcoded strings to i18n locale file
Files to modify: [list of files]
Context: Using react-i18next. Import useTranslation() hook, replace strings with t('key').
Requirements:
- Key format: feature.screen.element (e.g., "wardrobe.empty.title")
- Add all extracted strings to src/i18n/locales/en.json
- Do NOT translate — just extract to English locale file
```

---

# Appendix: Delegation Quick Reference

### When Claude Should Act Directly
- Architectural decisions (new file structure, pattern changes)
- Config files (tsconfig, CI/CD, eslint)
- Small fixes (< 30 lines)
- Code review of Codex output
- Bug investigation

### When to Delegate to Codex
- Repetitive changes across many files (theme color fixes, accessibility labels)
- Test writing (utility, hook, component tests)
- New component implementation from clear specs
- Refactors following established patterns

### Codex Command Template
```bash
codex exec --full-auto --sandbox workspace-write "$(cat <<'EOF'
Task: [one-line summary]
Files to modify: [specific list]
Context: [what this is about]
Requirements:
- [specific requirement 1]
- [specific requirement 2]
Patterns to follow: Look at [existing_file] for the pattern.
Do NOT: [constraints]
EOF
)"
```

### Post-Codex Review Checklist
```bash
git diff --stat                          # Check scope of changes
git diff -- src/hooks/ | grep supabase   # Verify no new boundary violations
npm run typecheck                        # TypeScript passes
npm test                                 # Tests pass
grep -r "any" src/ --include="*.ts" | wc -l  # Track any-type count
```
