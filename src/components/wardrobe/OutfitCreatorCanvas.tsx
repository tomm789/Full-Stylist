import React, { useEffect, useMemo, useRef, useState } from 'react';
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
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      bottom: 8,
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
  onTap: () => void;
  onGrant: () => void;
  onMove: (dx: number, dy: number) => void;
  onRelease: () => void;
  style: StyleProp<ViewStyle>;
};

function DragLayer({
  disabled,
  onTap,
  onGrant,
  onMove,
  onRelease,
  style,
}: DragLayerProps) {
  // Mutate this ref every render so the PanResponder always calls the latest handler
  // without ever being recreated mid-gesture.
  const cbRef = useRef({ disabled, onTap, onGrant, onMove, onRelease });
  cbRef.current = { disabled, onTap, onGrant, onMove, onRelease };

  // Create the responder once per mount. Closures read cbRef.current, not captured values.
  const panRef = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (!panRef.current) {
    panRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => !cbRef.current.disabled,
      // Do NOT use onMoveShouldSetPanResponder: it would steal gestures from
      // arrow buttons (TouchableOpacity siblings rendered after DragLayer) after
      // any finger movement, preventing their onPress from ever firing.
      onPanResponderGrant: () => cbRef.current.onGrant(),
      onPanResponderMove: (_evt, gs) => cbRef.current.onMove(gs.dx, gs.dy),
      onPanResponderRelease: (_evt, gs) => {
        if (Math.abs(gs.dx) < 3 && Math.abs(gs.dy) < 3) cbRef.current.onTap();
        cbRef.current.onRelease();
      },
      onPanResponderTerminate: () => cbRef.current.onRelease(),
    });
  }

  return <View {...panRef.current!.panHandlers} style={style} />;
}

type ResizeHandlesProps = {
  disabled?: boolean;
  onActivate: () => void;
  onRelease: () => void;
  onResize: (handle: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', dx: number, dy: number) => void;
  styles: ReturnType<typeof createStyles>;
};

function ResizeHandles({ disabled, onActivate, onRelease, onResize, styles }: ResizeHandlesProps) {
  // Mutate this ref every render so responders always call the latest handlers.
  const cbRef = useRef({ disabled, onActivate, onRelease, onResize });
  cbRef.current = { disabled, onActivate, onRelease, onResize };

  // Lazy-init: create all four responders once per mount.
  type Responder = ReturnType<typeof PanResponder.create>;
  const respondersRef = useRef<{ tl: Responder; tr: Responder; bl: Responder; br: Responder } | null>(null);
  if (!respondersRef.current) {
    const makeR = (handle: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !cbRef.current.disabled,
        onMoveShouldSetPanResponder: () => !cbRef.current.disabled,
        onPanResponderGrant: () => cbRef.current.onActivate(),
        onPanResponderMove: (_evt, gs) => cbRef.current.onResize(handle, gs.dx, gs.dy),
        onPanResponderRelease: () => cbRef.current.onRelease(),
        onPanResponderTerminate: () => cbRef.current.onRelease(),
      });
    respondersRef.current = {
      tl: makeR('topLeft'),
      tr: makeR('topRight'),
      bl: makeR('bottomLeft'),
      br: makeR('bottomRight'),
    };
  }
  const { tl, tr, bl, br } = respondersRef.current;

  return (
    <>
      {/* Use View, not Pressable: Pressable spreads its own eventHandlers after restProps,
          silently overriding the panHandlers and making the PanResponder unreachable. */}
      <View
        style={[styles.resizeHandle, styles.handleTopLeft]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...tl.panHandlers}
      />
      <View
        style={[styles.resizeHandle, styles.handleTopRight]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...tr.panHandlers}
      />
      <View
        style={[styles.resizeHandle, styles.handleBottomLeft]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...bl.panHandlers}
      />
      <View
        style={[styles.resizeHandle, styles.handleBottomRight]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        {...br.panHandlers}
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
  const dragStartLayoutRef = useRef<Record<string, OutfitCanvasItemLayout>>({});
  const resizeStartLayoutRef = useRef<Record<string, OutfitCanvasItemLayout>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [isCanvasMeasured, setIsCanvasMeasured] = useState(false);

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
    const nextWidth = Math.max(width, 1);
    const nextHeight = Math.max(height, 1);
    sizeRef.current = {
      width: nextWidth,
      height: nextHeight,
    };
    if (nextWidth > 1 && nextHeight > 1) {
      setIsCanvasMeasured(true);
    }
  };

  useEffect(() => {
    if (!visible) {
      setIsCanvasMeasured(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={onCanvasLayout}
    >
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => setActiveItemId(null)}
      />
      <Text pointerEvents="none" style={styles.hintText}>
        Drag to move. Drag border points to resize. Use arrows to reorder front/back.
      </Text>
      {isCanvasMeasured
        ? sortedItems.map((item, index) => {
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
        const isUnresolved = itemStatus === 'pending' || itemStatus === 'idle';
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
              disabled={false}
              style={styles.itemTouchLayer}
              onTap={() => setActiveItemId(item.id)}
              onGrant={() => {
                setActiveItemId(item.id);
                dragStartLayoutRef.current[item.id] = layout;
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
                const startLayout = dragStartLayoutRef.current[item.id] ?? layout;
                const next = {
                  ...startLayout,
                  centerX: clampCanvasCenter(startLayout.centerX + dx / width),
                  centerY: clampCanvasCenter(startLayout.centerY + dy / height),
                };
                onLayoutChange(item.id, next);
              }}
              onRelease={() => {
                delete dragStartLayoutRef.current[item.id];
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
            {isUnresolved ? (
              <View pointerEvents="none" style={styles.cardSpinnerOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
            {isActive ? (
              <>
                <ResizeHandles
                  disabled={false}
                  styles={styles}
                  onActivate={() => {
                    setActiveItemId(item.id);
                    resizeStartLayoutRef.current[item.id] = layout;
                  }}
                  onRelease={() => {
                    delete resizeStartLayoutRef.current[item.id];
                  }}
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
                    const startLayout = resizeStartLayoutRef.current[item.id] ?? layout;
                    onLayoutChange(item.id, {
                      ...startLayout,
                      scale: clampCanvasScale(startLayout.scale + signedDelta / 130),
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
      })
        : null}
      {isPreparing ? (
        <View pointerEvents="none" style={styles.preparingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.preparingText}>creating canvas..</Text>
        </View>
      ) : null}
    </View>
  );
}
