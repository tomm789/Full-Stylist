/**
 * WardrobeCameraOverlay
 * Inline camera view for the wardrobe screen's left-swipe camera feature.
 * Renders a full-screen camera with capture button, close button, and
 * a gallery thumbnail in the bottom-left that opens the photo library.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAPTURE_BUTTON_SIZE = 72;
const CAPTURE_BUTTON_INNER = 60;
const THUMBNAIL_SIZE = 48;

interface WardrobeCameraOverlayProps {
  /** Animated translateX value for slide animation */
  translateX: Animated.Value;
  /** Whether the camera is currently open (controls CameraView mount) */
  isOpen: boolean;
  /** Ref to the CameraView for taking pictures */
  cameraRef: React.RefObject<CameraView | null>;
  /** Called when camera becomes ready */
  onCameraReady: () => void;
  /** Called when user presses the capture button */
  onCapture: () => void;
  /** Called when user presses close/back */
  onClose: () => void;
  /** Called when user taps the gallery thumbnail */
  onPickFromLibrary: () => void;
  /** URI of the most recent camera roll photo (thumbnail preview) */
  lastPhotoUri: string | null;
}

export default function WardrobeCameraOverlay({
  translateX,
  isOpen,
  cameraRef,
  onCameraReady,
  onCapture,
  onClose,
  onPickFromLibrary,
  lastPhotoUri,
}: WardrobeCameraOverlayProps) {
  const insets = useSafeAreaInsets();
  const [selectedLens, setSelectedLens] = React.useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const topBarHeight = insets.top + 8 + 40;
  const bottomBarHeight = insets.bottom + 24 + CAPTURE_BUTTON_SIZE;
  const availableHeight = Math.max(0, screenHeight - topBarHeight - bottomBarHeight);
  const cropGuideSize = Math.max(120, Math.min(screenWidth - 32, availableHeight - 24));
  const cropGuideTop = topBarHeight + Math.max(0, (availableHeight - cropGuideSize) / 2);

  const handleAvailableLensesChanged = React.useCallback((event: { lenses: string[] }) => {
    const lenses = event?.lenses ?? [];
    if (lenses.length === 0) return;

    const standard =
      lenses.find((lens) => {
        const value = lens.toLowerCase();
        return !value.includes('tele') && !value.includes('ultra');
      }) || lenses[0];

    setSelectedLens(standard);
  }, []);

  // Don't render CameraView when closed to save resources
  if (!isOpen) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX }] },
      ]}
    >
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        selectedLens={selectedLens || undefined}
        onAvailableLensesChanged={handleAvailableLensesChanged}
        onCameraReady={onCameraReady}
      />

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

      {/* Top bar with close button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {/* Gallery thumbnail (bottom-left) */}
        <TouchableOpacity
          style={styles.thumbnailButton}
          onPress={onPickFromLibrary}
          activeOpacity={0.7}
        >
          {lastPhotoUri ? (
            <Image
              source={{ uri: lastPhotoUri }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Capture button (bottom-center) */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={onCapture}
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
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
