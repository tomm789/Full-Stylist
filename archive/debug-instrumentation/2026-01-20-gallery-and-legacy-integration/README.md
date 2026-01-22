# Debug Instrumentation Archive - Gallery & Legacy Integration
**Date**: January 20, 2026  
**Features**: Gallery management system + Legacy headshot/body shot workflow integration

## Archived Files

### 1. profile.tsx.instrumented
**Location**: `app/(tabs)/profile.tsx`  
**Instrumentation**: Hypotheses A-O (15 hypothesis IDs)

**Hypothesis Coverage**:
- **A**: Image upload and record creation
- **B**: Headshot Gemini API call
- **C**: Headshot storage and settings update
- **D**: Body shot job creation and settings fetch
- **E**: Image downloads for composition
- **F**: Studio model Gemini API call
- **G**: Studio model storage and settings update
- **H**: Body shot job creation and execution
- **I**: Body shot polling and completion
- **J**: Gallery loading for headshots
- **K**: Gallery loading for body shots
- **L**: Clearing headshot selection
- **M**: Clearing body shot selection
- **N**: Selecting headshot from gallery
- **O**: Selecting body shot from gallery

**Log Location**: `.cursor/debug.log`  
**Log Endpoint**: `http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0`

### 2. ai-job-runner.ts.instrumented
**Location**: `netlify/functions/ai-job-runner.ts`  
**Instrumentation**: Hypotheses A-G (7 hypothesis IDs)

**Hypothesis Coverage**:
- **A**: Selfie image download
- **B**: Headshot Gemini API call
- **C**: Headshot upload and settings update
- **D**: Body shot job start and settings fetch
- **E**: Headshot and body image downloads
- **F**: Studio model Gemini API call
- **G**: Studio model upload and settings update

## Features Implemented

### Legacy Function Integration
1. **processHeadshotGenerate()** - Enhanced with hair/makeup customization
2. **processBodyShotGenerate()** - NEW: Composes headshot + body photo into studio model
3. **body_shot_generate** job type - NEW: Database support for studio model generation

### Gallery Management System
1. **loadAllGeneratedImages()** - Loads all user's headshots and body shots
2. **handleClearHeadshot()** - Clears active selection (image persists)
3. **handleClearBodyShot()** - Clears active selection (image persists)
4. **handleSelectHeadshot()** - Sets image as active from gallery
5. **handleSelectBodyShot()** - Sets image as active from gallery
6. Horizontal scrolling galleries with thumbnails
7. Active indicator (black border + "Active" badge)
8. Image count labels

## How to Restore Instrumentation

### Full Restore
```bash
# Restore profile.tsx
cp archive/debug-instrumentation/2026-01-20-gallery-and-legacy-integration/profile.tsx.instrumented app/\(tabs\)/profile.tsx

# Restore ai-job-runner.ts
cp archive/debug-instrumentation/2026-01-20-gallery-and-legacy-integration/ai-job-runner.ts.instrumented netlify/functions/ai-job-runner.ts
```

### Selective Restore
To restore only specific hypothesis logging:
1. Open the `.instrumented` file
2. Search for the hypothesis ID (e.g., `hypothesisId:'J'`)
3. Copy the `// #region agent log` ... `// #endregion` block
4. Insert at the same location in the clean file

## Debug Log Analysis

### Reading Logs
```bash
# View all logs
cat .cursor/debug.log

# Filter by hypothesis
cat .cursor/debug.log | grep '"hypothesisId":"J"'

# View by run
cat .cursor/debug.log | grep '"runId":"run2"'

# Pretty print
cat .cursor/debug.log | jq '.'
```

### Log Fields
- `location`: File and line number
- `message`: Human-readable description
- `data`: Structured data (IDs, counts, errors)
- `timestamp`: Unix timestamp (milliseconds)
- `sessionId`: Always 'debug-session'
- `runId`: 'run1' (initial) or 'run2' (gallery)
- `hypothesisId`: Letter A-O indicating which hypothesis

## Common Issues Debugged

### Issue 1: Gallery not loading
**Hypothesis**: J, K  
**Solution**: Check query patterns (`LIKE '%/ai/headshots/%'`)

### Issue 2: Selection not persisting
**Hypothesis**: N, O  
**Solution**: Verify user_settings update

### Issue 3: Clear not working
**Hypothesis**: L, M  
**Solution**: Ensure null value set correctly

### Issue 4: Body shot requires headshot
**Hypothesis**: D  
**Solution**: Check headshot_image_id exists in settings

### Issue 5: Image upload fails
**Hypothesis**: A, C  
**Solution**: Verify storage permissions and image record creation

### Issue 6: Job execution timeout
**Hypothesis**: H, I  
**Solution**: Increase polling attempts or check Netlify function

## Testing Commands

### Start Debug Session
```bash
# Terminal 1: Expo dev server
npm run web

# Terminal 2: Netlify functions (if testing locally)
netlify dev

# Clear old logs before each test
rm .cursor/debug.log
```

### Test Scenarios
1. **Upload Selfie → Generate Headshot** (Hypotheses A, B, C)
2. **Upload Body → Generate Studio Model** (Hypotheses D, E, F, G, H, I)
3. **Load Gallery** (Hypotheses J, K)
4. **Clear Selection** (Hypotheses L, M)
5. **Select from Gallery** (Hypotheses N, O)

## Related Files
- `LEGACY_INTEGRATION_SUMMARY.md` - Overview of legacy function integration
- `GALLERY_FEATURE_SUMMARY.md` - Gallery system documentation
- `supabase/migrations/0013_add_body_shot_generate.sql` - Database migration
- `lib/ai-jobs.ts` - Job trigger functions
- `docs/AI_JOBS.md` - Job type documentation

## Performance Impact
- **Instrumented**: ~15 fetch calls per user action (negligible network overhead)
- **Clean**: No logging overhead
- **File Size**: +3KB per file (instrumented vs clean)

## Notes
- All instrumentation uses fire-and-forget fetch (doesn't block execution)
- Logs written to NDJSON for easy parsing
- Session ID hardcoded as 'debug-session' for easy filtering
- Run IDs separate initial implementation (run1) from gallery features (run2)
