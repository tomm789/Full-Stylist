# Outfit Creator Drag & Drop Implementation (WIP)

**Status:** Not Working - Archived for future development  
**Date:** January 20, 2026  
**Issue:** Drop detection not functioning correctly

## Overview

This file contains the drag-and-drop implementation for the outfit creator mode in the wardrobe screen. The drag detection works, but items cannot be successfully dropped into the target zone.

## Implementation Details

### Additional Imports Required

```typescript
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  // ... existing imports
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
```

### Additional State Variables

```typescript
// Add to WardrobeScreen component
const [isDragging, setIsDragging] = useState(false);
const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
```

### Drag Handlers

```typescript
const handleDragStart = (itemId: string) => {
  setIsDragging(true);
  setDraggedItemId(itemId);
  if (!outfitCreatorMode) {
    setOutfitCreatorMode(true);
  }
};

const handleDragEnd = (gestureState: any) => {
  if (isDragging && draggedItemId) {
    // Check if dropped in the top bar area
    // moveY is the final absolute Y coordinate on the screen
    const DROP_ZONE_HEIGHT = 200;
    const isInDropZone = gestureState.moveY < DROP_ZONE_HEIGHT;
    
    if (isInDropZone) {
      // Add item to selection if not already selected
      if (!selectedOutfitItems.includes(draggedItemId)) {
        setSelectedOutfitItems(prev => [...prev, draggedItemId]);
      }
    }
  }
  
  setIsDragging(false);
  setDraggedItemId(null);
};
```

### ItemCard PanResponder Implementation

Replace the ItemCard component with this version:

```typescript
const ItemCard = React.memo(({ item }: { item: WardrobeItem }) => {
  const imageUrl = itemImagesCache.get(item.id) || null;
  const imageLoading = !itemImagesCache.has(item.id);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const [cardOpacity] = useState(new Animated.Value(1));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Start dragging if moved more than 5 pixels
        const hasMovedEnough = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        return hasMovedEnough;
      },
      onPanResponderGrant: () => {
        handleDragStart(item.id);
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
        Animated.timing(cardOpacity, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        handleDragEnd(gestureState);
        pan.flattenOffset();
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  const handleItemPress = () => {
    if (outfitCreatorMode) {
      toggleOutfitItemSelection(item.id);
    } else {
      const itemIds = items.map(i => i.id).join(',');
      router.push(`/wardrobe/item/${item.id}?itemIds=${itemIds}`);
    }
  };

  const handleItemLongPress = () => {
    if (!outfitCreatorMode) {
      setOutfitCreatorMode(true);
      setSelectedOutfitItems([item.id]);
    }
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite(item.id, item.is_favorite || false);
  };

  const isSelectedForOutfit = outfitCreatorMode && selectedOutfitItems.includes(item.id);
  const isBeingDragged = isDragging && draggedItemId === item.id;

  return (
    <Animated.View
      style={[
        styles.itemCard,
        isSelectedForOutfit && styles.itemCardSelected,
        isBeingDragged && {
          transform: pan.getTranslateTransform(),
          opacity: cardOpacity,
          zIndex: 1000,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={handleItemPress}
        onLongPress={handleItemLongPress}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {imageLoading ? (
          <View style={styles.itemImagePlaceholder}>
            <ActivityIndicator size="small" />
          </View>
        ) : imageUrl ? (
          <>
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.itemImage}
              contentFit="cover"
            />
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item.is_favorite ? '#ff0000' : '#fff'}
              />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Text style={styles.itemImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});
```

### UI Changes for Drop Zone

Update the outfit creator bar to show drag state:

```typescript
{(outfitCreatorMode || isDragging) && (
  <View style={[styles.outfitCreatorBar, isDragging && styles.outfitCreatorBarDropZone]}>
    {isDragging && selectedOutfitItems.length === 0 && (
      <Text style={styles.dropZoneText}>Drop item here to add to outfit</Text>
    )}
    <ScrollView 
      horizontal 
      style={styles.selectedItemsScroll}
      showsHorizontalScrollIndicator={false}
    >
      {/* ... existing selected items display ... */}
    </ScrollView>
    <TouchableOpacity
      style={styles.exitOutfitModeButton}
      onPress={exitOutfitCreatorMode}
    >
      <Ionicons name="close" size={24} color="#000" />
    </TouchableOpacity>
  </View>
)}
```

Update the Generate Outfit button to hide during drag:

```typescript
{outfitCreatorMode && selectedOutfitItems.length > 0 && !isDragging && (
  <TouchableOpacity
    style={styles.generateOutfitButton}
    onPress={handleGenerateOutfit}
  >
    <Text style={styles.generateOutfitButtonText}>
      Generate Outfit ({selectedOutfitItems.length} items)
    </Text>
  </TouchableOpacity>
)}
```

### Additional Styles

```typescript
outfitCreatorBar: {
  flexDirection: 'row',
  backgroundColor: '#f0f0f0',
  borderBottomWidth: 1,
  borderBottomColor: '#ddd',
  padding: 8,
  alignItems: 'center',
  gap: 8,
  minHeight: 76,
},
outfitCreatorBarDropZone: {
  backgroundColor: '#e3f2fd',
  borderBottomWidth: 3,
  borderBottomColor: '#007AFF',
  borderStyle: 'dashed',
},
dropZoneText: {
  flex: 1,
  textAlign: 'center',
  color: '#007AFF',
  fontSize: 14,
  fontWeight: '600',
},
```

## Known Issues

1. **Drop Detection Not Working**: Items can be dragged and the drop zone appears, but the `gestureState.moveY` coordinate detection is not working correctly. The items are not being added to the outfit when released over the drop zone.

2. **Possible Causes**:
   - The Y coordinate system may be using a different reference point than expected
   - The FlatList may be interfering with the gesture detection
   - The drop zone height calculation may need adjustment based on actual screen layout
   - May need to use `measure()` or `onLayout` to get accurate drop zone coordinates

3. **Conflict with Long Press**: The PanResponder may be interfering with the long press gesture handler

## Recommended Approach for Future Development

1. **Use a Drag & Drop Library**: Consider using a library like `react-native-draggable-flatlist` or `react-native-drax` which handle the complex coordinate calculations

2. **Measure Drop Zone**: Use `onLayout` callback on the outfit creator bar to get its exact position and height:
   ```typescript
   const [dropZoneLayout, setDropZoneLayout] = useState({ y: 0, height: 0 });
   
   <View 
     style={styles.outfitCreatorBar}
     onLayout={(event) => {
       const { y, height } = event.nativeEvent.layout;
       setDropZoneLayout({ y, height });
     }}
   >
   ```

3. **Alternative: Click to Add**: Instead of drag-and-drop, could use the current working long-press + click approach which is more reliable

4. **Test on Physical Device**: Drag gestures often behave differently on physical devices vs simulator

## Current Working Alternative

The long-press to activate outfit creator mode + click to add items is working reliably and provides good UX. Users can:
- Long press an item to enter outfit creator mode
- Click other items to add them to the outfit
- Click selected items to remove them
- Use the X buttons to remove items from the bar

This may be sufficient for the initial release, with drag-and-drop as a future enhancement.
