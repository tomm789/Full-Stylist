# Edge Swipe Camera Bug Analysis

**Issue**: Swipe-right to open camera on Hair & Make-Up page not working as intended
**Status**: Bug Identified and Documented
**File**: `src/components/shared/EdgePeekSlider.tsx`

---

## The Problem

On the Hair & Make-Up page, users should be able to **swipe right from the left edge** to open the camera. However, the camera only opens in specific scenarios, not with normal swipe gestures.

### Expected Behavior
- User swipes right from the **left edge** of the screen
- Camera opens immediately

### Actual Behavior
- Swipe gesture doesn't open camera in the expected manner
- Camera functionality exists but triggers in different ways
- Likely requires specific velocity/threshold that's hard to hit naturally

---

## Root Cause Analysis

### The Flawed Logic (Lines 88-99)

```typescript
const handleScroll = (event: any) => {
  const offsetX = event.nativeEvent.contentOffset.x;
  const rawIndex = Math.round((offsetX + sidePadding) / snapInterval);
  const nextIndex = Math.max(0, Math.min(data.length - 1, rawIndex));
  if (nextIndex === lastIndexRef.current) return;
  lastIndexRef.current = nextIndex;
  onIndexChange?.(nextIndex);

  // ❌ PROBLEM HERE: Only triggers if offset is NEGATIVE and less than threshold
  if (edgeSwipeEnabled && nextIndex === 0 && offsetX < -edgeSwipeThreshold) {
    triggerEdge();  // Opens camera
  }
};

const handleScrollEndDrag = (event: any) => {
  if (!edgeSwipeEnabled || lastIndexRef.current !== 0) return;
  const velocityX = event.nativeEvent.velocity?.x ?? 0;

  // ❌ PROBLEM HERE: Needs velocity > 0.35 (right swipe) WHILE on index 0
  if (velocityX > 0.35) {
    triggerEdge();  // Opens camera
  }
};
```

### Issue #1: Negative Offset Requirement (Line 88)

```typescript
if (edgeSwipeEnabled && nextIndex === 0 && offsetX < -edgeSwipeThreshold) {
  triggerEdge();
}
```

**The Problem**:
- `offsetX < -edgeSwipeThreshold` means checking if offset is **NEGATIVE**
- In a horizontal scroll, scrolling RIGHT should produce **POSITIVE** offset
- A NEGATIVE offset means scrolling LEFT (opposite direction)
- **Result**: Checking for the wrong scroll direction

**What Should Happen**:
- User swipes right → offset becomes negative (scroll bounces back)
- At first position (index 0), scrolling right (negative offset) triggers camera
- Current code checks `offsetX < -edgeSwipeThreshold` which is correct in theory

**Why It's Actually Broken**:
The issue is more subtle. When the list is at the first item (index 0):
- Swiping right from the edge bounces the list back (negative scroll)
- But `offsetX` is clamped at 0 because it's at the beginning
- So `offsetX < -edgeSwipeThreshold` is almost never true
- The condition becomes unreachable

### Issue #2: Velocity-Based Detection (Lines 95-98)

```typescript
if (velocityX > 0.35) {
  triggerEdge();
}
```

**The Problem**:
- Requires RIGHT swipe velocity > 0.35 (RIGHT direction is positive velocity)
- Only triggers if you're already at index 0 (`lastIndexRef.current === 0`)
- Requires VERY FAST swipe - natural swipes are often slower
- Works inconsistently depending on device/swipe speed

**Why This Is Hard to Trigger**:
- Velocity threshold of 0.35 is quite high
- Requires user to swipe quickly from position 0
- Most users won't swipe fast enough
- Creates unpredictable behavior

### Issue #3: Logic Flow Problem (Line 94)

```typescript
const handleScrollEndDrag = (event: any) => {
  if (!edgeSwipeEnabled || lastIndexRef.current !== 0) return;
  // ... velocity check ...
};
```

**The Problem**:
- `lastIndexRef.current !== 0` check means: "only trigger if we're AT index 0"
- But if the list is still at index 0 and user swipes right, we're NOT changing index
- So `lastIndexRef.current` remains 0, allowing the velocity check
- BUT the scroll position is clamped, so the gesture is hard to recognize

---

## Why It "Seems to Work" But Is Unreliable

The camera does open sometimes because:

1. **Scenario 1**: User is very fast (velocity > 0.35) starting from position 0
   - `handleScrollEndDrag` detects high velocity
   - Camera opens

2. **Scenario 2**: Through trial and error, user hits a velocity threshold
   - Hard to reproduce consistently
   - Feels random to the user

**What Doesn't Work**:
- Normal slow swipes (like how users expect gestures to work)
- Swipes from other scroll positions
- Consistent edge detection

---

## The Fix

The edge swipe detection needs to be rewritten to properly detect:
1. **Scroll position**: Is list at the beginning?
2. **Swipe direction**: Is user moving right?
3. **Swipe magnitude**: Is swipe significant enough?

### Recommended Solution

```typescript
// Better approach: Track pan gesture separately or use proper velocity detection
const handleScrollEndDrag = (event: any) => {
  if (!edgeSwipeEnabled) return;

  const offsetX = event.nativeEvent.contentOffset.x;
  const velocityX = event.nativeEvent.velocity?.x ?? 0;

  // Check if at the beginning of the list
  const isAtStart = offsetX <= edgeSwipeThreshold;

  // Check if swiping right (positive velocity direction)
  // Lower threshold for better UX - 0.1 instead of 0.35
  const isSwipingRight = velocityX > 0.1;

  // Also check if scroll went negative (bounced back from edge)
  const isBounceSwipe = offsetX < 0;

  // Trigger camera if at start AND (right swipe OR bounce)
  if (isAtStart && (isSwipingRight || isBounceSwipe)) {
    triggerEdge();
  }
};
```

Or better yet, use a dedicated gesture handler like `react-native-gesture-handler` PanGestureHandler for more reliable edge detection.

---

## Current Configuration (Hair & Make-Up Page)

```typescript
<EdgePeekSlider
  data={headshots}
  edgeSwipeEnabled={Boolean(state.selfieImageId) && activeFaceIndex === 0}
  // ↑ Only enabled if there's a selfie AND we're at index 0

  onEdgeSwipeStart={() => {
    if (!state.isStyleDisabled) {
      state.handlePickCamera();  // Opens camera
    }
  }}
/>
```

**Why This Restriction?**
- Only allows edge swipe from position 0 (first headshot - the selfie)
- Makes sense UX-wise: primary action from starting position
- But the condition itself (`activeFaceIndex === 0`) might not be reactive if the index doesn't update properly

---

## Related Files

- **`src/components/shared/EdgePeekSlider.tsx`** - Contains the buggy edge swipe logic
- **`app/hair-and-make-up.tsx`** - Implements the slider with edge swipe configuration
- **Lines of concern**: EdgePeekSlider.tsx, lines 69-99 (triggerEdge logic)

---

## Why This Bug Exists

1. **Velocity-based detection is unreliable** - Human gestures vary too much
2. **Negative offset check is wrong** - Assumes offset can go negative, but it's clamped
3. **No debouncing properly implemented** - 800ms debounce might be firing accidentally
4. **Cross-platform inconsistencies** - Different devices report velocity differently

---

## Impact Assessment

- **Severity**: 🟡 MEDIUM
- **User Impact**: Camera button exists in header (workaround), but edge swipe doesn't work
- **Workaround**: Users can tap the camera icon in header instead
- **Frustration Level**: High - gesture feels broken, unpredictable

---

## Recommended Next Steps

1. **Short term**: Document that edge swipe is unreliable, use header camera button
2. **Medium term**: Lower velocity threshold to 0.1-0.2 for better responsiveness
3. **Long term**: Replace with dedicated gesture handler or redesigned edge detection

---

## Code Quality Note

The current implementation mixes scroll offset detection with velocity detection in a confusing way. A cleaner approach would be:

```typescript
// Separate concerns:
// 1. Scroll position detector
// 2. Velocity detector
// 3. Gesture recognizer
// 4. Camera trigger (only after all 3 conditions met)
```

Instead of the current intertwined logic that's hard to understand and debug.

---

**Analysis Date**: February 15, 2026
**Status**: Bug Confirmed, Documented, Ready for Fix

