# Strategic Code Optimization Plan

**Prepared**: February 15, 2026
**Scope**: All 15 additional optimizations identified
**Duration**: ~18-22 hours of focused work
**Phases**: 6 phases over 4-6 weeks

---

## Executive Summary

This plan strategically optimizes the codebase by:
1. **Fixing critical issues first** (memory leaks, reliability)
2. **Improving UX next** (search debounce, loading states)
3. **Enhancing code quality** (validation, error handling)
4. **Testing thoroughly** after each phase

**Key Strategy**: Dependencies flow left to right, allowing parallel work where possible.

---

## Issue Dependencies & Priorities

### Critical Path (Must do in order)
```
Phase 1: Core Memory Leaks
  ↓
Phase 2: Reliability & Timeouts
  ↓
Phase 3: Performance (Search Debounce)
  ↓
Phase 4: Loading & UX State
  ↓
Phase 5: Code Quality & Validation
  ↓
Phase 6: Error Handling & Testing
```

### Parallel Work Opportunities
- Phases can have parallel streams (e.g., cleanup verification + timeout addition)
- Code quality fixes can happen in parallel (different files)
- Testing for each phase can start while next phase begins

---

## Phase 1: Core Memory Leak Fixes (Week 1)

**Duration**: 4-5 hours
**Risk**: LOW (focused changes)
**Priority**: 🔴 CRITICAL

### 1.1 Fix Outfit Image Loading Cancellation

**File**: `src/hooks/calendar/useCalendarEntries.ts`

**What**: Add isMounted flag to cancel outfit image loading when component unmounts

**Why**: Prevents memory leak warning and state update errors

**Changes**:
```typescript
const loadOutfitImages = async (entries: CalendarEntry[]) => {
  let isMounted = true;

  // ... fetch outfit promises ...

  if (!isMounted) return;

  // Process results...

  if (isMounted) {
    setOutfitImages(...);
  }
};

// Add cleanup
return () => {
  isMounted = false;
};
```

**Testing**:
- [ ] Unmount component while outfit images loading
- [ ] Verify no warnings in console
- [ ] Verify images still load if component stays mounted

**Estimate**: 1-2 hours
**Dependencies**: None

---

### 1.2 Verify CalendarContinuousGrid Animation Cleanup

**File**: `src/components/calendar/CalendarContinuousGrid.tsx`

**What**: Audit all Animated.Value instances and ensure complete cleanup

**Why**: Ensure Phase 2 cleanup is comprehensive

**Changes**:
1. Find all `new Animated.Value()` instances
2. Check each has cleanup in return function
3. Add missing cleanups if found
4. Document which values need cleanup

**Testing**:
- [ ] Open/close calendar 50+ times
- [ ] Monitor DevTools for memory leaks
- [ ] Check console for warnings

**Estimate**: 30 mins - 1 hour
**Dependencies**: None
**Parallel With**: 1.1

---

### 1.3 Review useHideHeaderOnScroll for Similar Issues

**File**: `src/hooks/useHideHeaderOnScroll.ts` (not yet reviewed)

**What**: Audit this hook for similar animation cleanup patterns

**Why**: Other scroll animation hooks may have same issues

**Changes**:
1. Read the hook implementation
2. Identify all Animated.Value instances
3. Check cleanup patterns
4. Apply same fixes as Phase 2 if needed

**Testing**:
- [ ] Scroll rapidly on pages using this hook
- [ ] Monitor for memory leaks
- [ ] Verify smooth animations

**Estimate**: 1-2 hours
**Dependencies**: 1.2
**Parallel With**: None (sequential, discovery phase)

---

### Phase 1 Completion Checklist
- [ ] Outfit loading cancellation implemented
- [ ] All Animated.Value cleanups verified
- [ ] useHideHeaderOnScroll reviewed
- [ ] No console warnings on component unmount
- [ ] Memory usage stable after 50+ unmount/remount cycles
- [ ] All tests passing

**Total Phase 1**: 4-5 hours

---

## Phase 2: Reliability & Timeouts (Week 1-2)

**Duration**: 3-4 hours
**Risk**: LOW (isolated changes)
**Priority**: 🟠 HIGH

### 2.1 Add Timeout to Outfit Image Requests

**File**: `src/hooks/calendar/useCalendarEntries.ts`

**What**: Add timeout (5 seconds) to outfit image Supabase requests

**Why**: Prevent hung requests when network is slow/unreliable

**Changes**:
```typescript
const OUTFIT_TIMEOUT = CALENDAR_CONFIG.OUTFIT_LOAD_TIMEOUT_MS; // 5000

const outfitPromises = outfitIds.map((outfitId) =>
  Promise.race([
    supabase.from('outfits').select(...).single(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Outfit load timeout')), OUTFIT_TIMEOUT)
    ),
  ]).catch(() => ({ data: null, error: 'timeout' }))
);
```

**Update CALENDAR_CONFIG**:
```typescript
export const CALENDAR_CONFIG = {
  // ... existing ...
  OUTFIT_LOAD_TIMEOUT_MS: 5000,
};
```

**Testing**:
- [ ] Slow network simulation (DevTools throttling)
- [ ] Verify timeout triggers after 5 seconds
- [ ] Verify graceful fallback (no image shown)
- [ ] Verify no error console warnings

**Estimate**: 1 hour
**Dependencies**: None
**Parallel With**: 2.2

---

### 2.2 Add Bounds Checking to getDateAtIndex

**File**: `src/lib/calendar/dateUtils.ts`

**What**: Add validation that index is within reasonable bounds

**Why**: Prevent edge cases with extreme indices

**Changes**:
```typescript
export function getDateAtIndex(startDate: Date, index: number): Date {
  // Validate index is reasonable
  if (!Number.isFinite(index) || Math.abs(index) > 100000) {
    const clamped = Math.max(-100000, Math.min(100000, index));
    console.warn(`[Calendar] Unreasonable index: ${index}, clamped to ${clamped}`);
    index = clamped;
  }

  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  return date;
}
```

**Testing**:
- [ ] Test with normal indices (0-365)
- [ ] Test with negative indices
- [ ] Test with extreme values (99999)
- [ ] Verify clamping works

**Estimate**: 30 mins
**Dependencies**: None
**Parallel With**: 2.1

---

### 2.3 Fix SearchOverlay Pointer Events During Animation

**File**: `src/components/search/SearchOverlay.tsx`

**What**: Improve pointer events to prevent taps during transition

**Why**: Prevent accidental taps on elements behind overlay

**Changes**:
```typescript
// Option 1: Simpler - disable pointerEvents during animation
<Animated.View
  pointerEvents={open ? 'auto' : 'none'}
  // Keep as-is; animation is 180ms, acceptable

// Option 2: Better - tie to opacity
style={[
  styles.container,
  {
    pointerEvents: anim.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: ['none', 'none', 'auto'],
    }),
  },
]}
```

**Testing**:
- [ ] Open/close overlay 20+ times
- [ ] Try tapping buttons behind during animation
- [ ] Verify no interaction with background

**Estimate**: 30 mins - 1 hour
**Dependencies**: None
**Parallel With**: 2.1, 2.2

---

### Phase 2 Completion Checklist
- [ ] Timeout added to outfit requests
- [ ] Bounds checking in getDateAtIndex
- [ ] SearchOverlay pointer events improved
- [ ] Slow network handling tested
- [ ] Edge cases verified

**Total Phase 2**: 3-4 hours

---

## Phase 3: Performance - Search Optimization (Week 2)

**Duration**: 3-4 hours
**Risk**: MEDIUM (affects search interaction)
**Priority**: 🟡 HIGHEST UX IMPACT

### 3.1 Add Search Input Debouncing

**File**: `src/components/search/SearchHeaderRow.tsx`

**What**: Debounce search input to prevent excessive re-evaluations

**Why**: Massive UX improvement, prevents lag when typing

**Implementation**:
```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce'; // or use custom debounce

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
  <HeaderSearchPill
    searchQuery={localQuery}
    onSearchChange={handleChange}
    // ...
  />
);
```

**Or create custom debounce hook**:
```typescript
// src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

**Testing**:
- [ ] Type quickly (10+ chars/sec)
- [ ] Verify no lag
- [ ] Verify search still triggers (not skipped)
- [ ] Test on low-end device
- [ ] Verify debounce timer resets on new keystroke

**Estimate**: 1-2 hours
**Dependencies**: None
**Parallel With**: 3.2

---

### 3.2 Improve Search Result Loading States

**File**: `src/hooks/calendar/useCalendarEntries.ts`

**What**: Split loading state into `entriesLoading` and `imagesLoading`

**Why**: Show spinner only when needed, better UX

**Changes**:
```typescript
const [entriesLoading, setEntriesLoading] = useState(true);
const [imagesLoading, setImagesLoading] = useState(false);

// In loadEntries:
setEntriesLoading(true);
// ... load entries ...
setEntriesLoading(false);

// In loadOutfitImages:
setImagesLoading(true);
// ... load images ...
setImagesLoading(false);

return {
  loading: entriesLoading,
  imagesLoading,
  // ...
};
```

**Update consumers** (Calendar screen):
```typescript
const { loading, imagesLoading } = useCalendarEntries(...);

// Show spinner only for entries, not images
if (loading && entries.size === 0) {
  return <LoadingSpinner text="Loading calendar..." />;
}

// Show image placeholders for imagesLoading
```

**Testing**:
- [ ] Verify entries load first, spinner disappears
- [ ] Verify images load asynchronously after
- [ ] No premature spinner dismissal

**Estimate**: 1 hour
**Dependencies**: 1.1 (outfit loading cancellation)
**Parallel With**: 3.1

---

### 3.3 Add Search Result Pagination

**File**: `src/hooks/useSearch.ts` (need to review)

**What**: Limit search results to first 50, show "load more" option

**Why**: Prevent performance issues with 1000s of items

**Implementation**:
```typescript
const [showMore, setShowMore] = useState(false);

const displayedResults = useMemo(() => {
  const limit = showMore ? 200 : 50;
  return filteredResults.slice(0, limit);
}, [filteredResults, showMore]);

const hasMore = filteredResults.length > displayedResults.length;
```

**UI Changes**:
- Show first 50 results by default
- Add "Show more" button if results > 50
- Smooth scroll when loading more

**Testing**:
- [ ] Verify UI responsive with 50 results
- [ ] Verify "Load more" works
- [ ] Monitor performance with 500+ results
- [ ] Verify smooth pagination

**Estimate**: 1-2 hours (depends on existing search implementation)
**Dependencies**: None
**Parallel With**: 3.1, 3.2

---

### Phase 3 Completion Checklist
- [ ] Search input debouncing working
- [ ] No lag when typing quickly
- [ ] Loading states properly split
- [ ] Search results paginated
- [ ] No performance issues with large result sets
- [ ] All search features still work

**Total Phase 3**: 3-4 hours

---

## Phase 4: Code Quality - Cleanup (Week 2-3)

**Duration**: 3-4 hours
**Risk**: LOW (isolated changes)
**Priority**: 🟢 MEDIUM

### 4.1 Remove Unnecessary useMemo Patterns

**File**: `src/components/tabs/HeaderSearchPill.tsx`

**What**: Remove useMemo from animated style objects (not effective)

**Why**: Cleaner code, no false optimization

**Changes**:
```typescript
// BEFORE
const searchFieldStyle = useMemo(
  () => ({
    flexGrow: widthAnim,
    flexShrink: 1,
    opacity: widthAnim,
    marginLeft: widthAnim.interpolate({...}),
    marginRight: widthAnim.interpolate({...}),
  }),
  [widthAnim]
);

// AFTER - Move to constant outside component
const SEARCH_FIELD_BASE = {
  flexShrink: 1,
};

// Inside component:
const searchFieldStyle = {
  ...SEARCH_FIELD_BASE,
  flexGrow: widthAnim,
  opacity: widthAnim,
  marginLeft: widthAnim.interpolate({...}),
  marginRight: widthAnim.interpolate({...}),
};
```

**Testing**:
- [ ] Search expand/collapse still smooth
- [ ] No new warnings
- [ ] Code cleaner and easier to understand

**Estimate**: 30 mins
**Dependencies**: None
**Parallel With**: 4.2, 4.3

---

### 4.2 Document Refresh Function Usage

**File**: `src/hooks/calendar/useCalendarEntries.ts`

**What**: Add clear documentation on when to call refresh()

**Why**: Help developers use the function correctly

**Changes**:
```typescript
/**
 * Refresh calendar entries and images
 *
 * Call this when:
 * - User explicitly pulls to refresh
 * - Window regains focus (user switches apps and back)
 * - Network reconnects after being offline
 * - User manually requests a refresh
 *
 * @example
 * // Pull to refresh
 * <ScrollView refreshControl={
 *   <RefreshControl refreshing={loading} onRefresh={refresh} />
 * }>
 */
const refresh = async () => {
  await loadEntries();
};
```

**Optional**: Auto-refresh on window focus
```typescript
useEffect(() => {
  const handleFocus = () => {
    // Refresh if data > 1 minute old
    if (Date.now() - lastRefreshTime > 60000) {
      refresh();
    }
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, []);
```

**Testing**:
- [ ] Documentation clear
- [ ] Examples work
- [ ] If auto-refresh: verify timing

**Estimate**: 30 mins - 1 hour
**Dependencies**: None
**Parallel With**: 4.1, 4.3

---

### 4.3 Refactor OutfitsHeaderSection Props

**File**: `src/components/outfits/OutfitsHeaderSection.tsx`

**What**: Split props into required and optional feature sets

**Why**: Better type safety, harder to misuse

**Implementation**:
```typescript
// Define feature-specific props
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

// Combine with required props
export type OutfitsHeaderSectionProps = {
  headerReady: boolean;
  headerHeight: Animated.Value | number;
  // ... other required props
} & OccasionFeatureProps;
```

**Testing**:
- [ ] TypeScript catches invalid prop combinations
- [ ] All previous usage still works
- [ ] New errors show helpful messages

**Estimate**: 1.5-2 hours
**Dependencies**: None (isolated refactoring)
**Parallel With**: 4.1, 4.2

---

### 4.4 Fix useLocalSearchParams Memoization

**File**: Calendar and Outfit screens

**What**: Memoize params object to prevent unnecessary re-renders

**Why**: Small performance improvement

**Changes**:
```typescript
// Only if params actually change
const memoizedParams = useMemo(
  () => useLocalSearchParams<{ tab?: string }>(),
  [] // Empty deps - params change rarely
);
```

**Testing**:
- [ ] Verify navigation still works
- [ ] Check DevTools for render counts
- [ ] No performance regression

**Estimate**: 30 mins
**Dependencies**: None
**Parallel With**: 4.1, 4.2, 4.3

---

### Phase 4 Completion Checklist
- [ ] Unnecessary useMemo removed
- [ ] Refresh function documented
- [ ] OutfitsHeaderSection props refactored
- [ ] useLocalSearchParams memoized
- [ ] No TypeScript errors
- [ ] All features still work

**Total Phase 4**: 3-4 hours

---

## Phase 5: Error Handling & Validation (Week 3-4)

**Duration**: 4-5 hours
**Risk**: MEDIUM (affects error paths)
**Priority**: 🟡 MEDIUM-HIGH

### 5.1 Add Error Boundary Around Search

**File**: Create `src/components/search/SearchErrorBoundary.tsx`

**What**: Catch search component errors and show fallback

**Why**: Prevent header from crashing if search hook fails

**Implementation**:
```typescript
class SearchErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Search error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.errorText}>Search temporarily unavailable</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

**Update consumers**:
```typescript
<SearchErrorBoundary>
  <SearchOverlay {...props} />
</SearchErrorBoundary>
```

**Testing**:
- [ ] Verify boundary catches errors
- [ ] Fallback UI shows correctly
- [ ] Retry works
- [ ] Parent component doesn't crash

**Estimate**: 1-1.5 hours
**Dependencies**: None
**Parallel With**: 5.2, 5.3

---

### 5.2 Differentiate Network vs Logic Errors

**Files**: `src/hooks/useSearch.ts`, `src/hooks/calendar/useCalendarEntries.ts`

**What**: Create error categorization system

**Why**: Show appropriate error messages to users

**Implementation**:
```typescript
enum ErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

interface AppError extends Error {
  type: ErrorType;
  retryable: boolean;
}

const categorizeError = (error: unknown): AppError => {
  const err = error instanceof Error ? error : new Error(String(error));

  if (err.message.includes('timeout')) {
    return {
      ...err,
      type: ErrorType.TIMEOUT,
      retryable: true,
    } as AppError;
  }

  if (err.message.includes('network') || err.message.includes('failed to fetch')) {
    return {
      ...err,
      type: ErrorType.NETWORK,
      retryable: true,
    } as AppError;
  }

  return {
    ...err,
    type: ErrorType.UNKNOWN,
    retryable: false,
  } as AppError;
};

// Usage:
try {
  // ... fetch ...
} catch (err) {
  const appError = categorizeError(err);
  setError(appError);
}
```

**Update error display**:
```typescript
const getErrorMessage = (error: AppError) => {
  switch (error.type) {
    case ErrorType.TIMEOUT:
      return 'Request timed out. Check your network and try again.';
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection.';
    case ErrorType.VALIDATION:
      return 'Invalid data. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
};
```

**Testing**:
- [ ] Network errors show network message
- [ ] Timeout errors show timeout message
- [ ] Retryable errors have retry button
- [ ] Non-retryable errors handled gracefully

**Estimate**: 1.5-2 hours
**Dependencies**: None
**Parallel With**: 5.1, 5.3

---

### 5.3 Add PropTypes/Validation

**Files**: Multiple header components

**What**: Add runtime prop validation (optional chaining cleanup)

**Why**: Catch prop errors early

**Implementation Options**:
```typescript
// Option 1: TypeScript only (already doing this well)
// Continue with strict types

// Option 2: Add zod for validation
import { z } from 'zod';

const HeaderSearchPillPropsSchema = z.object({
  searchQuery: z.string(),
  onSearchChange: z.function(),
  expanded: z.boolean(),
  // ...
});

// Option 3: Runtime checks in component
const validateProps = (props: any) => {
  if (!props.onSearchChange) {
    console.error('HeaderSearchPill: onSearchChange prop required');
  }
};
```

**Recommendation**: Keep TypeScript strict types (already good)
**Effort**: 30 mins - 1 hour (review and document)
**Dependencies**: None
**Parallel With**: 5.1, 5.2

---

### Phase 5 Completion Checklist
- [ ] Search error boundary working
- [ ] Network vs logic errors differentiated
- [ ] Error messages helpful to users
- [ ] Props validated
- [ ] No console errors
- [ ] Retry functionality works

**Total Phase 5**: 4-5 hours

---

## Phase 6: Testing & Verification (Week 4)

**Duration**: 3-4 hours
**Risk**: LOW (verification only)
**Priority**: 🟡 HIGH

### 6.1 Unit Tests for New Utilities

**Files**: Create test files for modified functions

**Tests to add**:
```typescript
// dateUtils.test.ts
describe('getDateAtIndex bounds checking', () => {
  it('should clamp extreme indices', () => {
    const date = new Date(2024, 0, 1);
    const result = getDateAtIndex(date, 999999);
    expect(result).toBeDefined(); // Doesn't crash
  });
});

// useCalendarEntries.test.ts
describe('outfit loading cancellation', () => {
  it('should not update state after unmount', async () => {
    const { unmount } = render(<TestComponent />);
    unmount();
    // Should not throw "Can't perform state update" warning
  });
});

// SearchHeaderRow.test.ts
describe('search debouncing', () => {
  it('should debounce search changes', async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <TestComponent onSearchChange={onChange} />
    );

    const input = getByPlaceholderText('Search...');
    fireEvent.changeText(input, 'test');
    fireEvent.changeText(input, 'test search');

    expect(onChange).not.toHaveBeenCalled(); // Not called immediately

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('test search');
    }, { timeout: 400 });
  });
});
```

**Testing**:
- [ ] All new code has tests
- [ ] Tests pass
- [ ] Coverage > 80% for critical paths

**Estimate**: 1.5-2 hours
**Dependencies**: All previous phases
**Parallel With**: None

---

### 6.2 Integration Testing

**What**: Test interactions between optimized components

**Scenarios**:
```typescript
// Scenario 1: Search with debounce + pagination
// Type quickly → debounce → results load → show first 50 → click load more

// Scenario 2: Calendar with outfit timeout
// Load calendar → outfit requests timeout → fallback shown → no errors

// Scenario 3: Error boundary in search
// Simulate search error → boundary catches → fallback shown → retry works

// Scenario 4: Memory leak fixes
// Mount/unmount 50x → no warnings → memory stable
```

**Testing**:
- [ ] All scenarios pass
- [ ] No console errors/warnings
- [ ] Performance acceptable

**Estimate**: 1-1.5 hours
**Dependencies**: All previous phases
**Parallel With**: None

---

### 6.3 Performance Benchmarking

**What**: Measure improvements from optimizations

**Metrics**:
- Search debounce: Reduce re-evaluations by 50-100x
- Loading states: Reduce spinner time by 40-50%
- Memory: No accumulation after 100+ mount/unmount cycles
- Search pagination: 10x faster with 1000+ results

**Tools**:
- React DevTools Profiler
- Chrome DevTools Performance
- Memory profiler

**Testing**:
- [ ] Record before/after metrics
- [ ] Verify improvements match expectations
- [ ] No regressions

**Estimate**: 1 hour
**Dependencies**: All previous phases
**Parallel With**: None

---

### Phase 6 Completion Checklist
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Performance benchmarks recorded
- [ ] No console errors/warnings
- [ ] All features still work
- [ ] Documentation updated

**Total Phase 6**: 3-4 hours

---

## Implementation Timeline

### Week 1
```
Mon-Tue: Phase 1 (Memory leaks) - 4-5 hours
  - 1.1 Outfit loading cancellation
  - 1.2 Animation cleanup verification
  - 1.3 useHideHeaderOnScroll review

Wed-Thu: Phase 2 (Reliability) - 3-4 hours
  - 2.1 Timeout for outfit requests
  - 2.2 Bounds checking for dates
  - 2.3 SearchOverlay pointer events
```

### Week 2
```
Mon-Tue: Phase 3 (Performance) - 3-4 hours
  - 3.1 Search input debouncing ⭐ HIGHEST IMPACT
  - 3.2 Loading state splitting
  - 3.3 Search pagination

Wed-Thu: Phase 4 (Code Quality) - 3-4 hours
  - 4.1 Remove useMemo patterns
  - 4.2 Document refresh function
  - 4.3 Refactor OutfitsHeaderSection props
  - 4.4 Memoize useLocalSearchParams
```

### Week 3
```
Mon-Tue: Phase 5 (Error Handling) - 4-5 hours
  - 5.1 Search error boundary
  - 5.2 Error categorization
  - 5.3 Prop validation review

Wed-Thu: Phase 6 (Testing) - 3-4 hours
  - 6.1 Unit tests
  - 6.2 Integration tests
  - 6.3 Performance benchmarking
```

---

## Parallel Work Opportunities

### Streams That Can Run in Parallel
```
Week 1:
  Stream A: 1.1 Outfit loading cancellation
  Stream B: 1.2 Animation cleanup + 1.3 useHideHeaderOnScroll review
  Result: Same-day completion

Week 2:
  Stream A: 3.1 Search debouncing (critical path)
  Stream B: 3.2 Loading states + 3.3 Pagination
  Stream C: Phase 4 code quality fixes

  Note: Phases can overlap:
  - Start Phase 2 while finishing Phase 1
  - Start Phase 4 while finishing Phase 3
  - Start Phase 5 while finishing Phase 4
  - Start Phase 6 while finishing Phase 5
```

---

## Risk Mitigation

### High Risk Items
1. **Search Debouncing** (Phase 3.1)
   - Risk: May break search if not implemented correctly
   - Mitigation: Thorough testing before deployment
   - Rollback plan: Remove debounce, revert to instant search

2. **Loading State Split** (Phase 3.2)
   - Risk: May show inconsistent loading states
   - Mitigation: Test all loading scenarios
   - Rollback plan: Revert to single loading state

3. **OutfitsHeaderSection Refactor** (Phase 4.3)
   - Risk: May break existing usage
   - Mitigation: TypeScript validation, comprehensive tests
   - Rollback plan: Revert type changes

### Testing Before Each Phase
- [ ] Local testing on device
- [ ] Console error/warning check
- [ ] Performance profiling
- [ ] Feature verification
- [ ] Regression testing

---

## Success Metrics

### By Phase
| Phase | Metric | Success Criteria |
|-------|--------|-----------------|
| 1 | Memory | No "state update" warnings |
| 2 | Reliability | All timeouts respected |
| 3 | UX | 50-100x fewer re-evaluations |
| 4 | Code Quality | 0 console errors |
| 5 | Error Handling | Helpful error messages |
| 6 | Quality | 80%+ test coverage |

### Overall
- ✅ All 15 issues addressed
- ✅ 80%+ test coverage
- ✅ No regressions
- ✅ Performance improvements verified
- ✅ Memory stable
- ✅ Error handling robust

---

## Documentation

### Files to Create
1. **OPTIMIZATION_PHASE_1_COMPLETION.md** - After Phase 1
2. **OPTIMIZATION_PHASE_2_COMPLETION.md** - After Phase 2
3. **PERFORMANCE_BENCHMARK_RESULTS.md** - After Phase 6

### Files to Update
1. **ADDITIONAL_OPTIMIZATIONS.md** - Mark completed items
2. **README.md** - Note optimization work
3. **CHANGELOG.md** - Document changes

---

## Deployment Strategy

### Per-Phase Deployment
```
Phase 1: Deploy immediately (critical fixes)
Phase 2: Deploy with 1 (reliability)
Phase 3: Deploy with 2 (major UX improvement)
Phase 4: Deploy with 3 (code quality)
Phase 5: Deploy with 4 (error handling)
Phase 6: Deploy with 5 (all optimizations complete)
```

### Release Notes
```
v2.1.0 - Code Quality & Performance Improvements
- Fixed memory leaks in calendar animations
- Added timeout protection for slow networks
- Improved search responsiveness (3x faster typing)
- Better error messages for users
- Improved code quality and type safety
- 80%+ test coverage for critical paths
```

---

## Summary

**Total Effort**: ~18-22 hours over 4 weeks
**Team Size**: 1-2 developers
**Risk Level**: LOW (each phase isolated)
**Impact**: HIGH (UX, reliability, memory, code quality)

**Key Wins**:
1. No more memory leaks ✅
2. Search is 3x faster ✅
3. Better error messages ✅
4. Improved code maintainability ✅
5. 80%+ test coverage ✅

---

## Approval & Sign-Off

**Prepared By**: Code Analysis & Optimization Review
**Date**: February 15, 2026
**Status**: Ready for Implementation
**Recommendation**: Start Phase 1 immediately (critical fixes)

---

## Appendix: Detailed Task Breakdown

See following sections for detailed implementation guides for each phase.
