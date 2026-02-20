import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import {
  clampCanvasCenter,
  clampCanvasScale,
  getDefaultOutfitCanvasLayout,
  type OutfitCanvasItemLayout,
  type OutfitCanvasLayoutMap,
  type OutfitCanvasTrimMap,
  type OutfitCanvasTrimStatus,
} from '@/lib/outfits/canvasLayout';

const { spacing, borderRadius } = theme;
const BASE_ITEM_WIDTH = 84;
const BASE_ITEM_HEIGHT = 110;

type CanvasItem = {
  id: string;
  imageUrl: string | null;
  trimStatus: OutfitCanvasTrimStatus;
};

interface OutfitCreatorCanvasProps {
  visible: boolean;
  isPreparing: boolean;
  selectedItems: CanvasItem[];
  layoutMap: OutfitCanvasLayoutMap;
  trimMap: OutfitCanvasTrimMap;
  containerStyle?: StyleProp<ViewStyle>;
  onLayoutChange: (itemId: string, next: OutfitCanvasItemLayout) => void;
  onBringForward: (itemId: string) => void;
  onSendBackward: (itemId: string) => void;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundTertiary,
      overflow: 'visible',
    },
    hintText: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      fontSize: theme.typography.fontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      zIndex: 5000,
    },
    canvasItem: {
      position: 'absolute',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'visible',
      backgroundColor: colors.backgroundSecondary,
    },
    canvasItemActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    itemTouchLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 3,
    },
    imageViewport: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      zIndex: 1,
    },
    image: {
      position: 'absolute',
    },
    controlsRow: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      flexDirection: 'row',
      gap: 2,
      zIndex: 6,
    },
    iconButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.56)',
    },
    resizeRow: {
      display: 'none',
    },
    resizeHandle: {
      position: 'absolute',
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.primary,
      zIndex: 10,
    },
    handleTopLeft: {
      top: -6,
      left: -6,
    },
    handleTopRight: {
      top: -6,
      right: -6,
    },
    handleBottomLeft: {
      bottom: -6,
      left: -6,
    },
    handleBottomRight: {
      bottom: -6,
      right: -6,
    },
    cardSpinnerOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.66)',
      zIndex: 5,
    },
    preparingOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.86)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    preparingText: {
      fontSize: theme.typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });

type DragLayerProps = {
  disabled?: boolean;
  onPress: () => void;
  onGrant: () => void;
  onMove: (dx: number, dy: number) => void;
  onRelease: () => void;
  style: StyleProp<ViewStyle>;
};

function DragLayer({
  disabled,
  onPress,
  onGrant,
  onMove,
  onRelease,
  style,
}: DragLayerProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !disabled && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
        onPanResponderGrant: onGrant,
        onPanResponderMove: (_event, gestureState) => {
          onMove(gestureState.dx, gestureState.dy);
        },
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onRelease,
      }),
    [disabled, onGrant, onMove, onRelease]
  );

  return (
    <Pressable
      {...panResponder.panHandlers}
      style={style}
      onPress={onPress}
      disabled={disabled}
    />
  );
}

type ResizeHandlesProps = {
  disabled?: boolean;
  onActivate: () => void;
  onResize: (handle: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', dx: number, dy: number) => void;
  styles: ReturnType<typeof createStyles>;
};

function ResizeHandles({ disabled, onActivate, onResize, styles }: ResizeHandlesProps) {
  const createResizeResponder = (handle: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: onActivate,
      onPanResponderMove: (_event, gestureState) => onResize(handle, gestureState.dx, gestureState.dy),
    });

  const topLeftResizeResponder = createResizeResponder('topLeft');
  const topRightResizeResponder = createResizeResponder('topRight');
  const bottomLeftResizeResponder = createResizeResponder('bottomLeft');
  const bottomRightResizeResponder = createResizeResponder('bottomRight');

  return (
    <>
      <Pressable
        style={[styles.resizeHandle, styles.handleTopLeft]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...topLeftResizeResponder.panHandlers}
      />
      <Pressable
        style={[styles.resizeHandle, styles.handleTopRight]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...topRightResizeResponder.panHandlers}
      />
      <Pressable
        style={[styles.resizeHandle, styles.handleBottomLeft]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...bottomLeftResizeResponder.panHandlers}
      />
      <Pressable
        style={[styles.resizeHandle, styles.handleBottomRight]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...bottomRightResizeResponder.panHandlers}
      />
    </>
  );
}

export default function OutfitCreatorCanvas({
  visible,
  isPreparing,
  selectedItems,
  layoutMap,
  trimMap,
  containerStyle,
  onLayoutChange,
  onBringForward,
  onSendBackward,
}: OutfitCreatorCanvasProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const sizeRef = useRef({ width: 1, height: 1 });
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    return [...selectedItems].sort((a, b) => {
      const aLayout = layoutMap[a.id];
      const bLayout = layoutMap[b.id];
      const aZ = aLayout?.zIndex ?? selectedItems.findIndex((item) => item.id === a.id);
      const bZ = bLayout?.zIndex ?? selectedItems.findIndex((item) => item.id === b.id);
      return aZ - bZ;
    });
  }, [layoutMap, selectedItems]);

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    sizeRef.current = {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    };
  };

  if (!visible) return null;

  return (
    <Pressable
      style={[styles.container, containerStyle]}
      onLayout={onCanvasLayout}
      onPress={() => setActiveItemId(null)}
    >
      <Text style={styles.hintText}>
        Drag to move. Drag border points to resize. Use arrows to reorder front/back.
      </Text>
      {sortedItems.map((item, index) => {
        const fallbackLayout = getDefaultOutfitCanvasLayout(index, sortedItems.length);
        const layout = layoutMap[item.id] ?? fallbackLayout;
        const x = layout.centerX * sizeRef.current.width;
        const y = layout.centerY * sizeRef.current.height;
        const scale = clampCanvasScale(layout.scale);
        const trim = trimMap[item.id];
        const itemStatus = item.trimStatus;
        const trimWidthRatio = trim?.trimWidthRatio ?? 1;
        const trimHeightRatio = trim?.trimHeightRatio ?? 1;
        const trimBounds = trim?.bounds ?? { left: 0, top: 0, right: 1, bottom: 1 };
        const itemAspect = trim?.aspectRatioAfterTrim ?? BASE_ITEM_WIDTH / BASE_ITEM_HEIGHT;
        const itemBaseHeight = BASE_ITEM_HEIGHT;
        const itemBaseWidth = Math.max(62, Math.min(150, itemBaseHeight * itemAspect));
        const imageRenderWidth = itemBaseWidth / trimWidthRatio;
        const imageRenderHeight = itemBaseHeight / trimHeightRatio;
        const imageOffsetLeft = -(trimBounds.left / trimWidthRatio) * itemBaseWidth;
        const imageOffsetTop = -(trimBounds.top / trimHeightRatio) * itemBaseHeight;
        const isActive = activeItemId === item.id;
        const isDragging = draggingItemId === item.id;
        const isPending = itemStatus === 'pending';
        const canInteract = !isPending;
        const marginLeft = -itemBaseWidth / 2;
        const marginTop = -itemBaseHeight / 2;
        const shouldRenderTrimmed = itemStatus === 'success' && Boolean(trim);
        const imageLeft = shouldRenderTrimmed ? imageOffsetLeft : 0;
        const imageTop = shouldRenderTrimmed ? imageOffsetTop : 0;
        const imageWidth = shouldRenderTrimmed ? imageRenderWidth : itemBaseWidth;
        const imageHeight = shouldRenderTrimmed ? imageRenderHeight : itemBaseHeight;

        return (
          <View
            key={item.id}
            style={[
              styles.canvasItem,
              isActive && styles.canvasItemActive,
              {
                width: itemBaseWidth,
                height: itemBaseHeight,
                marginLeft,
                marginTop,
                transform: [{ translateX: x }, { translateY: y }, { scale }],
                zIndex: layout.zIndex,
              },
            ]}
          >
            <DragLayer
              disabled={!canInteract}
              style={styles.itemTouchLayer}
              onPress={() => canInteract && setActiveItemId(item.id)}
              onGrant={() => {
                setActiveItemId(item.id);
                if (!layoutMap[item.id]) {
                  onLayoutChange(item.id, fallbackLayout);
                }
              }}
              onMove={(dx, dy) => {
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                  setDraggingItemId(item.id);
                }
                const width = sizeRef.current.width;
                const height = sizeRef.current.height;
                const next = {
                  ...layout,
                  centerX: clampCanvasCenter(layout.centerX + dx / width),
                  centerY: clampCanvasCenter(layout.centerY + dy / height),
                };
                onLayoutChange(item.id, next);
              }}
              onRelease={() => {
                setDraggingItemId((prev) => (prev === item.id ? null : prev));
              }}
            />
            <View style={styles.imageViewport}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={[
                    styles.image,
                    {
                      width: imageWidth,
                      height: imageHeight,
                      left: imageLeft,
                      top: imageTop,
                    },
                  ]}
                  contentFit="fill"
                />
              ) : null}
            </View>
            {isPending ? (
              <View style={styles.cardSpinnerOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
            {isActive && canInteract ? (
              <>
                <ResizeHandles
                  disabled={!canInteract}
                  styles={styles}
                  onActivate={() => setActiveItemId(item.id)}
                  onResize={(handle, dx, dy) => {
                    let signedDelta = 0;
                    if (handle === 'topLeft') {
                      signedDelta = (-dx - dy) / 2;
                    } else if (handle === 'topRight') {
                      signedDelta = (dx - dy) / 2;
                    } else if (handle === 'bottomLeft') {
                      signedDelta = (-dx + dy) / 2;
                    } else {
                      signedDelta = (dx + dy) / 2;
                    }
                    onLayoutChange(item.id, {
                      ...layout,
                      scale: clampCanvasScale(layout.scale + signedDelta / 130),
                    });
                  }}
                />
                {!isDragging ? (
                  <View style={styles.controlsRow}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => onSendBackward(item.id)}>
                      <Ionicons name="arrow-down" size={12} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => onBringForward(item.id)}>
                      <Ionicons name="arrow-up" size={12} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}
      {isPreparing ? (
        <View style={styles.preparingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.preparingText}>creating canvas..</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
