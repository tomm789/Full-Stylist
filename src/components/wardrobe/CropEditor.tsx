/**
 * CropEditor
 * iOS-style "Move and Scale" crop editor for wardrobe camera captures.
 * Replicates the native UIImagePickerController crop/edit screen.
 *
 * Uses react-native-gesture-handler for pinch-to-zoom + pan,
 * react-native-reanimated for animated transforms, and
 * @shopify/react-native-skia for the dimmed overlay with crop cutout.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Image as RNImage,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Path, Skia, Rect } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CROP_MARGIN = 16;
const TOOLBAR_HEIGHT = 60;

interface CropEditorProps {
  imageUri: string;
  onCancel: () => void;
  onChoose: (croppedUri: string) => void;
  cancelLabel?: string;
  chooseLabel?: string;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export default function CropEditor({
  imageUri,
  onCancel,
  onChoose,
  cancelLabel = 'Retake',
  chooseLabel = 'Choose',
}: CropEditorProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Crop frame: square, ~90% of screen width, centered
  const cropSize = screenWidth - CROP_MARGIN * 2;
  const cropTop = insets.top + 48; // title area
  const cropLeft = CROP_MARGIN;

  // Gesture shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Load image dimensions
  useEffect(() => {
    RNImage.getSize(
      imageUri,
      (w, h) => setImageDimensions({ width: w, height: h }),
      () => setImageDimensions({ width: cropSize, height: cropSize }),
    );
  }, [imageUri, cropSize]);

  // Calculate display dimensions to fill the crop frame
  const { displayWidth, displayHeight, minScale } = useMemo(() => {
    if (!imageDimensions) return { displayWidth: cropSize, displayHeight: cropSize, minScale: 1 };

    const { width: imgW, height: imgH } = imageDimensions;
    const imgAspect = imgW / imgH;

    // Scale image so its smaller dimension fills the crop frame
    let dw: number;
    let dh: number;
    if (imgAspect >= 1) {
      // Landscape or square: height fills crop
      dh = cropSize;
      dw = cropSize * imgAspect;
    } else {
      // Portrait: width fills crop
      dw = cropSize;
      dh = cropSize / imgAspect;
    }

    return { displayWidth: dw, displayHeight: dh, minScale: 1 };
  }, [imageDimensions, cropSize]);

  // Center of the crop frame in screen coordinates
  const cropCenterX = cropLeft + cropSize / 2;
  const cropCenterY = cropTop + cropSize / 2;

  // Image container position (centered on crop frame)
  const imageContainerLeft = cropCenterX - displayWidth / 2;
  const imageContainerTop = cropCenterY - displayHeight / 2;

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, minScale, 4);
    })
    .onEnd(() => {
      // Clamp and re-check pan bounds after scale change
      if (scale.value < minScale) {
        scale.value = withSpring(minScale);
      }
      savedScale.value = scale.value;

      // Re-clamp translation after pinch
      const maxTx = Math.max(0, (displayWidth * scale.value - cropSize) / 2);
      const maxTy = Math.max(0, (displayHeight * scale.value - cropSize) / 2);
      translateX.value = withSpring(clamp(translateX.value, -maxTx, maxTx));
      translateY.value = withSpring(clamp(translateY.value, -maxTy, maxTy));
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const maxTx = Math.max(0, (displayWidth * scale.value - cropSize) / 2);
      const maxTy = Math.max(0, (displayHeight * scale.value - cropSize) / 2);
      translateX.value = clamp(savedTranslateX.value + e.translationX, -maxTx, maxTx);
      translateY.value = clamp(savedTranslateY.value + e.translationY, -maxTy, maxTy);
    })
    .onEnd(() => {
      const maxTx = Math.max(0, (displayWidth * scale.value - cropSize) / 2);
      const maxTy = Math.max(0, (displayHeight * scale.value - cropSize) / 2);
      translateX.value = withSpring(clamp(translateX.value, -maxTx, maxTx));
      translateY.value = withSpring(clamp(translateY.value, -maxTy, maxTy));
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double-tap to reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(minScale);
      savedScale.value = minScale;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  // Animated image transform
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ] as const,
  }));

  // Dimmed overlay path (full screen with square cutout using even-odd fill)
  const overlayPath = useMemo(() => {
    const path = Skia.Path.Make();
    // Outer rect (full screen)
    path.addRect(Skia.XYWHRect(0, 0, screenWidth, screenHeight));
    // Inner rect (crop cutout)
    path.addRect(Skia.XYWHRect(cropLeft, cropTop, cropSize, cropSize));
    path.setFillType(1); // EvenOdd
    return path;
  }, [screenWidth, screenHeight, cropLeft, cropTop, cropSize]);

  // Handle "Choose" — calculate crop and manipulate image
  const handleChoose = useCallback(async () => {
    if (!imageDimensions || processing) return;
    setProcessing(true);

    try {
      const currentScale = scale.value;
      const currentTx = translateX.value;
      const currentTy = translateY.value;

      // The crop frame's position in the displayed image coordinate space:
      // The image is centered at (0,0) relative to its container, then translated and scaled.
      // Crop frame center is at the image container center (0,0) in local coords.
      // With translation and scale, the visible crop region in the original image is:
      const scaledWidth = displayWidth * currentScale;
      const scaledHeight = displayHeight * currentScale;

      // Crop origin in scaled image space (top-left of crop frame relative to scaled image)
      const cropOriginXScaled = (scaledWidth - cropSize) / 2 - currentTx;
      const cropOriginYScaled = (scaledHeight - cropSize) / 2 - currentTy;

      // Convert to original image pixel space
      const pixelRatioX = imageDimensions.width / displayWidth;
      const pixelRatioY = imageDimensions.height / displayHeight;

      const originX = Math.round((cropOriginXScaled / currentScale) * pixelRatioX);
      const originY = Math.round((cropOriginYScaled / currentScale) * pixelRatioY);
      const side = Math.round((cropSize / currentScale) * pixelRatioX);

      // Clamp to image bounds
      const clampedOriginX = Math.max(0, Math.min(originX, imageDimensions.width - side));
      const clampedOriginY = Math.max(0, Math.min(originY, imageDimensions.height - side));
      const clampedSide = Math.min(side, imageDimensions.width - clampedOriginX, imageDimensions.height - clampedOriginY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX: clampedOriginX, originY: clampedOriginY, width: clampedSide, height: clampedSide } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );

      onChoose(result.uri);
    } catch (error) {
      console.error('[CropEditor] Crop failed:', error);
      // Fallback: pass original image
      onChoose(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageDimensions, imageUri, onChoose, displayWidth, displayHeight, cropSize, scale, translateX, translateY, processing]);

  if (!imageDimensions) return null;

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.titleText}>Move and Scale</Text>
      </View>

      {/* Image layer (behind overlay) */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.imageContainer,
            {
              left: imageContainerLeft,
              top: imageContainerTop,
              width: displayWidth,
              height: displayHeight,
            },
            animatedImageStyle,
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: displayWidth, height: displayHeight }}
            contentFit="fill"
          />
        </Animated.View>
      </GestureDetector>

      {/* Dimmed overlay with crop cutout (non-interactive) */}
      <Canvas style={styles.overlayCanvas} pointerEvents="none">
        <Path path={overlayPath} color="rgba(0,0,0,0.5)" />
        {/* Thin white border around crop area */}
        <Rect
          x={cropLeft}
          y={cropTop}
          width={cropSize}
          height={cropSize}
          color="rgba(255,255,255,0.3)"
          style="stroke"
          strokeWidth={0.5}
        />
      </Canvas>

      {/* Bottom toolbar */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={onCancel} activeOpacity={0.7} hitSlop={12}>
          <Text style={styles.toolbarButton}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleChoose}
          activeOpacity={0.7}
          hitSlop={12}
          disabled={processing}
        >
          <Text style={[styles.toolbarButton, processing && styles.toolbarButtonDisabled]}>
            {processing ? 'Processing...' : chooseLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  titleBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'absolute',
  },
  overlayCanvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  toolbarButton: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '400',
  },
  toolbarButtonDisabled: {
    opacity: 0.4,
  },
});
