# Codex Task: Bugfix + Console Cleanup (Final Optimization)

## Summary
Fix 3 source code bugs discovered during test writing, gate remaining ~268 unguarded console statements behind `__DEV__`, and delete 3 orphaned `.backup` files.

---

## Task A: Fix Source Code Bugs

### Bug 1: `isValidImageType(undefined)` throws instead of returning false

**File:** `src/utils/imageUtils.ts`, line 78

**Problem:** `type.toLowerCase()` throws `TypeError: Cannot read properties of undefined` when `type` is `undefined` or `null`.

**Fix:** Add a guard at the top of the function:
```typescript
export function isValidImageType(type: string): boolean {
  if (!type || typeof type !== 'string') return false;
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(type.toLowerCase());
}
```

**Update the existing test** in `src/utils/__tests__/imageUtils.test.ts` — change the test that expects `isValidImageType(undefined)` to throw. Instead it should now return `false`:
```typescript
it('returns false for undefined input', () => {
  expect(isValidImageType(undefined as any)).toBe(false);
});
```

### Bug 2: `getResponsiveImageDimensions` upscales small images

**File:** `src/utils/imageUtils.ts`, lines 99-121

**Problem:** When `maxHeight` is not provided, the function always scales to `maxWidth` — even if the image is already smaller. A 500px wide image passed with `maxWidth=1000` gets upscaled to 1000px.

**Fix:** Only scale down, never up:
```typescript
export function getResponsiveImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } {
  const aspectRatio = getAspectRatio(originalWidth, originalHeight);

  let width = originalWidth;
  let height = originalHeight;

  // Scale down to fit maxWidth (never scale up)
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Scale down further to fit maxHeight if provided (never scale up)
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}
```

**Update the existing test** in `src/utils/__tests__/imageUtils.test.ts` — the test that expects upscaling behavior should now expect the original dimensions to be preserved:
```typescript
it('does not upscale images smaller than max', () => {
  expect(getResponsiveImageDimensions(500, 250, 1000)).toEqual({
    width: 500,
    height: 250,
  });
});
```

Also update other test expectations that relied on upscaling behavior. Keep tests for downscaling (images larger than max) — those should still work. Add a new test:
```typescript
it('scales down images larger than max width', () => {
  expect(getResponsiveImageDimensions(2000, 1000, 1000)).toEqual({
    width: 1000,
    height: 500,
  });
});

it('scales down to fit both maxWidth and maxHeight', () => {
  expect(getResponsiveImageDimensions(1000, 2000, 800, 600)).toEqual({
    width: 300,
    height: 600,
  });
});

it('returns original dimensions when within all constraints', () => {
  expect(getResponsiveImageDimensions(400, 300, 800, 600)).toEqual({
    width: 400,
    height: 300,
  });
});
```

### Bug 3: `parseJsonField` returns JSON strings without parsing

**File:** `src/utils/wardrobeUtils.ts`, line 175

**Problem:** `parseJsonField('{"foo":"bar"}')` returns the raw string `'{"foo":"bar"}'` instead of parsing it to `{foo: "bar"}`. The function was likely designed this way intentionally (treating strings as opaque values), but it's misleading given the function name.

**Fix:** This is NOT a bug — it's intentional behavior. The function receives Supabase JSONB fields that are already parsed by the client. String values in this context are literal strings, not JSON-encoded strings. **Do NOT change this function.**

However, update the test name in `src/utils/__tests__/wardrobeUtils.test.ts` to clarify the intent:
```typescript
it('returns string values as-is (Supabase JSONB strings are already parsed)', () => {
  const value = '{"foo":"bar"}';
  expect(parseJsonField(value)).toBe(value);
});
```

---

## Task B: Gate Remaining Console Statements

There are ~268 unguarded console statements across `src/` and `app/`. Wrap each one with `if (__DEV__)`.

### Pattern to follow
The existing codebase uses this exact pattern (established in Phase 2B):
```typescript
// BEFORE:
console.log('[Module] message', data);

// AFTER:
if (__DEV__) console.log('[Module] message', data);
```

### Rules
1. **Wrap ALL** `console.log()`, `console.warn()`, `console.info()`, and `console.debug()` calls with `if (__DEV__)`
2. **Do NOT wrap** `console.error()` — errors should always log in production for crash diagnostics
3. **Do NOT wrap** statements that are already inside an `if (__DEV__)` block
4. **Do NOT modify** any files inside `__tests__/` directories
5. **Do NOT modify** test files or `jest.setup.js`
6. **Preserve** multi-line console calls (some use template literals or multiple arguments)
7. For multi-statement console blocks, wrap the entire block:
```typescript
// BEFORE:
console.log('Step 1');
console.log('Step 2');

// AFTER:
if (__DEV__) {
  console.log('Step 1');
  console.log('Step 2');
}
```

### Top priority files (most unguarded statements)
1. `app/index.tsx` (20)
2. `src/contexts/AuthContext.tsx` (14 — some already gated, gate the rest)
3. `src/lib/ai-jobs/execution.ts` (11)
4. `src/hooks/wardrobe/useWardrobeItemJobs.ts` (10)
5. `app/headshot/[id].tsx` (9)
6. `app/bodyshot/[id].tsx` (9)
7. `src/hooks/outfits/useOutfitView.ts` (8)
8. All remaining files with unguarded console statements

---

## Task C: Delete Backup Files

Delete these 3 orphaned backup files:
```bash
rm netlify/functions/processes/outfit_render.js.backup
rm src/hooks/outfits/useOutfitGeneration.ts.backup
rm src/lib/utils/image-helpers.ts.backup
```

---

## Verification

After all changes:
```bash
npm test
```
All 148 tests must still pass (with updated expectations for Bug 1 and Bug 2 fixes).

## Constraints
- Do NOT add new dependencies
- Do NOT refactor any code beyond the specific bug fixes
- Do NOT change function signatures or public APIs
- Do NOT modify existing test files beyond the specific test updates described above
- Preserve all existing behavior except for the 2 bug fixes

## Output
Write a summary to `CODEX_TASK_REPORT_CLEANUP.md` listing:
1. Bug fixes applied (with before/after)
2. Console statement count: how many were gated, in how many files
3. Backup files deleted
4. Test results (all must pass)
