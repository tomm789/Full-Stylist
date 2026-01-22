# Reference Match Feature

## Overview
The Reference Match feature allows users to upload an inspiration/reference image (e.g., from Pinterest, Instagram, fashion magazines) and automatically match items from their wardrobe to recreate similar outfits.

## Implementation

### Backend (`netlify/functions/ai-job-runner.ts`)
- Implemented `processReferenceMatch()` function
- Uses Gemini AI to analyze reference images and match against wardrobe items
- Returns scored matches (0.0-1.0) with reasoning for each category
- Processes items category-by-category for better accuracy

### Frontend (`app/outfits/from-reference.tsx`)
New dedicated screen for reference-based outfit creation with:
1. **Image Upload**: Upload reference/inspiration image
2. **AI Analysis**: Trigger `reference_match` AI job to find matches
3. **Match Display**: Show matched items grouped by category with scores and reasoning
4. **Item Selection**: Select preferred items from matches
5. **Outfit Creation**: Create outfit from selected items

### Library (`lib/ai-jobs.ts`)
- Added `triggerReferenceMatch()` helper function
- Handles job creation with proper input structure

### Access Points
- **Wardrobe Screen**: New "inspiration" button (camera icon) in search bar
  - Located between filter and add buttons
  - Opens `/outfits/from-reference` screen

## User Flow

1. User taps inspiration button (📷 icon) on wardrobe screen
2. User uploads reference/inspiration image
3. User taps "Analyze & Match Items" button
4. AI analyzes image (30-45 seconds)
5. Matched items displayed by category with:
   - Match score (e.g., "87% match")
   - Reasons (e.g., "similar color, matching style")
   - Item thumbnails
6. User selects items from matches
7. User taps "Create Outfit" button
8. Outfit is saved and user is redirected to outfit editor

## Technical Details

### AI Prompt Strategy
- Analyzes reference image category-by-category for better accuracy
- Compares reference against all items in each category
- Only returns matches with score >= 0.5 (50%)
- Provides specific reasoning for each match
- Sorts matches by score (descending)

### Performance Considerations
- Loads one image per wardrobe item for efficiency
- Processes categories in sequence (not parallel) to manage API limits
- Uses `gemini-2.5-flash-image` model for cost-effectiveness
- Typical analysis time: 30-45 seconds for average wardrobes

### Error Handling
- Gracefully handles missing images for items
- Returns empty matches if category analysis fails
- Identifies missing categories if specified in constraints
- Clear error messages for user feedback

## Data Flow

```
User uploads reference
    ↓
Create image record in database
    ↓
Create reference_match AI job
    ↓
Trigger Netlify function
    ↓
Download reference image from storage
    ↓
Get user's wardrobe items by category
    ↓
For each category:
  - Download item images
  - Build AI prompt with reference + items
  - Call Gemini API
  - Parse and score matches
    ↓
Return all matches grouped by category
    ↓
Frontend displays matches
    ↓
User selects items
    ↓
Create outfit with selected items
```

## Future Enhancements

### Potential Improvements
1. **Smart Constraints**: Allow users to specify:
   - Must-include categories (e.g., "Tops", "Bottoms")
   - Color preferences
   - Season/occasion filters

2. **Batch Processing**: Process multiple categories in parallel for faster results

3. **Match Caching**: Cache match results to avoid re-analysis

4. **Similar Styles**: Show "similar style" suggestions even if exact matches aren't found

5. **Reference Library**: Allow users to save reference images for later use

6. **Social Integration**: Share reference images and matches with followers

7. **Shopping Suggestions**: If no good matches exist, suggest items to buy

## Testing

### Test Cases
1. Upload fashion photo with clearly visible clothing items
2. Verify all categories are analyzed
3. Check match scores are reasonable (0.5-1.0)
4. Verify item thumbnails display correctly
5. Test item selection/deselection
6. Confirm outfit creation works
7. Test edge cases:
   - Empty wardrobe
   - No matches found
   - Items without images
   - Invalid reference image

### Sample Reference Images
- Professional outfit from fashion blog
- Casual street style photo
- Editorial fashion photography
- Pinterest inspiration board

## Configuration

### Environment Variables
Same as existing AI jobs:
- `GEMINI_API_KEY`: Required for AI analysis
- `SUPABASE_URL`: Database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Admin access for processing

### Constraints Schema
```typescript
{
  must_include_categories?: string[];  // e.g., ["Tops", "Bottoms", "Shoes"]
  allow_missing_categories?: boolean;  // Default: true
}
```

### Result Schema
```typescript
{
  matches: Array<{
    category: string;
    items: Array<{
      wardrobe_item_id: string;
      score: number;  // 0.0-1.0
      reasons: string[];  // e.g., ["similar color", "matching style"]
    }>;
  }>;
  missing_categories: string[];
  notes: string;
}
```

## Cost Considerations

### API Costs (Gemini)
- Analysis uses `gemini-2.5-flash-image` model
- Cost per analysis depends on:
  - Number of categories in wardrobe
  - Number of items per category
  - Number of images processed
- Estimated: $0.10-0.30 per analysis for typical wardrobe

### Optimization Strategies
- Use only first image per item
- Skip items without images
- Batch API calls where possible
- Cache results for repeated analyses
