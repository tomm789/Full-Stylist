# Codex Task: Test Infrastructure + Initial Test Suite

## Summary
Set up Jest test infrastructure for the Expo/React Native project and write unit tests for 5 pure utility/library modules. The project currently has only 2 test files (calendar utils). We need a working `npm test` command and comprehensive tests for the most testable modules.

## Phase 1: Jest Configuration

### 1A. Install dependencies
```bash
npx expo install -- --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

### 1B. Create `jest.config.js` in project root
```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/hooks$': '<rootDir>/src/hooks/index.ts',
    '^@/utils$': '<rootDir>/src/utils/index.ts',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/styles$': '<rootDir>/src/styles/index.ts',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/constants/(.*)$': '<rootDir>/src/constants/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|moti|@supabase/.*|date-fns)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/lib/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
```

### 1C. Create `jest.setup.js` in project root
```js
// Minimal setup — add mocks as needed
global.__DEV__ = true;
```

### 1D. Add test script to `package.json`
Add to the `"scripts"` section:
```json
"test": "jest",
"test:coverage": "jest --coverage"
```

### 1E. Verify existing tests pass
Run `npm test` and confirm the 2 existing test files pass:
- `src/lib/calendar/__tests__/dateUtils.test.ts`
- `src/hooks/calendar/__tests__/useCalendarState.test.ts`

If they fail, fix compatibility issues in the config (do NOT modify the test files themselves).

---

## Phase 2: Write Unit Tests

Write tests for the following 5 modules. Place test files in `__tests__/` directories next to the source files, following the existing pattern from `src/lib/calendar/__tests__/dateUtils.test.ts`.

### 2A. `src/lib/outfits/__tests__/normalizeLabels.test.ts`

Test the 3 exports from `src/lib/outfits/normalizeLabels.ts`:

**`normalizeLabel(value)`** — Title-cases and trims input:
- Normal strings: `"  hello world  "` → `"Hello World"`
- Multiple spaces: `"foo   bar"` → `"Foo Bar"`
- Non-string input (number, null, undefined, object) → `""`
- Empty/whitespace-only string → `""`
- Already normalized string stays the same
- Single word: `"hello"` → `"Hello"`

**`normalizeLabelKey(value)`** — Same as above but lowercased:
- `"  Hello WORLD "` → `"hello world"`
- Non-string → `""`

**`normalizeLabelList(values?)`** — Deduplicates and normalizes an array:
- `["Red", "red", "RED"]` → `["Red"]` (keeps first occurrence's casing after normalization)
- Mixed types: `["valid", 42, null, "another"]` → `["Valid", "Another"]`
- `undefined` / `null` / `[]` → `[]`
- Preserves order of first occurrence

### 2B. `src/lib/outfits/__tests__/canvasLayout.test.ts`

Test exports from `src/lib/outfits/canvasLayout.ts`:

**`calculateGridLayout(itemCount)`**:
- 0 items → {cols: 1, rows: 1}
- 1 item → {cols: 1, rows: 1}
- 2 items → {cols: 2, rows: 1}
- 3-4 items → {cols: 2, rows: 2}
- 5-6 items → {cols: 3, rows: 2}
- 7-9 items → {cols: 3, rows: 3}
- Large numbers (10, 16, 25)

**`clampCanvasCenter(value)`**:
- Values within [0.05, 0.95] stay unchanged
- Values below 0.05 → 0.05
- Values above 0.95 → 0.95
- Edge cases: 0, 1, negative, > 1

**`clampCanvasScale(value)`**:
- Values within [0.55, 2.2] stay unchanged
- Values below 0.55 → 0.55
- Values above 2.2 → 2.2

**`getDefaultOutfitCanvasLayout(index, total)`**:
- Single item: centered at (0.5, 0.5) with scale ~1.0
- Two items: side by side
- Four items: 2x2 grid
- Returns valid centerX, centerY (within canvas), scale (within clamp range), zIndex

### 2C. `src/utils/__tests__/wardrobeUtils.test.ts`

Test exports from `src/utils/wardrobeUtils.ts`:

**`isMultiSelectCategory(categoryId, categoryName?)`**:
- Returns true for multi-select categories (accessories, jewellery, jewelry, activewear, intimates, sleepwear)
- Returns false for regular categories (tops, bottoms, shoes, dresses)
- Case handling

**`sortItems(items, sortBy)`**:
- Sort by 'recent' — newest first by `created_at`
- Sort by 'oldest' — oldest first
- Sort by 'name' — alphabetical by title
- Sort by 'favorite' — favorited items first
- Empty array → empty array
- Does not mutate original array

**`searchItems(items, query)`**:
- Matches on title, description, brand, color_primary
- Case insensitive
- Empty query → all items
- No matches → empty array

**`groupItemsByCategory(items)`**:
- Groups correctly
- Empty array → empty map

**`getItemCountByCategory(items)`**:
- Counts correctly per category

**`parseJsonField<T>(field)`**:
- String input that is valid JSON → parsed object
- Already an object → returned as-is
- null/undefined → null
- Invalid JSON string → handle gracefully

**`formatSize(size)`**:
- String → returns as-is
- Array → joins with comma
- Object → formats as key-value pairs
- Null/undefined → empty or graceful fallback

**`getVisibilityLabel(visibility)`**:
- Maps each enum value correctly

**`isOwnItem(item, userId)`**:
- Returns true when owner matches
- Returns false when different

Create minimal `WardrobeItem` fixture objects for testing — only include the fields each function actually uses.

### 2D. `src/utils/__tests__/formatUtils.test.ts`

Test `formatTimestamp(timestamp)` from `src/utils/formatUtils.ts`:

Use `jest.useFakeTimers()` and `jest.setSystemTime()` to control `new Date()`.

- Timestamp from seconds ago → "Just now"
- Timestamp from 5 minutes ago → "5m ago"
- Timestamp from 2 hours ago → "2h ago"
- Timestamp from 3 days ago → "3d ago"
- Timestamp from 8+ days ago → locale date string
- Invalid input / null → graceful handling

### 2E. `src/utils/__tests__/imageUtils.test.ts`

Test ONLY the pure functions from `src/utils/imageUtils.ts` (no Supabase mocking needed):

**`isValidImageType(type)`**:
- Valid: 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
- Invalid: 'image/svg+xml', 'application/pdf', '', undefined

**`isValidImageSize(size, maxSizeMB?)`**:
- Under limit → true
- Over limit → false
- Custom maxSizeMB
- Edge: exactly at limit
- Default max (10 MB = 10 * 1024 * 1024 bytes)

**`getAspectRatio(width, height)`**:
- Square → 1
- Landscape → > 1
- Portrait → < 1

**`getResponsiveImageDimensions(origW, origH, maxW, maxH?)`**:
- Image smaller than max → stays same size
- Image wider than max → scales down preserving ratio
- Image taller than max → scales down preserving ratio
- Square constraints

---

## Constraints

- Do NOT modify any existing source files — only add test files and config files
- Do NOT modify the 2 existing test files (`dateUtils.test.ts`, `useCalendarState.test.ts`)
- Follow the existing test style from `src/lib/calendar/__tests__/dateUtils.test.ts`: describe blocks, clear test names, helper functions at top
- All tests MUST pass when running `npm test`
- Use TypeScript for all test files (`.test.ts`)
- Do not add any React component tests or hook tests in this task — pure functions only

## Files to Create/Modify

**Create:**
- `jest.config.js`
- `jest.setup.js`
- `src/lib/outfits/__tests__/normalizeLabels.test.ts`
- `src/lib/outfits/__tests__/canvasLayout.test.ts`
- `src/utils/__tests__/wardrobeUtils.test.ts`
- `src/utils/__tests__/formatUtils.test.ts`
- `src/utils/__tests__/imageUtils.test.ts`

**Modify:**
- `package.json` — add `"test"` and `"test:coverage"` scripts

## Verification

After all changes, run:
```bash
npm test
```
All tests (existing + new) must pass. Report the total test count and any issues.

## Output

Write a summary to `CODEX_TASK_REPORT_TESTS.md` listing:
1. Jest config setup details and any compatibility fixes needed
2. Test counts per file
3. Total test count
4. Any edge cases discovered in the source code
5. Any issues or decisions made
