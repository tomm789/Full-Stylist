# Full Diagnosis Report - Image Generation & "Try It On" Issues
**Date:** 2026-01-20  
**Context:** Post-Netlify deployment issues after 2 weeks of development

## Executive Summary

After analyzing 30 commits from the last 24 hours and the codebase, I've identified **5 critical issues** and **3 potential issues** that are likely causing the "try it on" functionality and other image generation problems in the live environment.

---

## Critical Issues

### 1. **RLS Policy Gap: Wardrobe Items Access in "Try It On" Flow** ⚠️ CRITICAL

**Location:** `app/(tabs)/social.tsx:handleTryOnOutfit` → `netlify/functions/ai-job-runner.ts:processOutfitRender`

**Problem:**
When User A tries on User B's outfit:
1. A new outfit is created with User A as owner (line 662-669 in social.tsx)
2. Outfit items reference wardrobe_items owned by User B (line 654-658)
3. **Client-side issue**: When `getWardrobeItemsByIds()` is called (line 642), it uses the **user's session** (regular supabase client), not service role
4. If User A doesn't follow User B, or if items aren't public, the RLS policy `wardrobe_items_read_followers` will block access
5. **Migration 0034** (`wardrobe_items_read_in_owned_outfits`) should allow access IF the outfit is already created, BUT:
   - The outfit is created AFTER fetching wardrobe items (line 662)
   - So at the time of fetching, the outfit doesn't exist yet, and the policy won't apply
6. The code continues even if `wardrobeItems` is empty or partial (line 644-646), leading to incomplete outfit data being passed to the AI job

**Evidence:**
- `getWardrobeItemsByIds()` in `lib/wardrobe.ts:804-819` uses regular `supabase` client (user session)
- No error handling if wardrobe items can't be accessed (line 642-646 in social.tsx)
- Migration 0034 policy requires outfit to exist, but outfit is created after fetching items
- The AI job runner uses service role (bypasses RLS), so server-side processing works, but client-side preparation fails

**Fix Required:**
1. **Option A (Recommended)**: Create the outfit FIRST, then fetch wardrobe items. The RLS policy will then allow access.
2. **Option B**: Use a server-side RPC function to fetch wardrobe items for "try it on" that uses service role
3. **Option C**: Add explicit error handling and user feedback when wardrobe items can't be accessed
4. Ensure the order of operations: Create outfit → Fetch items (now policy applies) → Create AI job

---

### 2. **Netlify Function URL Resolution in Production** ⚠️ CRITICAL

**Location:** `lib/ai-jobs.ts:triggerAIJobExecution` (lines 488-500)

**Problem:**
The function determines the Netlify function URL based on environment:
```typescript
const isDev = process.env.NODE_ENV === 'development' || __DEV__;
let baseUrl = '';
if (isDev) {
  baseUrl = process.env.EXPO_PUBLIC_NETLIFY_DEV_URL || 'http://localhost:8888';
} else {
  baseUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || '';
}
```

**Issues:**
1. **`EXPO_PUBLIC_NETLIFY_URL` is NOT documented** in `docs/ENV.md` - it's likely missing in production
2. In production, if `EXPO_PUBLIC_NETLIFY_URL` is not set, `baseUrl` will be empty string
3. This results in a relative URL: `/.netlify/functions/ai-job-runner`
4. Relative URLs may not work correctly in React Native/Expo web builds, especially if the app is served from a different domain
5. The fetch might fail silently or timeout without proper error handling

**Evidence from git diff:**
- Recent changes added extensive logging (lines 499-500) suggesting URL issues were suspected
- Error handling was added but may not catch all cases

**Fix Required:**
1. **Add `EXPO_PUBLIC_NETLIFY_URL` to production environment** (Netlify dashboard → Site settings → Environment variables)
2. **Update `docs/ENV.md`** to document this variable
3. Add fallback to detect production URL from current window location (for web builds)
4. Add explicit error logging when URL resolution fails
5. Consider using `window.location.origin` as fallback for web builds

---

### 3. **Image Download Failure in AI Job Runner** ⚠️ CRITICAL

**Location:** `netlify/functions/ai-job-runner.ts:downloadImageFromStorage` (lines 202-235)

**Problem:**
The function downloads images using public URLs:
```typescript
const { data: urlData } = supabase.storage
  .from(bucket)
  .getPublicUrl(image.storage_key);

const publicUrl = urlData.publicUrl;
const response = await fetch(publicUrl);
```

**Issues:**
1. **Public URL generation may fail** if storage bucket isn't configured for public access
2. **CORS issues** in production if storage bucket CORS isn't configured for Netlify function origin
3. **No retry logic** - if fetch fails, the entire job fails
4. **No validation** that the image actually exists before trying to download

**Evidence:**
- Recent changes added extensive error logging (lines 1131-1213) suggesting image download issues
- The code logs "Successfully loaded X images out of Y items" (line 1050) which suggests partial failures

**Fix Required:**
1. Add retry logic with exponential backoff for image downloads
2. Use service role to download directly from storage instead of public URLs
3. Add validation that images exist before processing
4. Better error messages when images can't be downloaded

---

### 4. **Missing Error Propagation in "Try It On" Flow** ⚠️ HIGH

**Location:** `app/(tabs)/social.tsx:handleTryOnOutfit` (lines 610-772)

**Problem:**
Multiple points where errors are caught but not properly handled:

1. **Line 642-646**: If `getWardrobeItemsByIds` fails or returns empty, code continues
2. **Line 703-707**: Trigger error is logged but execution continues
3. **Line 715-734**: Polling timeout is handled but user might not see the outfit if it completes later
4. **Line 742**: `getOutfit` is called after job succeeds, but if it fails, navigation still happens

**Evidence:**
- Recent debug logging was added (lines 739, 744, 750) suggesting silent failures
- The code has multiple try-catch blocks that might swallow errors

**Fix Required:**
1. Add explicit checks after each critical operation
2. Show user-friendly error messages for each failure point
3. Ensure errors are logged to a monitoring service
4. Add validation that all required data is present before proceeding

---

### 5. **Category ID Null Handling Inconsistency** ⚠️ MEDIUM

**Location:** Multiple files, especially `app/(tabs)/social.tsx` and `netlify/functions/ai-job-runner.ts`

**Problem:**
Recent migration `0035_make_category_optional.sql` made `category_id` nullable, but:
1. Code in `social.tsx:684` handles null category_id correctly
2. But in `ai-job-runner.ts:673`, the code might fail if category is empty string vs null
3. The `selected` array passed to AI job (line 692) includes category names, which might be empty strings

**Evidence:**
- Git diff shows recent changes to handle null category_id (line 684 in social.tsx)
- Migration 0035 was created to make category optional

**Fix Required:**
1. Ensure consistent handling of null vs empty string for category_id
2. Validate that category names are valid before passing to AI
3. Add fallback logic if category is missing

---

## Potential Issues (Need Verification)

### 6. **Gemini API Response Parsing** ⚠️ MEDIUM

**Location:** `netlify/functions/ai-job-runner.ts:callGeminiAPI` (lines 290-449)

**Recent Changes:**
- Extensive error handling was added (lines 344-411)
- Multiple checks for different response structures
- Logging for debugging

**Concern:**
- The code tries multiple field names (`inline_data` vs `inlineData`)
- If Gemini API response structure changes, this might fail
- The extensive error handling suggests this was a problem area

**Recommendation:**
- Monitor Gemini API response structure
- Add unit tests for response parsing
- Consider using a more robust parsing library

---

### 7. **Outfit Cover Image Update Race Condition** ⚠️ MEDIUM

**Location:** `netlify/functions/ai-job-runner.ts:processOutfitRender` (lines 1177-1197)

**Problem:**
After generating image, the code:
1. Uploads image (line 1149)
2. Creates outfit_renders record (line 1157)
3. Updates outfit cover_image_id (line 1179)

**Potential Issue:**
- If the client polls and gets outfit data between steps 2 and 3, cover_image_id might not be set yet
- The client code in `social.tsx:742` calls `getOutfit` after job succeeds, but there might be a race condition

**Evidence:**
- Recent logging was added (lines 1186, 1195) suggesting this was investigated
- The code checks if `cover_image_id` was set (line 1194)

**Recommendation:**
- Ensure atomic update of cover_image_id
- Add retry logic in client if cover_image_id is missing
- Consider using database transaction

---

### 8. **Polling Timeout Too Short for Production** ⚠️ LOW

**Location:** `app/(tabs)/social.tsx:handleTryOnOutfit` (line 715)

**Problem:**
- Polling uses 120 attempts with 2000ms interval = ~4 minutes max
- In production, with network latency and server load, outfit generation might take longer
- The code does a final check (line 721), but if job is still running, user is told to check later

**Recommendation:**
- Increase timeout for production
- Consider using websockets or server-sent events for real-time updates
- Add background job status checking

---

## Files Requiring Immediate Attention

1. **`app/(tabs)/social.tsx`** - "Try it on" flow error handling
2. **`netlify/functions/ai-job-runner.ts`** - Image download and processing
3. **`lib/ai-jobs.ts`** - Netlify function URL resolution
4. **`lib/wardrobe.ts`** - Wardrobe items access with RLS

---

## Recommended Fix Priority

1. **P0 (Critical - Fix Immediately):**
   - Issue #1: RLS policy for wardrobe items in "try it on"
   - Issue #2: Netlify function URL resolution
   - Issue #3: Image download failure handling

2. **P1 (High - Fix Soon):**
   - Issue #4: Error propagation in "try it on" flow
   - Issue #7: Cover image update race condition

3. **P2 (Medium - Fix When Possible):**
   - Issue #5: Category ID null handling
   - Issue #6: Gemini API response parsing robustness

4. **P3 (Low - Consider for Future):**
   - Issue #8: Polling timeout adjustments

---

## Next Steps

1. Create reference backup (✅ Done)
2. Fix P0 issues first
3. Add comprehensive error logging
4. Test "try it on" flow end-to-end
5. Monitor production logs for remaining issues
