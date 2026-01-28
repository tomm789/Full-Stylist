# Legacy Function Integration Summary

## Overview
This document summarizes the integration of legacy headshot/body shot generation functions into the new system.

## What Was Implemented

### 1. New Job Type: `body_shot_generate`
**Purpose**: Create a studio model by combining a generated professional headshot with a user's body photo.

**Location**: 
- Database migration: `supabase/migrations/0013_add_body_shot_generate.sql`
- Backend processor: `netlify/functions/ai-job-runner.ts` (processBodyShotGenerate)
- Client trigger: `lib/ai-jobs.ts` (triggerBodyShotGenerate)

### 2. Enhanced Headshot Generation
**New Features**:
- Added hair_style and makeup_style customization parameters
- Updated prompt to maintain exact framing and include customization
- Still uses `gemini-2.5-flash-image` for fast generation

**Changes**:
- `triggerHeadshotGenerate()` now accepts optional `hairStyle` and `makeupStyle` parameters
- Prompt includes: "CLOTHING: Wearing a simple white ribbed singlet (wife beater)"
- Prompt includes: "MODIFICATIONS: ${hair_style}, ${makeup_style}"

### 3. Studio Model Generation Workflow
**Legacy Workflow Restored**:
```
Step 1: Selfie → Professional Headshot (with customization)
Step 2: Headshot + Body Photo → Studio Model (composed image)
Step 3: Studio Model + Wardrobe Items → Outfit Render
```

**Technical Details**:
- Uses `gemini-3-pro-image-preview` for better quality body composition
- Implements "8-heads-tall" rule for proper proportions
- Prevents bobblehead effect with negative constraints
- Seamlessly blends lighting and skin tones

### 4. Profile Screen Updates
**New Flow**:
1. User uploads selfie → `headshot_generate` job created
2. System generates professional headshot (20-30 seconds)
3. User uploads body photo (validation: requires headshot first)
4. System generates studio model by composing headshot onto body (30-40 seconds)
5. Result stored as `body_shot_image_id` in user_settings

**Validation Added**:
- Cannot upload body photo without headshot
- Shows helpful error message: "Please generate your professional headshot first"

### 5. Debug Instrumentation
**Hypothesis-Based Logging**:

**Hypothesis A**: Selfie/body photo upload and image record creation works correctly
- Logs at: image upload, record creation, settings update

**Hypothesis B**: Headshot generation Gemini API call succeeds
- Logs at: before/after API call, prompt details, result validation

**Hypothesis C**: Headshot storage upload and settings update works
- Logs at: upload completion, settings update

**Hypothesis D**: Body shot job creation and user settings fetch works
- Logs at: job creation, settings query, headshot_image_id validation

**Hypothesis E**: Image downloads for body shot generation work
- Logs at: headshot download, body photo download, size validation

**Hypothesis F**: Studio model Gemini API call succeeds
- Logs at: before/after API call, result validation

**Hypothesis G**: Studio model storage upload and settings update works
- Logs at: upload completion, settings update

**Hypothesis H**: Body shot job creation and execution trigger works
- Logs at: job creation, execution trigger

**Hypothesis I**: Body shot job polling and completion works
- Logs at: poll result, status check, error handling

## Files Modified

### Backend
1. **supabase/migrations/0013_add_body_shot_generate.sql** (NEW)
   - Adds `body_shot_generate` to job_type constraint

2. **netlify/functions/ai-job-runner.ts**
   - Added `processBodyShotGenerate()` function
   - Enhanced `processHeadshotGenerate()` with customization
   - Added case handler for `body_shot_generate`
   - Added comprehensive debug logging

### Library
3. **lib/ai-jobs.ts**
   - Updated AIJob type definition
   - Enhanced `triggerHeadshotGenerate()` with optional params
   - Added `triggerBodyShotGenerate()` function

### Frontend
4. **app/(tabs)/profile.tsx**
   - Updated import to include `triggerBodyShotGenerate`
   - Modified `handleUploadBodyPhoto()` to trigger studio model generation
   - Added validation to require headshot before body photo
   - Updated polling timeout to 40 attempts for studio model (longer generation time)

### Documentation
5. **docs/AI_JOBS.md**
   - Documented `headshot_generate` job type
   - Documented `body_shot_generate` job type
   - Renumbered existing job types

6. **LEGACY_INTEGRATION_SUMMARY.md** (NEW)
   - This file

## Key Differences from Legacy

### Similarities
✅ Two-step process: Headshot generation → Studio model creation
✅ Hair/makeup customization support
✅ 8-heads-tall proportional enforcement
✅ Seamless head-to-body composition
✅ White ribbed singlet + grey boxer shorts outfit

### Improvements
🎯 Server-side job processing (more reliable)
🎯 Job status tracking and polling
🎯 Proper error handling and user feedback
🎯 Image storage in Supabase (not Base64 in localStorage)
🎯 Database-backed settings persistence
🎯 Validation to ensure proper workflow order

### Changes
⚠️ Uses newer Gemini models (2.5-flash, 3-pro-image-preview)
⚠️ Asynchronous job processing instead of synchronous
⚠️ Mobile-first UI (React Native) instead of web-only

## Testing Checklist

### Prerequisites
- [ ] Run database migration: `supabase migration up`
- [ ] Restart Netlify Functions (if running locally)
- [ ] Clear any existing headshot/body_shot_image_id in user_settings

### Test Scenarios

#### 1. Headshot Generation (Basic)
- [ ] Upload selfie in Profile screen
- [ ] Verify "Generating professional headshot" alert shows
- [ ] Wait 20-30 seconds for generation
- [ ] Verify "Headshot generated successfully!" alert
- [ ] Verify headshot image displays in profile

#### 2. Headshot Generation (With Customization)
- [ ] Add hair/makeup input fields to profile UI (future enhancement)
- [ ] Test with custom hair styles
- [ ] Test with custom makeup styles

#### 3. Body Shot Generation (Studio Model)
- [ ] Try uploading body photo WITHOUT headshot first
- [ ] Verify error message: "Please generate your professional headshot first"
- [ ] Generate headshot first
- [ ] Upload body photo
- [ ] Verify "Generating studio model" alert shows
- [ ] Wait 30-40 seconds for generation
- [ ] Verify "Studio model generated successfully!" alert
- [ ] Verify studio model image displays in profile

#### 4. Outfit Rendering (End-to-End)
- [ ] Complete headshot + studio model generation
- [ ] Create outfit with wardrobe items
- [ ] Trigger outfit render
- [ ] Verify outfit uses studio model as base

#### 5. Error Scenarios
- [ ] Test with invalid selfie image
- [ ] Test with invalid body photo
- [ ] Test network timeout scenarios
- [ ] Test Gemini API errors

### Debug Log Verification
When testing, check debug logs for:
- [ ] All hypothesis IDs (A through I) appear in logs
- [ ] Image sizes are non-zero (hasHeadshot, hasBody, etc.)
- [ ] Job IDs are generated correctly
- [ ] No unexpected errors in logs

## Known Issues / Future Enhancements

### Future Enhancements
1. **UI for Hair/Makeup Customization**
   - Add text inputs in profile screen
   - Pre-populate with examples/suggestions
   - Allow regeneration with different styles

2. **Enhanced Onboarding Flow**
   - Multi-step onboarding: Profile → Headshot → Studio Model
   - Progress indicator
   - Preview and refinement options

3. **Salon Feature**
   - Dedicated screen for generating headshot variations
   - Save multiple headshots to gallery
   - Switch between different headshots for outfits

4. **Background Removal**
   - Auto-remove background from body photos
   - Clean composition without distractions

### Potential Issues
- Studio model generation takes 30-40 seconds (long wait time)
- Need better loading indicators
- May need retry logic for API timeouts
- Consider caching to avoid regeneration

## Migration Instructions

### For Development
```bash
# 1. Apply database migration
cd supabase
supabase migration up

# 2. Restart dev servers
# Terminal 1: Expo
npm run web

# Terminal 2: Netlify Functions
netlify dev
```

### For Production
```bash
# 1. Push migration to Supabase
supabase db push

# 2. Deploy functions
git push origin main  # Netlify auto-deploys

# 3. Verify in production
# Test headshot + body shot flow with real user
```

## API Cost Estimates

### Per User Onboarding
- Headshot generation: ~$0.01 (gemini-2.5-flash-image)
- Studio model generation: ~$0.05 (gemini-3-pro-image-preview)
- **Total: ~$0.06 per user**

### Per Outfit Render (varies)
- Direct render (≤2 items): ~$0.01 (gemini-2.5-flash-image)
- Mannequin workflow (>2 items): ~$0.06 (pro for mannequin + pro for final)

## References

### Legacy Code
- `index.html:387-414` - generateInitialHeadshot()
- `archive/old-ui/public/js/app.js:802-819` - runBodyGeneration()
- `archive/old-ui/public/js/app.js:1049-1084` - Salon feature

### New Implementation
- `netlify/functions/ai-job-runner.ts:593-648` - processHeadshotGenerate()
- `netlify/functions/ai-job-runner.ts:650-738` - processBodyShotGenerate()
- `app/(tabs)/profile.tsx:250-405` - Upload handlers
