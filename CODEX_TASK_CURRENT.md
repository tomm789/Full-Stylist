# Codex Task: Move screen style files out of app/ directory

## Problem
Expo Router treats ALL files in `app/` as potential route files. The 19 `.styles.ts` files inside `app/` trigger "missing the required default export" warnings. The previous `_` prefix rename didn't work — Expo Router still picks them up as routes.

The correct fix (per Expo docs) is to move non-route files out of `app/` entirely.

## Task
Move all 19 screen style files from `app/` to `src/styles/screens/` and update every import.

The `@/styles` path alias already maps to `src/styles/` in both `tsconfig.json` and `metro.config.js`.

## File Mapping (source → destination)

Use `git mv` for each move.

| # | Current location (in app/) | New location (in src/styles/screens/) |
|---|---|---|
| 1 | `_ai-settings.styles.ts` | `ai-settings.styles.ts` |
| 2 | `_archive.styles.ts` | `archive.styles.ts` |
| 3 | `_import.styles.ts` | `import.styles.ts` |
| 4 | `_search.styles.ts` | `search.styles.ts` |
| 5 | `auth/_login.styles.ts` | `auth-login.styles.ts` |
| 6 | `auth/_signup.styles.ts` | `auth-signup.styles.ts` |
| 7 | `bodyshot/_new.styles.ts` | `bodyshot-new.styles.ts` |
| 8 | `bodyshot/[id]/_styles.ts` | `bodyshot-detail.styles.ts` |
| 9 | `calendar/_styles.ts` | `calendar.styles.ts` |
| 10 | `feedback/_new.styles.ts` | `feedback-new.styles.ts` |
| 11 | `headshot/[id]/_styles.ts` | `headshot-detail.styles.ts` |
| 12 | `headshot/[id]/_view.styles.ts` | `headshot-view.styles.ts` |
| 13 | `listings/_new.styles.ts` | `listings-new.styles.ts` |
| 14 | `(tabs)/outfits/_styles.ts` | `outfits-tab.styles.ts` |
| 15 | `(tabs)/_wardrobe.styles.ts` | `wardrobe-tab.styles.ts` |
| 16 | `outfits/[id]/_view.styles.ts` | `outfits-view.styles.ts` |
| 17 | `social/_following-wardrobes.styles.ts` | `social-following-wardrobes.styles.ts` |
| 18 | `users/[id]/_styles.ts` | `user-profile.styles.ts` |
| 19 | `wardrobe/item/[id]/_styles.ts` | `wardrobe-item-detail.styles.ts` |

## Import Updates

Each screen file needs its import updated. Use `@/styles/screens/` prefix for all.

| # | Screen file | Old import | New import |
|---|---|---|---|
| 1 | `app/ai-settings.tsx` | `from './_ai-settings.styles'` | `from '@/styles/screens/ai-settings.styles'` |
| 2 | `app/archive.tsx` | `from './_archive.styles'` | `from '@/styles/screens/archive.styles'` |
| 3 | `app/import.tsx` | `from './_import.styles'` | `from '@/styles/screens/import.styles'` |
| 4 | `app/search.tsx` | `from './_search.styles'` | `from '@/styles/screens/search.styles'` |
| 5 | `app/auth/login.tsx` | `from './_login.styles'` | `from '@/styles/screens/auth-login.styles'` |
| 6 | `app/auth/signup.tsx` | `from './_signup.styles'` | `from '@/styles/screens/auth-signup.styles'` |
| 7 | `app/bodyshot/new.tsx` | `from './_new.styles'` | `from '@/styles/screens/bodyshot-new.styles'` |
| 8 | `app/bodyshot/[id].tsx` | `from './[id]/_styles'` | `from '@/styles/screens/bodyshot-detail.styles'` |
| 9 | `app/calendar/index.tsx` | `from './_styles'` | `from '@/styles/screens/calendar.styles'` |
| 10 | `app/feedback/new.tsx` | `from './_new.styles'` | `from '@/styles/screens/feedback-new.styles'` |
| 11 | `app/headshot/[id].tsx` | `from './[id]/_styles'` | `from '@/styles/screens/headshot-detail.styles'` |
| 12 | `app/headshot/[id]/view.tsx` | `from './_view.styles'` | `from '@/styles/screens/headshot-view.styles'` |
| 13 | `app/listings/new.tsx` | `from './_new.styles'` | `from '@/styles/screens/listings-new.styles'` |
| 14 | `app/(tabs)/outfits/index.tsx` | `from './_styles'` | `from '@/styles/screens/outfits-tab.styles'` |
| 15 | `app/(tabs)/wardrobe.tsx` | `from './_wardrobe.styles'` | `from '@/styles/screens/wardrobe-tab.styles'` |
| 16 | `app/outfits/[id]/view.tsx` | `from './_view.styles'` | `from '@/styles/screens/outfits-view.styles'` |
| 17 | `app/social/following-wardrobes.tsx` | `from './_following-wardrobes.styles'` | `from '@/styles/screens/social-following-wardrobes.styles'` |
| 18 | `app/users/[id].tsx` | `from './[id]/_styles'` | `from '@/styles/screens/user-profile.styles'` |
| 19 | `app/wardrobe/item/[id]/index.tsx` | `from './_styles'` | `from '@/styles/screens/wardrobe-item-detail.styles'` |

## Steps

1. Create `src/styles/screens/` directory: `mkdir -p src/styles/screens`
2. Move each style file using `git mv` (see File Mapping table)
3. Update the import in each screen `.tsx` file (see Import Updates table)
4. Delete any empty directories left behind after moves (if any)
5. Verify no other files import these style files — each should only be imported once by its screen

## Constraints

- Do NOT modify the style file contents — only move/rename them
- Do NOT modify any exports — keep the same named/default exports
- Use `@/styles/screens/...` import paths (the `@/styles` alias maps to `src/styles/`)
- Do NOT create a barrel export (index.ts) in `src/styles/screens/` — each file is imported directly
- Do NOT touch any files outside the mapping above
- Do NOT change any logic or behavior

## Verification

After completing, run these checks:
```bash
# Should return nothing — no style files left in app/
find app/ -name "*.styles.ts" -o -name "_styles.ts" | head -20

# Should return 19 files
ls src/styles/screens/*.styles.ts | wc -l

# Tests should still pass
npm test
```

## Output

Write a summary to `CODEX_TASK_REPORT_STYLES.md` listing:
1. Each file moved with before/after paths
2. Each import updated with before/after
3. Verification results
