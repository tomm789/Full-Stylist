# Reference Match Feature - Implementation Notes

**Date**: January 20, 2026  
**Status**: Archived - Needs proper implementation

## What Was Attempted

Implementation of a feature to upload reference/inspiration images and match items from the user's wardrobe using AI.

### Files Created
- `app/outfits/from-reference.tsx` - Frontend screen for uploading reference and viewing matches
- `docs/REFERENCE_MATCH_FEATURE.md` - Feature documentation
- Backend implementation in `netlify/functions/ai-job-runner.ts` (reverted)
- Helper function in `lib/ai-jobs.ts` (reverted)

### UI Access Point
- Button added to wardrobe screen (removed)
- Camera icon (📷) next to filter button

## Issues Encountered

### 1. Database Schema Relationships
**Problem**: Query tried to join `wardrobe_items` with `categories` table using nested select:
```typescript
.select(`
  id,
  title,
  category_id,
  categories (name)  // This failed
`)
```

**Error**: `"Could not find a relationship between 'wardrobe_items' and 'categories' in the schema cache"`

**Solution Needed**: 
- Configure foreign key relationship in Supabase between `wardrobe_items.category_id` and `categories.id`
- OR query categories separately and join in application code

### 2. Archived Items Filter
**Problem**: Used `.eq('archived_at', null)` which doesn't work in SQL

**Fix**: Use `.is('archived_at', null)` instead

### 3. Platform-Specific Alerts
**Problem**: `Alert.alert()` doesn't work properly on web

**Fix**: Check `Platform.OS` and use browser `alert()` for web, `Alert.alert()` for native

### 4. Default Wardrobe Query
**Problem**: Some users don't have a wardrobe marked as default

**Fix**: Fallback to any wardrobe if no default exists:
```typescript
let { data: wardrobeData } = await supabase
  .from('wardrobes')
  .select('id')
  .eq('owner_user_id', user_id)
  .eq('is_default', true)
  .single();

if (!wardrobeData) {
  const { data: anyWardrobe } = await supabase
    .from('wardrobes')
    .select('id')
    .eq('owner_user_id', user_id)
    .limit(1)
    .single();
  wardrobeData = anyWardrobe;
}
```

## What Needs to Be Done

### Database Setup
1. **Configure foreign key relationship** in Supabase:
   - Table: `wardrobe_items`
   - Column: `category_id`
   - References: `categories.id`
   - Enable in Supabase API settings

2. **Verify table structure**:
   - Ensure `categories` table exists with `id` and `name` columns
   - Ensure `wardrobe_items` has `category_id` column with proper type

### Backend Implementation
1. Fix the wardrobe items query to properly join with categories
2. Handle cases where items don't have images
3. Optimize image loading (currently loads all images which is slow)
4. Add better error handling and logging
5. Consider caching category data to avoid repeated queries

### Frontend Implementation
1. Use platform-specific alert methods
2. Add loading states and progress indicators
3. Handle empty results gracefully
4. Add ability to refresh/retry failed analyses
5. Show meaningful error messages to users

### Testing
1. Test with wardrobes that have/don't have default flag
2. Test with items that have/don't have images
3. Test with various reference image types
4. Test on both web and native platforms
5. Test error cases (no items, no categories, API failures)

## Recommended Approach for Re-implementation

### Phase 1: Database & Schema
1. Fix Supabase relationships
2. Verify all tables and columns exist
3. Test queries in Supabase SQL editor

### Phase 2: Backend
1. Implement simple version without AI first (just return all items grouped by category)
2. Add AI matching once basic flow works
3. Add comprehensive logging
4. Test with Postman/curl before integrating frontend

### Phase 3: Frontend
1. Build UI with mock data first
2. Connect to backend
3. Add error handling
4. Polish UX

### Phase 4: Optimization
1. Add image caching
2. Optimize AI prompts
3. Add result caching
4. Performance testing

## Estimated Effort
- Database setup: 1-2 hours
- Backend implementation: 4-6 hours
- Frontend implementation: 4-6 hours
- Testing & polish: 2-4 hours
- **Total**: 11-18 hours

## Alternative Approaches

### Option 1: Simplified Version
Instead of AI matching, just:
1. Upload reference image
2. Show all wardrobe items grouped by category
3. Let user manually select items
4. Save as outfit

### Option 2: External Service
Use a dedicated fashion AI service instead of Gemini:
- May have better outfit understanding
- Could be more expensive
- Less control over prompts

### Option 3: Defer Feature
Focus on core functionality first:
- Manual outfit creation works fine
- AI suggestions can be added later
- Reference matching is a "nice to have" not "must have"

## Resources
- Supabase Foreign Keys: https://supabase.com/docs/guides/database/foreign-keys
- Gemini Vision API: https://ai.google.dev/gemini-api/docs/vision
- Related issue in wardrobe.tsx with RLS and image loading (may have insights)
