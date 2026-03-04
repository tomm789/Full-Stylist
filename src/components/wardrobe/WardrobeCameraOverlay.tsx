/**
 * WardrobeCameraOverlay
 * Full-screen camera overlay for the wardrobe screen.
 * Renders a camera with capture button, close button, flash/flip controls,
 * and a gallery thumbnail in the bottom-left that opens the photo library.
 *
 * After capture or library selection, shows the CropEditor for 1:1 crop.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CropEditor from './CropEditor';

const CAPTURE_BUTTON_SIZE = 72;
const CAPTURE_BUTTON_INNER = 60;
const THUMBNAIL_SIZE = 48;

type OverlayMode = 'camera' | 'crop';

interface WardrobeCameraOverlayProps {
  /** Animated translateY value for slide-from-bottom animation */
  translateY: Animated.Value;
  /** Whether the camera is currently open (controls CameraView mount) */
  isOpen: boolean;
  /** Ref to the CameraView for taking pictures */
  cameraRef: React.RefObject<CameraView | null>;
  /** Called when camera becomes ready */
  onCameraReady: () => void;
  /** Called with the final cropped image URI */
  onImageReady: (croppedUri: string) => void;
  /** Called when user presses close/back */
  onClose: () => void;
  /** Called when user taps the gallery thumbnail — should return the selected image URI or null */
  pickFromLibrary: () => Promise<{ uri: string } | null>;
  /** URI of the most recent camera roll photo (thumbnail preview) */
  lastPhotoUri: string | null;
  /** Capture function from useWardrobeCamera */
  capture: () => Promise<{ uri: string } | null>;
}

export default function WardrobeCameraOverlay({
  translateY,
  isOpen,
  cameraRef,
  onCameraReady,
  onImageReady,
  onClose,
  pickFromLibrary,
  lastPhotoUri,
  capture,
}: WardrobeCameraOverlayProps) {
  const insets = useSafeAreaInsets();
  const [selectedLens, setSelectedLens] = useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Camera controls state
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  // Mode: camera viewfinder or crop editor
  const [mode, setMode] = useState<OverlayMode>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  // Layout calculations
  const topBarHeight = insets.top + 8 + 40;
  const bottomBarHeight = insets.bottom + 24 + CAPTURE_BUTTON_SIZE;
  const availableHeight = Math.max(0, screenHeight - topBarHeight - bottomBarHeight);
  const cropGuideSize = Math.max(120, Math.min(screenWidth - 32, availableHeight - 24));
  const cropGuideTop = topBarHeight + Math.max(0, (availableHeight - cropGuideSize) / 2);

  const handleAvailableLensesChanged = useCallback((event: { lenses: string[] }) => {
    const lenses = event?.lenses ?? [];
    if (lenses.length === 0) return;

    const standard =
      lenses.find((lens) => {
        const value = lens.toLowerCase();
        return !value.includes('tele') && !value.includes('ultra');
      }) || lenses[0];

    setSelectedLens(standard);
  }, []);

  const handleFlipCamera = useCallback(() => {
    setFacing((prev) => {
      const next = prev === 'back' ? 'front' : 'back';
      // Disable flash on front camera
      if (next === 'front') setFlashMode('off');
      return next;
    });
  }, []);

  const handleToggleFlash = useCallback(() => {
    // Flash only works with back camera
    if (facing === 'front') return;
    setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  }, [facing]);

  const handleCapture = useCallback(async () => {
    const result = await capture();
    if (result) {
      setCapturedUri(result.uri);
      setMode('crop');
    }
  }, [capture]);

  const handlePickFromLibrary = useCallback(async () => {
    const result = await pickFromLibrary();
    if (result) {
      setCapturedUri(result.uri);
      setMode('crop');
    }
  }, [pickFromLibrary]);

  const handleCropCancel = useCallback(() => {
    setCapturedUri(null);
    setMode('camera');
  }, []);

  const handleCropChoose = useCallback((croppedUri: string) => {
    setCapturedUri(null);
    setMode('camera');
    onImageReady(croppedUri);
  }, [onImageReady]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setCapturedUri(null);
    setMode('camera');
    setFlashMode('off');
    setFacing('back');
    onClose();
  }, [onClose]);

  // Don't render when closed to save resources
  if (!isOpen) return null;

  // Crop editor mode
  if (mode === 'crop' && capturedUri) {
    return (
      <Animated.View
        style={[styles.container, { transform: [{ translateY }] }]}
      >
        <CropEditor
          imageUri={capturedUri}
          onCancel={handleCropCancel}
          onChoose={handleCropChoose}
          cancelLabel="Retake"
          chooseLabel="Choose"
        />
      </Animated.View>
    );
  }

  // Camera viewfinder mode
  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashMode}
        selectedLens={selectedLens || undefined}
        onAvailableLensesChanged={handleAvailableLensesChanged}
        onCameraReady={onCameraReady}
      />

      {/* Crop guide overlay */}
      <View
        pointerEvents="none"
        style={[
          styles.cropGuide,
          {
            width: cropGuideSize,
            height: cropGuideSize,
            top: cropGuideTop,
            left: (screenWidth - cropGuideSize) / 2,
          },
        ]}
      />

      {/* Top bar: close, flash, flip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <BlurView intensity={30} tint="dark" style={styles.controlButton}>
          <TouchableOpacity
            style={styles.controlButtonInner}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </BlurView>

        <View style={styles.topBarRight}>
          <BlurView
            intensity={30}
            tint="dark"
            style={[styles.controlButton, facing === 'front' && styles.controlButtonDisabled]}
          >
            <TouchableOpacity
              style={styles.controlButtonInner}
              onPress={handleToggleFlash}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={flashMode === 'on' ? 'flash' : 'flash-outline'}
                size={22}
                color={facing === 'front' ? 'rgba(255,255,255,0.3)' : '#fff'}
              />
            </TouchableOpacity>
          </BlurView>

          <BlurView intensity={30} tint="dark" style={styles.controlButton}>
            <TouchableOpacity
              style={styles.controlButtonInner}
              onPress={handleFlipCamera}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {/* Gallery thumbnail (bottom-left) */}
        <TouchableOpacity
          style={styles.thumbnailButton}
          onPress={handlePickFromLibrary}
          activeOpacity={0.7}
        >
          {lastPhotoUri ? (
            <Image
              source={{ uri: lastPhotoUri }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <BlurView intensity={20} tint="light" style={styles.thumbnailPlaceholder}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </BlurView>
          )}
        </TouchableOpacity>

        {/* Capture button (bottom-center) */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          activeOpacity={0.7}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        {/* Spacer for symmetry (bottom-right) */}
        <View style={styles.thumbnailButton} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
  },
  camera: {
    flex: 1,
  },
  cropGuide: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
    borderRadius: 4,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  captureButton: {
    width: CAPTURE_BUTTON_SIZE,
    height: CAPTURE_BUTTON_SIZE,
    borderRadius: CAPTURE_BUTTON_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: CAPTURE_BUTTON_INNER,
    height: CAPTURE_BUTTON_INNER,
    borderRadius: CAPTURE_BUTTON_INNER / 2,
    backgroundColor: '#fff',
  },
  thumbnailButton: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
