# Task: Extract inline styles from screen files to co-located style files

## Overview

Move inline `createStyles` and `StyleSheet.create` blocks from screen files to co-located style files. This is a mechanical extraction — no logic changes.

There are two patterns depending on whether styles are theme-dependent or static.

## Pattern A: Theme-dependent `createStyles(colors)`

**Source** (in screen file):
```tsx
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { ... },
  // ...
});
```

**Target** (new styles file):
```tsx
import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themes';
import { spacing, borderRadius, typography, shadows } from '@/styles/theme';
// add other imports as needed based on what the styles use

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { ... },
  // ...
});
```

**Screen file after extraction** keeps:
```tsx
import { createStyles } from './styles'; // or appropriate relative path
// ... existing useMemo stays:
const styles = useMemo(() => createStyles(colors), [colors]);
```

## Pattern B: Static `StyleSheet.create`

**Source** (in screen file):
```tsx
const styles = StyleSheet.create({
  container: { ... },
  // ...
});
```

**Target** (new styles file):
```tsx
import { StyleSheet } from 'react-native';
import { spacing, borderRadius, typography } from '@/styles/theme';
// add other imports as needed

export const styles = StyleSheet.create({
  container: { ... },
  // ...
});
```

**Screen file after extraction** keeps:
```tsx
import { styles } from './styles'; // or appropriate relative path
```

## Files to extract (ordered by style block size)

### Batch 1 — Large blocks (100+ lines of styles)

| Screen file | Style lines | Pattern | Target styles file |
|-------------|-------------|---------|-------------------|
| `app/bodyshot/[id].tsx` | 313 | A (colors) | `app/bodyshot/[id]/styles.ts` |
| `app/ai-settings.tsx` | 199 | A (colors) | `app/ai-settings.styles.ts` |
| `app/listings/new.tsx` | 172 | B (static) | `app/listings/new.styles.ts` |
| `app/headshot/[id].tsx` | 166 | B (static) | `app/headshot/[id]/styles.ts` |
| `app/wardrobe/item/[id].tsx` | 143 | A (colors) | `app/wardrobe/item/[id]/styles.ts` |
| `app/import.tsx` | 122 | B (static) | `app/import.styles.ts` |

### Batch 2 — Medium blocks (50-100 lines)

| Screen file | Style lines | Pattern | Target styles file |
|-------------|-------------|---------|-------------------|
| `app/users/[id].tsx` | 62+105 | A+B (both) | `app/users/[id]/styles.ts` (combine both into one file) |
| `app/outfits/[id]/view.tsx` | 67+91 | A+B (both) | `app/outfits/[id]/view.styles.ts` (combine both) |
| `app/feedback/new.tsx` | 100 | B (static) | `app/feedback/new.styles.ts` |
| `app/social/following-wardrobes.tsx` | 74 | A (colors) | `app/social/following-wardrobes.styles.ts` |
| `app/archive.tsx` | 75 | A (colors) | `app/archive.styles.ts` |
| `app/auth/signup.tsx` | 66 | B (static) | `app/auth/signup.styles.ts` |
| `app/auth/login.tsx` | 67 | B (static) | `app/auth/login.styles.ts` |
| `app/(tabs)/wardrobe.tsx` | 61 | A (colors) | `app/(tabs)/wardrobe/styles.ts` |

### Batch 3 — Small blocks (under 50 lines)

| Screen file | Style lines | Pattern | Target styles file |
|-------------|-------------|---------|-------------------|
| `app/calendar/index.tsx` | 37 | A (colors) | `app/calendar/styles.ts` |
| `app/bodyshot/new.tsx` | 30 | A (colors) | `app/bodyshot/new.styles.ts` |
| `app/search.tsx` | 28 | B (static) | `app/search.styles.ts` |

### Skip (too small to bother, < 10 lines)
- `app/onboarding.tsx` (9 lines)
- `app/feedback/index.tsx` (9 lines)

### Already done or no styles
- `app/lookbooks/[id]/view.tsx` — no inline styles
- `app/feedback/[id].tsx` — no inline styles
- `app/(tabs)/outfits/index.tsx` — already in `outfits/styles.ts`

## For files with BOTH createStyles and StyleSheet.create

Some files (outfits/[id]/view.tsx, users/[id].tsx) have both a theme-dependent `createStyles` AND a static `StyleSheet.create`. Combine them into one styles file:

```tsx
// styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themes';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // ... theme-dependent styles
});

export const staticStyles = StyleSheet.create({
  // ... static styles
});
```

The screen imports both:
```tsx
import { createStyles, staticStyles } from './styles';
```

## Constraints

- Do NOT change any style values, keys, or structure
- Do NOT rename style keys
- Do NOT change how styles are consumed in the component (keep useMemo pattern for createStyles)
- Move ALL style-related imports (spacing, borderRadius, typography, shadows, etc.) to the new file
- If the screen file imports theme types only for styles, remove that import from the screen
- Each new styles file must be self-contained (all its own imports)

## Acceptance criteria

- [ ] Each screen file no longer contains `createStyles` or `StyleSheet.create` definitions (except onboarding and feedback/index which are skipped)
- [ ] Each new styles file exports the style factory or static styles
- [ ] Screen files import from the new co-located styles file
- [ ] No TypeScript errors related to styles (theme type errors from pre-existing issues like missing jest types are OK)
