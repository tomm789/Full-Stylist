# Lib Folder Refactoring Summary

## Overview
This refactoring improves code organization, reduces duplication, and makes the codebase more maintainable by:
1. Creating shared utility modules for common operations
2. Splitting large files into focused, smaller modules
3. Using barrel exports for cleaner imports
4. Establishing consistent patterns across the codebase

---

## New Structure

### Shared Utilities (`/lib/utils/`)

#### `supabase-helpers.ts`
Common Supabase query patterns to reduce code duplication:
- `fetchSingle<T>()` - Generic single record fetch
- `fetchList<T>()` - Generic list fetch with filters/sorting
- `searchRecords<T>()` - Search with ilike pattern matching
- `recordExists()` - Check if record exists
- `getCount()` - Get record count with filters
- `verifyOwnership()` - Verify user owns a record
- `batchInsert<T>()` - Batch insert with error handling
- `updateRecord<T>()` - Update with timestamp and ownership verification
- `softDelete()` - Soft delete (set archived_at)
- `hardDelete()` - Hard delete

**Usage Example:**
```typescript
import { fetchList, searchRecords } from '@/lib/utils/supabase-helpers';

// Before
const { data, error } = await supabase
  .from('outfits')
  .select('*')
  .eq('owner_user_id', userId)
  .is('archived_at', null)
  .order('created_at', { ascending: false });

// After
const { data, error } = await fetchList<Outfit>('outfits', '*', {
  filters: { owner_user_id: userId, archived_at: null },
  orderBy: { column: 'created_at', ascending: false },
});
```

#### `image-helpers.ts`
Centralized image operations:
- `getPublicImageUrl()` - Get public URL from image record
- `getStorageUrl()` - Get URL from bucket/key
- `uriToBlob()` - Convert URI to Blob (handles native file://)
- `uploadImageToStorage()` - Upload image to Supabase Storage
- `createImageRecord()` - Create image database record
- `uploadAndCreateImage()` - Combined upload + record creation
- `deleteImage()` - Delete from storage and database
- `batchUploadImages()` - Upload multiple images

**Usage Example:**
```typescript
import { uploadAndCreateImage, getPublicImageUrl } from '@/lib/utils/image-helpers';

// Upload and create in one operation
const { data, error } = await uploadAndCreateImage(
  userId,
  imageBlob,
  'photo.jpg',
  'upload'
);

// Get public URL
const url = getPublicImageUrl(imageRecord);
```

#### `validation.ts`
Validation and access control utilities:
- `verifyWardrobeItemOwnership()` - Check item ownership
- `verifyOutfitOwnership()` - Check outfit ownership
- `verifyLookbookOwnership()` - Check lookbook ownership
- `verifyOriginalImages()` - Verify images are original (not AI)
- `canAccessEntity()` - Check entity access permissions
- `validatePostVisibility()` - Validate post visibility
- `validateNotSelfAction()` - Prevent self-following, etc.
- `isValidEmail()` - Email format validation
- `isValidHandle()` - Handle format validation
- `sanitizeSearchQuery()` - Sanitize search input

**Usage Example:**
```typescript
import { verifyOutfitOwnership, canAccessEntity } from '@/lib/utils/validation';

// Verify ownership before update
const { isOwner } = await verifyOutfitOwnership(outfitId, userId);
if (!isOwner) {
  return { error: new Error('Access denied') };
}

// Check if user can view entity
const { canAccess } = await canAccessEntity('outfit', outfitId, viewerId);
```

---

### Refactored Modules

#### Wardrobe Module (`/lib/wardrobe/`)

Split into focused files with barrel export:

**`items.ts`** - Core CRUD operations
- `getWardrobeItems()` - Get items with filters
- `searchWardrobeItems()` - Search items
- `getWardrobeItem()` - Get single item
- `getWardrobeItemsByIds()` - Batch get
- `createWardrobeItem()` - Create with images
- `updateWardrobeItem()` - Update item
- `deleteWardrobeItem()` - Soft delete
- `saveWardrobeItem()` - Save from another user
- `getSavedWardrobeItems()` - Get saved items

**`images.ts`** - Image operations
- `getWardrobeItemImages()` - Get item images
- `getWardrobeItemsImages()` - Batch get images
- `addImageToWardrobeItem()` - Add image
- `removeImageFromWardrobeItem()` - Remove image
- `updateImageSortOrder()` - Reorder images
- `setPrimaryImage()` - Set primary image
- `getPrimaryImage()` - Get primary image

**`categories.ts`** - Category operations
- `getWardrobeCategories()` - Get all categories
- `getSubcategories()` - Get subcategories
- `getCategory()` - Get single category
- `getCategoriesWithSubcategories()` - Get nested data

**`diagnostics.ts`** - Repair and diagnostic functions
- `findOrphanedImages()` - Find orphaned images/items
- `repairWardrobeItemImageLinks()` - Auto-repair links
- `diagnoseWardrobeItemImages()` - Diagnose RLS issues
- `checkImagesRLSMigration()` - Check migration status

**`index.ts`** - Barrel export

**Usage Example:**
```typescript
// Before (single file import)
import { getWardrobeItems, getWardrobeItemImages, repairWardrobeItemImageLinks } from '@/lib/wardrobe';

// After (same clean import via barrel export)
import { getWardrobeItems, getWardrobeItemImages, repairWardrobeItemImageLinks } from '@/lib/wardrobe';

// All functions still available, but organized into focused files internally
```

---

#### AI Jobs Module (`/lib/ai-jobs/`)

Split into focused files with barrel export:

**`core.ts`** - Basic operations
- `createAIJob()` - Create job
- `getAIJob()` - Get job by ID
- `isGeminiPolicyBlockError()` - Check error type
- `getActiveJob()` - Get active job with filter
- `getRecentJob()` - Get recent completed job
- `getOutfitRenderItemLimit()` - Get item limit

**`polling.ts`** - Polling logic
- `pollAIJob()` - Poll with exponential backoff
- `pollAIJobWithFinalCheck()` - Poll with final check
- `waitForAIJobCompletion()` - Wait with retry
- `resetCircuitBreaker()` - Reset failure count
- `isCircuitBreakerOpen()` - Check circuit breaker

**`execution.ts`** - Job execution
- `triggerAIJobExecution()` - Call Netlify function
- `createAndTriggerJob()` - Create + trigger

**`types.ts`** - Specific job types
- `triggerAutoTag()` - Trigger auto-tag job
- `applyAutoTagResults()` - Apply results
- `triggerProductShot()` - Trigger product shot
- `getActiveProductShotJob()` - Get active job
- `getRecentProductShotJob()` - Get recent job
- `triggerHeadshotGenerate()` - Trigger headshot
- `triggerBodyShotGenerate()` - Trigger body shot
- `getActiveOutfitRenderJob()` - Get active render
- `getRecentOutfitRenderJob()` - Get recent render

**`index.ts`** - Barrel export

**Usage Example:**
```typescript
// Before
import { createAIJob, pollAIJob, triggerAutoTag } from '@/lib/ai-jobs';

// After (same import via barrel export)
import { createAIJob, pollAIJob, triggerAutoTag } from '@/lib/ai-jobs';

// All functions still available with same imports
```

---

## Migration Guide

### Step 1: Update Imports

Most imports remain the same thanks to barrel exports:

```typescript
// Wardrobe - NO CHANGE needed
import { getWardrobeItems, createWardrobeItem } from '@/lib/wardrobe';

// AI Jobs - NO CHANGE needed
import { createAIJob, pollAIJob } from '@/lib/ai-jobs';
```

### Step 2: Adopt Shared Utilities (Optional but Recommended)

Replace repetitive patterns with shared utilities:

**Before:**
```typescript
const { data, error } = await supabase
  .from('outfits')
  .select('*')
  .eq('owner_user_id', userId)
  .is('archived_at', null)
  .order('created_at', { ascending: false })
  .limit(20);
```

**After:**
```typescript
import { fetchList } from '@/lib/utils/supabase-helpers';

const { data, error } = await fetchList<Outfit>('outfits', '*', {
  filters: { owner_user_id: userId, archived_at: null },
  orderBy: { column: 'created_at', ascending: false },
  limit: 20,
});
```

**Before:**
```typescript
// Multiple files uploading images with duplicate code
const { data: uploadData } = await supabase.storage.from('media').upload(...);
const { data: imageRecord } = await supabase.from('images').insert(...);
```

**After:**
```typescript
import { uploadAndCreateImage } from '@/lib/utils/image-helpers';

const { data, error } = await uploadAndCreateImage(userId, blob, 'photo.jpg');
```

### Step 3: Use Validation Utilities

Replace ownership checks with validation utilities:

**Before:**
```typescript
const { data: outfit } = await supabase
  .from('outfits')
  .select('id')
  .eq('id', outfitId)
  .eq('owner_user_id', userId)
  .single();

if (!outfit) {
  return { error: new Error('Access denied') };
}
```

**After:**
```typescript
import { verifyOutfitOwnership } from '@/lib/utils/validation';

const { isOwner } = await verifyOutfitOwnership(outfitId, userId);
if (!isOwner) {
  return { error: new Error('Access denied') };
}
```

---

## Benefits

### 1. **Reduced Code Duplication**
- Common patterns extracted to shared utilities
- Image operations centralized
- Query patterns standardized

### 2. **Better Organization**
- Large files (700+ lines) split into focused modules (150-300 lines each)
- Related functions grouped together
- Easier to find and maintain code

### 3. **Consistent Patterns**
- Standardized error handling
- Consistent return types
- Uniform query patterns

### 4. **Easier Testing**
- Smaller, focused files are easier to test
- Shared utilities can be tested once
- Mocking is simpler

### 5. **Better Developer Experience**
- Cleaner imports via barrel exports
- Clear module boundaries
- Better code navigation

---

## Files Overview

### Created Files
```
lib/
├── utils/
│   ├── supabase-helpers.ts    (370 lines) - Query helpers
│   ├── image-helpers.ts        (280 lines) - Image operations
│   └── validation.ts           (250 lines) - Validation utilities
├── wardrobe/
│   ├── items.ts               (320 lines) - CRUD operations
│   ├── images.ts              (200 lines) - Image operations
│   ├── categories.ts          (100 lines) - Category operations
│   ├── diagnostics.ts         (250 lines) - Repair functions
│   └── index.ts               (50 lines)  - Barrel export
├── ai-jobs/
│   ├── core.ts                (150 lines) - Basic operations
│   ├── polling.ts             (180 lines) - Polling logic
│   ├── execution.ts           (120 lines) - Job execution
│   ├── types.ts               (200 lines) - Job type triggers
│   └── index.ts               (40 lines)  - Barrel export
```

### Original Files (Can be deprecated)
- `lib/wardrobe.ts` (690 lines) → Split into `wardrobe/` folder
- `lib/ai-jobs.ts` (470 lines) → Split into `ai-jobs/` folder

---

## Next Steps

1. **Gradual Migration**: Start using new utilities in new code
2. **Test Coverage**: Add tests for shared utilities
3. **Documentation**: Document shared utilities with examples
4. **Cleanup**: Gradually replace old patterns with new utilities
5. **Deprecation**: Mark old files for removal once migration is complete

---

## Questions?

If you have questions about:
- Which utility to use: Check the usage examples above
- Migration path: Follow the migration guide step-by-step
- New patterns: Look at the refactored modules for examples
