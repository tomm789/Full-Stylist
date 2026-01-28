# Debug and Optimization Plan

## Executive Summary

This document provides a comprehensive analysis of the Full Stylist application's current state, identified issues, and a detailed plan for debugging, optimization, and implementing missing features. The analysis is based on thorough examination of the database schema, codebase structure, and implementation patterns.

## Current Issues Identified

### Critical Issues

#### 1. Images Not Displaying
**Problem**: Images are saved to the database but not displaying in the UI.

**Root Causes**:
- **Storage Bucket Configuration**: The `media` bucket may not be properly configured in Supabase
- **RLS Policies**: Image RLS policies allow public read, but there may be issues with:
  - Storage bucket policies conflicting with table RLS
  - Missing or incorrect storage policies
- **URL Generation**: While `getPublicUrl` is used correctly, the URLs may be invalid if:
  - Storage bucket doesn't exist or isn't public
  - File paths are incorrect
  - CORS issues on storage bucket

**Evidence**:
- Code correctly uses `supabase.storage.from('media').getPublicUrl(storage_key)`
- `images` table RLS has public read policy
- Storage migration exists but may not have been applied
- No error handling/logging for failed image loads in UI components

**Impact**: HIGH - Core functionality broken, users cannot see their wardrobe items or outfits.

#### 2. No UI Feedback After Saving Items/Outfits
**Problem**: After saving a wardrobe item or outfit, nothing appears to happen even though data is saved.

**Root Causes**:
- **No Navigation Refresh**: Screens navigate back (`router.back()`) but don't refresh data
- **No Focus Listeners**: List screens don't listen for focus events to reload when returning from add/edit screens
- **No Polling/Subscriptions**: No real-time updates or polling for new data

**Evidence**:
- `app/wardrobe/add.tsx` shows success alert then navigates back
- `app/(tabs)/wardrobe.tsx` only loads data on mount or manual refresh
- No `useFocusEffect` from Expo Router to reload on screen focus
- Similar pattern in outfit editor and lookbooks screens

**Impact**: HIGH - Poor user experience, users think saves failed.

#### 3. AI Jobs Not Generating Images
**Problem**: AI jobs are created but no images are generated or saved.

**Root Causes**:
- **Netlify Function Not Configured**: Environment variables may be missing:
  - `GEMINI_API_KEY` not set
  - `SUPABASE_SERVICE_ROLE_KEY` not configured
  - `SUPABASE_URL` incorrect
- **Function Not Triggered**: Client creates jobs but function may not be processing them:
  - No automated job runner (requires manual trigger or webhook)
  - Function endpoint may be unreachable
- **Error Handling**: No UI feedback when AI jobs fail
- **Job Polling Not Implemented**: Client doesn't poll for job status after creation

**Evidence**:
- `lib/ai-jobs.ts` creates jobs and calls `triggerAIJobExecution` which calls Netlify function
- `netlify/functions/ai-job-runner.ts` processes jobs but requires manual POST request
- No polling mechanism after job creation in `app/wardrobe/add.tsx`
- No status checking UI for in-progress jobs

**Impact**: CRITICAL - Core AI features non-functional.

### Moderate Issues

#### 4. Missing Database Seeding
**Problem**: Taxonomy data (categories, subcategories) may not be seeded.

**Evidence**:
- `supabase/seed/0001_taxonomy.sql` exists
- No clear documentation on whether it's been run
- Wardrobe screen may show empty categories

**Impact**: MEDIUM - App may not function without category data.

#### 5. Incomplete Error Handling
**Problem**: Many operations lack proper error handling and user feedback.

**Evidence**:
- Image loading failures show placeholder but no error message
- Database errors may not be logged properly
- Network errors not handled gracefully

**Impact**: MEDIUM - Poor debugging experience, users don't know what's wrong.

## Database Analysis

### Schema Completeness

The database schema (`0001_init.sql`) is comprehensive and well-designed:
- ✅ All core tables present (users, wardrobes, items, outfits, lookbooks, etc.)
- ✅ Proper foreign key relationships
- ✅ Indexes on frequently queried columns
- ✅ JSONB fields for flexible data (color_palette, material, size, etc.)
- ✅ RLS policies defined in `0002_rls.sql`
- ✅ Storage bucket setup in `0003_storage.sql`
- ✅ Images RLS in `0004_images_rls.sql`

### Potential Schema Issues

1. **Missing Migration Tracking**: No table to track which migrations have been applied
2. **No Database Backups**: No evidence of backup strategy
3. **Index Optimization**: Some queries may benefit from composite indexes:
   - `wardrobe_items(user_id, category_id, archived_at)` 
   - `outfits(user_id, created_at, archived_at)`

### Data Integrity Concerns

1. **Orphaned Records**: No cascade rules for some relationships (e.g., `images` → `wardrobe_item_images`)
2. **Soft Deletes**: `archived_at` used but queries may not consistently filter it

## Code Quality Analysis

### Strengths

1. **Type Safety**: Good use of TypeScript interfaces
2. **Separation of Concerns**: Clear lib/ structure for business logic
3. **Consistent Patterns**: Similar patterns across wardrobe/outfit/item management
4. **RLS Security**: Database-level security implemented

### Weaknesses

1. **No Error Boundaries**: React error boundaries missing
2. **Inconsistent Loading States**: Some screens show loading, others don't
3. **No Logging**: Console.log used but no structured logging
4. **Hardcoded Values**: Some magic strings/numbers not extracted to constants
5. **No Unit Tests**: No test files found
6. **Code Duplication**: Image URL generation duplicated across many files

## Optimization Opportunities

### Performance

1. **Image Loading**:
   - Images loaded individually in `useEffect` for each card → N+1 problem
   - Should batch load images or use Supabase query with joins
   - Consider lazy loading with Intersection Observer

2. **Query Optimization**:
   - `getWardrobeItemImages` called separately for each item in lists
   - Should use single query with joins to fetch all images at once
   - Example: `wardrobe_items(*) -> wardrobe_item_images(*) -> images(*)`

3. **Caching**:
   - No caching layer for frequently accessed data (categories, taxonomy)
   - Consider React Query or SWR for server state caching

4. **Bundle Size**:
   - Expo Image used but may include unnecessary codecs
   - Consider tree-shaking unused dependencies

### Code Organization

1. **Image Utilities**: Create `lib/image-utils.ts` to centralize:
   - `getPublicImageUrl(image)` helper
   - Image upload utilities
   - Image validation

2. **Refresh Patterns**: Create hook `useScreenRefresh()` for consistent refresh on focus:
   ```typescript
   function useScreenRefresh(refetch: () => Promise<void>) {
     useFocusEffect(useCallback(() => { refetch(); }, []));
   }
   ```

3. **Error Handling**: Create error boundary component and error toast system

## Implementation Plan

### Phase 1: Critical Fixes (Priority: URGENT)

#### Task 1.1: Fix Image Display
**Estimated Time**: 4-6 hours

**Steps**:
1. Verify storage bucket exists and is configured:
   ```sql
   -- Check in Supabase dashboard or run:
   SELECT * FROM storage.buckets WHERE id = 'media';
   ```
2. Verify storage policies are applied:
   ```sql
   -- Check storage policies
   SELECT * FROM storage.policies WHERE bucket_id = 'media';
   ```
3. Test image upload and URL generation:
   - Upload test image
   - Verify `images` row created
   - Verify `storage_key` is correct format: `{userId}/{timestamp}.{ext}`
   - Test `getPublicUrl` returns accessible URL
4. Add error logging to image loading:
   ```typescript
   // In wardrobe.tsx ItemCard
   useEffect(() => {
     getItemImageUrl(item.id)
       .then(setImageUrl)
       .catch(err => {
         console.error('Image load error:', err);
         // Show error placeholder
       });
   }, [item.id]);
   ```
5. Verify CORS on storage bucket allows requests from app domain

**Files to Modify**:
- `app/(tabs)/wardrobe.tsx` - Add error handling
- `lib/wardrobe.ts` - Add image URL validation
- Check storage bucket configuration in Supabase dashboard

**Success Criteria**:
- Images display correctly in wardrobe list
- Error messages shown if images fail to load
- Console logs show image URLs being generated correctly

#### Task 1.2: Implement Screen Refresh on Focus
**Estimated Time**: 3-4 hours

**Steps**:
1. Create `hooks/useScreenRefresh.ts`:
   ```typescript
   import { useCallback } from 'react';
   import { useFocusEffect } from 'expo-router';
   
   export function useScreenRefresh(refetch: () => Promise<void>) {
     useFocusEffect(
       useCallback(() => {
         refetch();
       }, [refetch])
     );
   }
   ```

2. Update `app/(tabs)/wardrobe.tsx`:
   ```typescript
   // Add after existing hooks
   useScreenRefresh(loadItems);
   ```

3. Update `app/(tabs)/lookbooks.tsx`:
   ```typescript
   useScreenRefresh(loadData);
   ```

4. Update success handlers in `app/wardrobe/add.tsx` and `app/outfits/[id].tsx`:
   - Remove `router.back()` from success alert
   - Navigate first, then show alert
   - Or use `router.push()` with refresh

**Files to Create**:
- `hooks/useScreenRefresh.ts` (create `hooks/` directory)

**Files to Modify**:
- `app/(tabs)/wardrobe.tsx`
- `app/(tabs)/lookbooks.tsx`
- `app/wardrobe/add.tsx`
- `app/outfits/[id].tsx`

**Success Criteria**:
- After saving item/outfit, list screen refreshes automatically
- New items appear immediately without manual refresh

#### Task 1.3: Fix AI Job Processing
**Estimated Time**: 6-8 hours

**Steps**:
1. Verify Netlify environment variables:
   - Check Netlify dashboard → Site settings → Environment variables
   - Required: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
   - Verify `EXPO_PUBLIC_SUPABASE_URL` matches

2. Test Netlify function locally:
   ```bash
   npm run dev  # Starts Netlify Dev
   # Test endpoint: http://localhost:8888/.netlify/functions/ai-job-runner
   ```

3. Add job polling UI in `app/wardrobe/add.tsx`:
   ```typescript
   // After creating AI job
   const pollJobStatus = async (jobId: string) => {
     const maxAttempts = 30;
     const interval = 2000;
     
     for (let i = 0; i < maxAttempts; i++) {
       const { data: job } = await getAIJob(jobId);
       
       if (job?.status === 'succeeded') {
         // Apply results
         await applyAutoTagResults(itemId, job.result);
         return;
       }
       
       if (job?.status === 'failed') {
         console.error('AI job failed:', job.error);
         return;
       }
       
       await new Promise(r => setTimeout(r, interval));
     }
   };
   ```

4. Add job status indicator in UI (optional but recommended):
   - Show "Processing..." state after save
   - Display when AI tagging completes

5. Verify function is accessible:
   - Check function logs in Netlify dashboard
   - Add error logging in function
   - Test with Postman/curl

**Files to Modify**:
- `app/wardrobe/add.tsx` - Add job polling
- `lib/ai-jobs.ts` - Enhance polling utility
- `netlify/functions/ai-job-runner.ts` - Add better error logging

**Files to Check**:
- `.env` or `.env.local` (local dev)
- Netlify environment variables (production)

**Success Criteria**:
- AI jobs are created successfully
- Jobs are processed by Netlify function
- Results are applied to wardrobe items
- User sees feedback during processing

### Phase 2: Database Verification (Priority: HIGH)

#### Task 2.1: Verify Migrations Applied
**Estimated Time**: 1-2 hours

**Steps**:
1. Connect to Supabase database
2. Verify all migrations have been applied:
   ```sql
   -- Check tables exist
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY tablename;
   
   -- Expected: users, wardrobe_items, outfits, images, etc.
   ```

3. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   -- All should have rowsecurity = true
   ```

4. Check storage bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'media';
   ```

**Files to Check**:
- Supabase dashboard → Database → Tables
- Supabase dashboard → Storage → Buckets

**Success Criteria**:
- All expected tables exist
- RLS enabled on all tables
- Storage bucket exists and is public

#### Task 2.2: Seed Taxonomy Data
**Estimated Time**: 1 hour

**Steps**:
1. Check if taxonomy is seeded:
   ```sql
   SELECT COUNT(*) FROM wardrobe_categories;
   SELECT COUNT(*) FROM wardrobe_subcategories;
   ```

2. If empty, run seed file:
   ```bash
   # Connect to Supabase and run:
   psql $DATABASE_URL -f supabase/seed/0001_taxonomy.sql
   # Or use Supabase dashboard SQL editor
   ```

3. Verify seed data:
   ```sql
   SELECT * FROM wardrobe_categories ORDER BY sort_order;
   ```

**Files to Check**:
- `supabase/seed/0001_taxonomy.sql`
- Supabase dashboard

**Success Criteria**:
- Categories and subcategories exist in database
- Wardrobe screen shows category pills

### Phase 3: Code Optimization (Priority: MEDIUM)

#### Task 3.1: Optimize Image Loading
**Estimated Time**: 4-6 hours

**Steps**:
1. Create `lib/image-utils.ts`:
   ```typescript
   export function getPublicImageUrl(image: { storage_bucket?: string; storage_key: string }): string | null {
     if (!image?.storage_key) return null;
     const { data } = supabase.storage
       .from(image.storage_bucket || 'media')
       .getPublicUrl(image.storage_key);
     return data.publicUrl;
   }
   
   export async function getWardrobeItemsWithImages(wardrobeId: string) {
     // Single query with joins
     const { data } = await supabase
       .from('wardrobe_items')
       .select(`
         *,
         wardrobe_item_images(
           sort_order,
           type,
           images(*)
         )
       `)
       .eq('wardrobe_id', wardrobeId)
       .is('archived_at', null)
       .order('created_at', { ascending: false });
     
     return data;
   }
   ```

2. Update `app/(tabs)/wardrobe.tsx` to use batch loading:
   - Replace individual `getItemImageUrl` calls
   - Use new query with images included
   - Cache image URLs in component state

**Files to Create**:
- `lib/image-utils.ts`

**Files to Modify**:
- `lib/wardrobe.ts` - Add batch image query
- `app/(tabs)/wardrobe.tsx` - Use batch loading
- `app/(tabs)/lookbooks.tsx` - Use batch loading

**Success Criteria**:
- Single query loads items with images
- Faster list rendering
- Reduced database queries

#### Task 3.2: Centralize Image URL Generation
**Estimated Time**: 2-3 hours

**Steps**:
1. Extract `getPublicImageUrl` to `lib/image-utils.ts`
2. Replace all instances of inline `getPublicUrl` calls:
   - `app/(tabs)/wardrobe.tsx`
   - `app/(tabs)/lookbooks.tsx`
   - `app/outfits/[id].tsx`
   - `lib/images.ts`
   - `app/components/FindSimilarModal.tsx`
   - etc.

3. Add error handling and validation to utility function

**Files to Modify**:
- All files using `getPublicUrl` (use search to find all)

**Success Criteria**:
- Single source of truth for image URLs
- Consistent error handling
- Easier to debug image issues

#### Task 3.3: Add Error Boundaries
**Estimated Time**: 3-4 hours

**Steps**:
1. Create `app/components/ErrorBoundary.tsx`:
   ```typescript
   // Standard React error boundary
   ```

2. Wrap main screens in error boundaries
3. Add error logging service (optional):
   - Sentry
   - LogRocket
   - Or simple console + database logging

**Files to Create**:
- `app/components/ErrorBoundary.tsx`

**Files to Modify**:
- `app/_layout.tsx` - Wrap app in error boundary
- Key screens - Add error boundaries

**Success Criteria**:
- App doesn't crash on errors
- Errors are logged and visible

### Phase 4: Missing Features (Priority: LOW - Future Work)

#### Task 4.1: Implement Outfit Suggest
**Status**: Not implemented in `ai-job-runner.ts`

**Estimated Time**: 8-12 hours

**Steps**:
1. Implement `processOutfitSuggest` in `netlify/functions/ai-job-runner.ts`
2. Create UI for outfit suggestions in `app/outfits/[id].tsx`
3. Add job polling for suggestion results

**Files to Modify**:
- `netlify/functions/ai-job-runner.ts`
- `app/outfits/[id].tsx`

#### Task 4.2: Implement Reference Match
**Status**: Not implemented in `ai-job-runner.ts`

**Estimated Time**: 8-12 hours

**Similar to Task 4.1**

#### Task 4.3: Outfit Render Status UI
**Status**: Partial - job created but no status checking

**Estimated Time**: 4-6 hours

**Steps**:
1. Add render status to outfit editor
2. Poll render job status
3. Show render progress/status
4. Display rendered image when complete

**Files to Modify**:
- `app/outfits/[id].tsx`
- `lib/outfits.ts` - Add render status queries

## Testing Strategy

### Manual Testing Checklist

#### Image Display
- [ ] Upload wardrobe item with image
- [ ] Verify image appears in wardrobe list
- [ ] Verify image appears in item detail screen
- [ ] Test with different image formats (JPEG, PNG)
- [ ] Test with large images
- [ ] Verify image URLs are accessible (open in browser)

#### Save & Refresh
- [ ] Save new wardrobe item → verify appears in list
- [ ] Save edited wardrobe item → verify changes appear
- [ ] Save new outfit → verify appears in lookbooks
- [ ] Navigate back/forth between screens → verify data persists

#### AI Jobs
- [ ] Create wardrobe item → verify auto_tag job created
- [ ] Verify job status changes to 'succeeded'
- [ ] Verify attributes are applied to item
- [ ] Test product_shot job
- [ ] Test outfit_render job

### Automated Testing (Future)

1. Unit tests for lib functions
2. Integration tests for API calls
3. E2E tests for critical flows (add item, create outfit)

## Redundant Code to Archive

### Archive Location
Create `archive/redundant-code/` directory

### Files to Archive

1. **Old UI Files** (already in `archive/old-ui/`):
   - Keep as reference

2. **Unused Netlify Functions**:
   - `netlify/functions/auto-tag-item.js` - Replaced by `ai-job-runner.ts`
   - `netlify/functions/remove-background.js` - May not be used
   - `netlify/functions/generate.js` - May not be used
   - `netlify/functions/style-advice.js` - May not be used
   - `netlify/functions/log-session.js` - Check if used

   **Action**: Review each function, verify not used, move to archive

3. **Redundant Documentation**:
   - `DATABASE_SCHEMA.md` - Original schema, may have diverged from actual DB
   - Keep as reference but note it may be outdated

**Note**: Do not delete anything. Move to `archive/` with a note about why it's archived.

## Configuration Checklist

### Required Environment Variables

#### Supabase (Client)
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

#### Netlify Functions
- `SUPABASE_URL` - Same as above
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `GEMINI_API_KEY` - Google Gemini API key

### Required Supabase Setup

1. ✅ Database migrations applied
2. ✅ RLS policies enabled
3. ✅ Storage bucket `media` created and configured
4. ⚠️ Taxonomy seed data applied (verify)
5. ⚠️ Storage bucket policies configured (verify)

### Required Netlify Setup

1. ⚠️ Environment variables set (verify)
2. ⚠️ Functions deployed (verify `ai-job-runner` is accessible)
3. ⚠️ CORS configured if needed

## Performance Metrics to Monitor

1. **Image Load Time**: Average time to load images in list
2. **Database Query Time**: Time for wardrobe/outfit queries
3. **AI Job Processing Time**: Time for auto_tag, product_shot, outfit_render
4. **Screen Navigation**: Time for screen transitions

## Risk Assessment

### High Risk
- **Image Storage**: If bucket is misconfigured, entire app breaks
- **RLS Policies**: Too restrictive = users can't see own data; too permissive = security issue

### Medium Risk
- **AI Jobs**: Failures may be silent, users don't know features aren't working
- **Data Loss**: No backup strategy evident

### Low Risk
- **Performance**: Current scale likely fine, but will degrade with growth
- **Code Quality**: Technical debt manageable but should be addressed

## Success Metrics

### Phase 1 Success
- ✅ All images display correctly
- ✅ Items/outfits appear immediately after save
- ✅ AI jobs process successfully

### Phase 2 Success
- ✅ Database verified and seeded
- ✅ All migrations applied

### Phase 3 Success
- ✅ Image loading optimized (50% reduction in queries)
- ✅ Error boundaries prevent crashes
- ✅ Centralized utilities reduce code duplication

## Timeline Estimate

- **Phase 1**: 13-18 hours (Critical fixes)
- **Phase 2**: 2-3 hours (Database verification)
- **Phase 3**: 9-13 hours (Optimization)
- **Phase 4**: 20-30 hours (Future features)

**Total**: ~44-64 hours for Phases 1-3 (immediate needs)

## Notes

- This plan assumes Supabase and Netlify are already set up
- Some tasks may require Supabase dashboard access
- AI job fixes require Netlify function access and API keys
- Test thoroughly after each phase before proceeding
- Keep backups before making database changes
