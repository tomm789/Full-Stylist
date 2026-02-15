# Additional Bugs & Optimizations Found

**Document**: Additional issues identified during calendar and header component analysis
**Priority**: Medium to Low (not blocking, but should be tracked)
**Status**: Documented for future implementation

---

## Overview

During the comprehensive analysis of calendar and header components, I identified several additional bugs, potential memory leaks, and optimization opportunities that weren't critical enough for immediate fixing but should be implemented in future phases.

---

## 1. Calendar Component Additional Issues

### 1.1 useCalendarEntries Hook - Outfit Image Loading Not Cancelled

**File**: `src/hooks/calendar/useCalendarEntries.ts`
**Severity**: 🟡 MEDIUM
**Type**: Memory Leak (potential)

**Issue**:
```typescript
const loadOutfitImages = async (entries: CalendarEntry[]) => {
  const outfitPromises = outfitIds.map((outfitId) =>
    supabase
      .from('outfits')
      .select(...)
      .eq('id', outfitId)
      .single()
  );

  const outfitResults = await Promise.all(outfitPromises);
  // No cancellation if component unmounts during loading
};
```

**Problem**:
- If component unmounts while `outfitPromises` are pending, they continue running
- Memory leak occurs because `setOutfitImages` may be called after unmount
- Warning: "Can't perform a React state update on an unmounted component"

**Solution**:
```typescript
useEffect(() => {
  let isMounted = true;

  const loadOutfitImages = async (entries: CalendarEntry[]) => {
    // ... existing code ...
    const outfitResults = await Promise.all(outfitPromises);

    if (!isMounted) return; // Cancel if unmounted

    for (const { data: outfit } of outfitResults) {
      // ...
    }

    if (isMounted) {
      setOutfitImages((prev) => {
        // ...
      });
    }
  };

  loadOutfitImages(monthEntries);

  return () => {
    isMounted = false; // Cancel on unmount
  };
}, []);
```

**Impact**: Prevents memory leak warning and potential state update errors
**Effort**: Low (1-2 hours)
**Recommendation**: Fix in next iteration

---

### 1.2 CalendarContinuousGrid - Animated Values Not Properly Cleaned on Unmount

**File**: `src/components/calendar/CalendarContinuousGrid.tsx`
**Severity**: 🟡 MEDIUM
**Type**: Memory Leak (potential)

**Issue**:
The cleanup effect added in Phase 2 calls `stopAnimation()` and `removeAllListeners()`, but there may be other animated values in the component that aren't cleaned up.

**Current Cleanup**:
```typescript
useEffect(() => {
  return () => {
    bounceValuesRef.current.forEach(val => val.stopAnimation());
    bounceValuesRef.current.clear();
  };
}, []);
```

**Missing Cleanups**:
- Any scroll listeners added via `Animated.event`
- Any other `Animated.Value` instances created elsewhere
- Need to verify all animation listeners are removed

**Solution**:
```typescript
// Comprehensive cleanup
useEffect(() => {
  return () => {
    // Clear bounce animations
    bounceValuesRef.current.forEach(val => {
      val.stopAnimation();
      val.removeAllListeners();
    });
    bounceValuesRef.current.clear();

    // Clear other animations if any
    if (scrollYRef.current) {
      scrollYRef.current.removeAllListeners();
    }
  };
}, []);
```

**Impact**: Ensures complete cleanup of all animations
**Effort**: Low (30 mins)
**Recommendation**: Verify all animated values are cleaned

---

### 1.3 CalendarEntries - No Timeout for Outfit Image Requests

**File**: `src/hooks/calendar/useCalendarEntries.ts`
**Severity**: 🟡 MEDIUM
**Type**: Performance/Reliability

**Issue**:
```typescript
const outfitPromises = outfitIds.map((outfitId) =>
  supabase
    .from('outfits')
    .select(...)
    .single()
  // No timeout, request could hang indefinitely
);
```

**Problem**:
- If Supabase is slow or unresponsive, outfit images load forever
- No way to cancel stalled requests
- User sees loading state indefinitely

**Solution**:
```typescript
const OUTFIT_TIMEOUT = 5000; // 5 seconds

const outfitPromises = outfitIds.map((outfitId) =>
  Promise.race([
    supabase
      .from('outfits')
      .select(...)
      .single(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Outfit load timeout')), OUTFIT_TIMEOUT)
    ),
  ]).catch(() => ({ data: null, error: 'timeout' })) // Graceful fallback
);
```

**Impact**: Prevents hung requests, improves UX
**Effort**: Low (1 hour)
**Recommendation**: Add to CALENDAR_CONFIG timeouts

---

### 1.4 getDateAtIndex Function - No Bounds Checking

**File**: `src/lib/calendar/dateUtils.ts`
**Severity**: 🟡 MEDIUM
**Type**: Edge Case/Robustness

**Issue**:
```typescript
export function getDateAtIndex(startDate: Date, index: number): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  return date;
}
// No validation that index is reasonable
// index = 99999 would create an invalid far-future date
```

**Problem**:
- No bounds checking on index parameter
- Large indices could create dates in year 9999
- Could cause unexpected behavior or errors downstream

**Solution**:
```typescript
export function getDateAtIndex(startDate: Date, index: number): Date {
  // Validate index is reasonable
  if (!Number.isFinite(index) || Math.abs(index) > 100000) {
    console.warn(`[Calendar] Unreasonable index: ${index}, clamping to ±100000`);
    index = Math.max(-100000, Math.min(100000, index));
  }

  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  return date;
}
```

**Impact**: Prevents edge case errors
**Effort**: Low (30 mins)
**Recommendation**: Add validation to dateUtils

---

## 2. Header Components Additional Issues

### 2.1 SearchHeaderRow - No Debounce on Search Input

**File**: `src/components/search/SearchHeaderRow.tsx`
**Severity**: 🟡 MEDIUM
**Type**: Performance

**Issue**:
```typescript
<TextInput
  value={searchQuery}
  onChangeText={onSearchChange}
  // Every character triggers onSearchChange
  // If search hook is expensive, this causes lag
/>
```

**Problem**:
- Every keystroke triggers parent re-evaluation
- Search hook potentially re-evaluates 50+ times per second on fast typing
- Can cause noticeable lag on lower-end devices
- Network requests triggered for each keystroke

**Solution**:
```typescript
const [localQuery, setLocalQuery] = useState(searchQuery);
const debouncedSearch = useMemo(
  () => debounce(onSearchChange, 300),
  [onSearchChange]
);

const handleChange = useCallback((text: string) => {
  setLocalQuery(text);
  debouncedSearch(text);
}, [debouncedSearch]);

return (
  <TextInput
    value={localQuery}
    onChangeText={handleChange}
    // Now only triggers every 300ms of inactivity
  />
);
```

**Impact**: Significantly improves responsiveness on typing
**Effort**: Medium (1-2 hours)
**Recommendation**: High priority for UX improvement

---

### 2.2 HeaderSearchPill - useMemo Not Effective with Animated Values

**File**: `src/components/tabs/HeaderSearchPill.tsx`
**Severity**: 🟡 MEDIUM
**Type**: Code Quality/Optimization

**Issue**:
```typescript
const searchFieldStyle = useMemo(
  () => ({
    flexGrow: widthAnim,
    flexShrink: 1,
    opacity: widthAnim,
    marginLeft: widthAnim.interpolate({...}),
    marginRight: widthAnim.interpolate({...}),
  }),
  [widthAnim] // widthAnim is a Ref (constant reference)
);
```

**Problem**:
- `useMemo` wrapping Animated.Value objects doesn't help performance
- The dependency is a Ref, which never changes by reference
- Creates false sense of optimization
- Could confuse future developers

**Solution**:
```typescript
// Move outside component - it doesn't change
const SEARCH_FIELD_STYLE = (widthAnim: Animated.Value, spacing: number) => ({
  flexGrow: widthAnim,
  flexShrink: 1,
  opacity: widthAnim,
  marginLeft: widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spacing],
  }),
  marginRight: widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spacing],
  }),
});

// Or just create inline without useMemo
const searchFieldStyle = {
  flexGrow: widthAnim,
  // ... etc
};
```

**Impact**: Cleaner code, same performance
**Effort**: Low (30 mins)
**Recommendation**: Remove unnecessary useMemo

---

### 2.3 SearchOverlay - Pointer Events Management Fragile

**File**: `src/components/search/SearchOverlay.tsx`
**Severity**: 🟡 MEDIUM
**Type**: Reliability

**Issue**:
```typescript
<Animated.View
  pointerEvents={open ? 'auto' : 'none'}
  // If animation is running, touches may pass through during transition
/>
```

**Problem**:
- During animation from open→closed, pointerEvents is 'none' but overlay still visible
- User can tap buttons behind it briefly
- Opacity doesn't go to 0 instantly, animation takes 180ms
- Mismatch between pointer events and visibility

**Solution**:
```typescript
<Animated.View
  pointerEvents={open ? 'auto' : 'none'}
  style={[
    styles.container,
    {
      // When fully closed (opacity = 0), disable interactions
      pointerEvents: anim.interpolate({
        inputRange: [0, 0.1, 1],
        outputRange: ['none', 'none', 'auto'],
      }),
    },
  ]}
>
```

**Impact**: Prevents accidental taps during transition
**Effort**: Low (1 hour)
**Recommendation**: Improve interaction model

---

### 2.4 OutfitsHeaderSection - Complex Props Not Validated

**File**: `src/components/outfits/OutfitsHeaderSection.tsx`
**Severity**: 🟡 MEDIUM
**Type**: Code Quality

**Issue**:
```typescript
export type OutfitsHeaderSectionProps = {
  // 30+ optional props with no clear required/optional separation
  occasionOptions?: string[];
  selectedOccasions?: string[];
  onToggleOccasion?: (occasion: string) => void;
  onClearOccasions?: () => void;
  showOccasionPills?: boolean;
  // Hard to use correctly - what happens if only some are provided?
};
```

**Problem**:
- Too many optional props with interdependencies
- No prop validation
- Easy to pass invalid combinations
- Hard to understand what's required

**Solution**:
```typescript
// Split into required and feature-specific props
type OccasionFeatureProps =
  | {
      showOccasionPills: false;
      occasionOptions?: never;
      selectedOccasions?: never;
      onToggleOccasion?: never;
      onClearOccasions?: never;
    }
  | {
      showOccasionPills: true;
      occasionOptions: string[];
      selectedOccasions: string[];
      onToggleOccasion: (occasion: string) => void;
      onClearOccasions: () => void;
    };

export type OutfitsHeaderSectionProps = {
  // Required props
  headerReady: boolean;
  // ... other required
} & OccasionFeatureProps;
```

**Impact**: Better type safety and developer experience
**Effort**: Medium (2-3 hours)
**Recommendation**: Refactor for clarity

---

## 3. Shared Component Issues

### 3.1 useHideHeaderOnScroll Hook - Multiple Animated Values Not Cleaned

**File**: `src/hooks/useHideHeaderOnScroll.ts` (referenced but not reviewed)
**Severity**: 🟡 MEDIUM (inferred)
**Type**: Potential Memory Leak

**Issue**:
Similar to other scroll animation hooks, likely has `Animated.Value` listeners that aren't cleaned up.

**Recommendation**:
- Review this hook for proper cleanup
- Ensure all animated listeners removed on unmount
- Add cleanup effect if not present

---

### 3.2 useSearch Hook - No Result Limit

**File**: Referenced in Wardrobe/Outfits
**Severity**: 🟡 MEDIUM
**Type**: Performance

**Issue**:
- Search results potentially unbounded
- If user has 1000s of items, filtering could slow UI
- No pagination or virtualization

**Solution**:
- Add result limit (show first 50, then "show more")
- Implement virtualization for large result sets
- Add debounce to search input

---

## 4. Calendar Data Flow Issues

### 4.1 Refresh Function Not Used Consistently

**File**: `src/hooks/calendar/useCalendarEntries.ts`
**Severity**: 🟡 MEDIUM
**Type**: Reliability

**Issue**:
```typescript
const refresh = async () => {
  await loadEntries();
};

// Returned from hook but may not be called when needed
```

**Problem**:
- Refresh function available but callers might not use it
- No automatic refresh on certain events
- Stale data possible if not manually refreshed

**Solution**:
- Document when refresh should be called
- Consider auto-refresh on window focus
- Add visual indicator for stale data

---

### 4.2 Loading State Not Granular Enough

**File**: `src/hooks/calendar/useCalendarEntries.ts`
**Severity**: 🟡 MEDIUM
**Type**: UX

**Issue**:
```typescript
const [loading, setLoading] = useState(true);
// Single boolean for both entries AND outfit images loading
```

**Problem**:
- Can't distinguish between entries loading vs outfit images loading
- Shows loading state longer than necessary
- User sees spinner after entries loaded while images still loading

**Solution**:
```typescript
const [entriesLoading, setEntriesLoading] = useState(true);
const [imagesLoading, setImagesLoading] = useState(false);

return {
  loading: entriesLoading, // Show spinner only for entries
  imagesLoading, // Show image placeholders separately
};
```

---

## 5. Performance Optimization Opportunities

### 5.1 useLocalSearchParams Might Be Called Multiple Times

**File**: Calendar and Outfit screens
**Issue**: `useLocalSearchParams` called in every render
**Solution**: Memoize the result

```typescript
const params = useMemo(
  () => useLocalSearchParams<{ tab?: string }>(),
  [] // Or only deps that actually matter
);
```

### 5.2 Router Instance Not Memoized

**File**: Multiple header components
**Issue**: `useRouter()` called in every render
**Solution**: Typically OK, but worth noting if router changes frequently

### 5.3 Theme Colors Recalculation

**File**: All components with `useThemeColors()`
**Issue**: `createStyles(colors)` called in every render
**Observation**: This is already optimized (colors memoized), good pattern

---

## 6. Error Handling Gaps

### 6.1 No Error Boundary Around Search Components

**File**: SearchOverlay, SearchHeaderRow, HeaderSearchPill
**Severity**: 🟡 MEDIUM
**Issue**: If search hook errors, entire header crashes
**Solution**: Wrap in error boundary or add try-catch

---

### 6.2 Network Error Not Differentiated from User Error

**File**: useCalendarEntries, useSearch
**Issue**: All errors treated the same
**Solution**: Differentiate network errors from logic errors

---

## Summary Table

| Issue | File | Severity | Type | Effort | Recommendation |
|-------|------|----------|------|--------|-----------------|
| Outfit loading not cancelled on unmount | useCalendarEntries | 🟡 | Memory Leak | Low | Next iteration |
| Calendar grid cleanup incomplete | CalendarContinuousGrid | 🟡 | Memory Leak | Low | Verify coverage |
| Outfit requests no timeout | useCalendarEntries | 🟡 | Reliability | Low | Add timeout |
| getDateAtIndex no bounds check | dateUtils | 🟡 | Edge Case | Low | Add validation |
| Search input not debounced | SearchHeaderRow | 🟡 | Performance | Medium | High priority |
| useMemo on Animated values | HeaderSearchPill | 🟡 | Code Quality | Low | Clean up |
| SearchOverlay pointer events fragile | SearchOverlay | 🟡 | Reliability | Low | Improve logic |
| OutfitsHeaderSection prop validation | OutfitsHeaderSection | 🟡 | Code Quality | Medium | Refactor |
| useHideHeaderOnScroll cleanup | useHideHeaderOnScroll | 🟡 | Memory Leak | Low | Review |
| useSearch no result limit | Search hook | 🟡 | Performance | Medium | Add limits |
| Refresh function usage inconsistent | useCalendarEntries | 🟡 | Reliability | Low | Document |
| Loading state not granular | useCalendarEntries | 🟡 | UX | Low | Split states |

---

## Recommended Next Steps

### Phase 5A (High Priority)
1. Add search input debounce (significant UX improvement)
2. Fix outfit image loading cancellation
3. Add outfit request timeout

### Phase 5B (Medium Priority)
1. Verify all animation cleanup complete
2. Clean up unnecessary useMemo calls
3. Refactor OutfitsHeaderSection props

### Phase 5C (Lower Priority)
1. Add error boundaries to search
2. Differentiate network vs logic errors
3. Make loading states more granular
4. Add bounds checking to dateUtils

---

## Notes

- These issues are not blocking but should be tracked in a future ticket
- Most are performance or code quality improvements rather than critical bugs
- The two memory leak issues (outfit loading, cleanup) should be addressed soon
- The search debounce would significantly improve user experience

---

**Document Created**: February 15, 2026
**Status**: Ready for future implementation
**Recommendation**: Create follow-up ticket for Phase 5 improvements
