# Codex Task: Fix Require Cycles + Style File Route Warnings

## Summary
Fix 7 require cycles and 13 style files incorrectly treated as routes by Expo Router. These produce warnings on every Metro startup. All fixes are import path changes and file renames — no logic changes.

---

## Task A: Fix Require Cycles (7 cycles, 6 file changes)

Every cycle is caused by a file importing from its own ancestor barrel `index.ts`. The fix is always: import directly from the specific source file.

### Fix 1: `src/lib/images.ts`

```typescript
// BEFORE (line ~2):
import { getOutfit } from './outfits';

// AFTER:
import { getOutfit } from './outfits/core';
```

### Fix 2: `src/contexts/AuthContext.tsx` (fixes Cycles 2 AND 3)

```typescript
// BEFORE (line ~5):
import { clearHairMakeupSessionVisited } from '@/hooks/headshot/useHairAndMakeup';

// AFTER:
import { clearHairMakeupSessionVisited } from '@/hooks/headshot/useHeadshotSessionData';
```

Verify that `clearHairMakeupSessionVisited` is exported from `useHeadshotSessionData.ts`. If it's not, find where the canonical definition lives and import from there.

### Fix 3: `src/components/shared/filters/FilterPillGroup.tsx`

```typescript
// BEFORE (line ~8):
import { PillButton } from '@/components/shared';

// AFTER — import directly from the PillButton source file:
import PillButton from '@/components/shared/buttons/PillButton';
```

Check the actual export style of PillButton (default vs named) and adjust the import accordingly. Look in `src/components/shared/buttons/PillButton.tsx`.

### Fix 4: `src/components/shared/TabPillsRow.tsx`

```typescript
// BEFORE (line ~9):
import { PillButton } from '@/components/shared';

// AFTER:
import PillButton from '@/components/shared/buttons/PillButton';
```

Same as Fix 3 — match the export style.

### Fix 5: `src/components/outfits/OutfitsModals.tsx`

```typescript
// BEFORE (line ~8):
import { SortModal } from '@/components/outfits';

// AFTER — import directly:
import SortModal from '@/components/outfits/SortModal';
```

Check the actual file name and export style. It might be `SortModal.tsx` or named differently.

### Fix 6: `src/components/wardrobe/WardrobeModalStack.tsx`

```typescript
// BEFORE (lines ~4-9):
import {
  ItemDetailModal,
  OutfitCreatorOptionsModal,
  HeadshotSelectorModal,
  WardrobeCameraOverlay,
} from '@/components/wardrobe';

// AFTER — import each directly:
import ItemDetailModal from '@/components/wardrobe/ItemDetailModal';
import OutfitCreatorOptionsModal from '@/components/wardrobe/OutfitCreatorOptionsModal';
import HeadshotSelectorModal from '@/components/wardrobe/HeadshotSelectorModal';
import WardrobeCameraOverlay from '@/components/wardrobe/WardrobeCameraOverlay';
```

Check each file's export style (default vs named) and adjust accordingly. Some may use `export default function` while others use `export function`.

---

## Task B: Fix Style Files Treated as Routes (13 files)

Expo Router treats every `.ts`/`.tsx` file inside `app/` as a route. Style files are not routes and shouldn't be there.

### Approach: Rename with `_` prefix

Files prefixed with `_` are ignored by Expo Router. Rename each style file and update its import in the corresponding route file.

### Files to rename:

| Current path | New path |
|---|---|
| `app/(tabs)/wardrobe.styles.ts` | `app/(tabs)/_wardrobe.styles.ts` |
| `app/ai-settings.styles.ts` | `app/_ai-settings.styles.ts` |
| `app/archive.styles.ts` | `app/_archive.styles.ts` |
| `app/import.styles.ts` | `app/_import.styles.ts` |
| `app/search.styles.ts` | `app/_search.styles.ts` |
| `app/auth/login.styles.ts` | `app/auth/_login.styles.ts` |
| `app/auth/signup.styles.ts` | `app/auth/_signup.styles.ts` |
| `app/bodyshot/new.styles.ts` | `app/bodyshot/_new.styles.ts` |
| `app/feedback/new.styles.ts` | `app/feedback/_new.styles.ts` |
| `app/headshot/[id]/view.styles.ts` | `app/headshot/[id]/_view.styles.ts` |
| `app/listings/new.styles.ts` | `app/listings/_new.styles.ts` |
| `app/outfits/[id]/view.styles.ts` | `app/outfits/[id]/_view.styles.ts` |
| `app/social/following-wardrobes.styles.ts` | `app/social/_following-wardrobes.styles.ts` |

Also check for any other `.styles.ts` files in `app/`:
| `app/bodyshot/[id]/styles.ts` | `app/bodyshot/[id]/_styles.ts` |
| `app/headshot/[id]/styles.ts` | `app/headshot/[id]/_styles.ts` |
| `app/wardrobe/item/[id]/styles.ts` | `app/wardrobe/item/[id]/_styles.ts` |
| `app/users/[id]/styles.ts` | `app/users/[id]/_styles.ts` |
| `app/calendar/styles.ts` | `app/calendar/_styles.ts` |

Search for ALL `.styles.ts` and `styles.ts` files inside `app/` and rename any that aren't route files.

### For each renamed file:
1. `git mv` the file to the new name
2. Find the route file that imports it (usually the file with the same base name, e.g., `wardrobe.tsx` imports `wardrobe.styles.ts`)
3. Update the import path to use the new `_` prefixed name

Example:
```typescript
// In app/(tabs)/wardrobe.tsx
// BEFORE:
import { createStyles } from './wardrobe.styles';
// AFTER:
import { createStyles } from './_wardrobe.styles';
```

---

## Constraints

- Do NOT change any logic or behavior
- Do NOT restructure barrels/index files — only change the problematic imports
- Do NOT modify test files
- Verify each import path is correct after changing (read the target file to confirm the export exists)
- All changes should be import path updates and file renames only

## Verification

After all changes, run:
```bash
npx expo start --clear 2>&1 | head -80
```

Check that:
1. No "Require cycle" warnings appear
2. No "missing the required default export" warnings appear
3. The app bundles successfully

Also run:
```bash
npm test
```
All 149 tests must still pass.

## Output

Write a summary to `CODEX_TASK_REPORT_CYCLES.md` listing:
1. Each cycle fixed with before/after imports
2. Each style file renamed with before/after paths
3. Verification results
