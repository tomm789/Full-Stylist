/**
 * WardrobeCameraOverlay (web default)
 * Web-safe fallback for wardrobe image capture using file upload + ImageCropper.
 * On native, Metro resolves WardrobeCameraOverlay.native.tsx instead.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageCropper from './ImageCropper';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

type OverlayMode = 'upload' | 'crop';

interface WardrobeCameraOverlayProps {
  translateY: Animated.Value;
  isOpen: boolean;
  cameraRef: React.RefObject<unknown>;
  onCameraReady: () => void;
  onImageReady: (croppedUri: string) => void;
  onClose: () => void;
  pickFromLibrary: () => Promise<{ uri: string } | null>;
  lastPhotoUri: string | null;
  capture: () => Promise<{ uri: string } | null>;
}

export default function WardrobeCameraOverlay({
  translateY,
  isOpen,
  onCameraReady,
  onImageReady,
  onClose,
}: WardrobeCameraOverlayProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<OverlayMode>('upload');
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) onCameraReady();
  }, [isOpen, onCameraReady]);

  // Revoke previous object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  const handleUpload = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setSelectedUri(result.assets[0].uri);
    setMode('crop');
  }, []);

  const handleCropCancel = useCallback(() => {
    setSelectedUri(null);
    setMode('upload');
  }, []);

  const handleCropDone = useCallback((blob: Blob) => {
    // Revoke previous URL before creating a new one
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(blob);
    lastObjectUrlRef.current = objectUrl;

    setSelectedUri(null);
    setMode('upload');
    onImageReady(objectUrl);
  }, [onImageReady]);

  const handleClose = useCallback(() => {
    setSelectedUri(null);
    setMode('upload');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.uploadCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-upload-outline" size={34} color={colors.white} />
          </View>
          <Text style={styles.title}>Upload Photo</Text>
          <Text style={styles.subtitle}>Choose an image from your device to continue.</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
            activeOpacity={0.9}
          >
            <Ionicons name="images-outline" size={18} color={colors.white} />
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'crop' && selectedUri ? (
        <ImageCropper
          visible={true}
          imageUri={selectedUri}
          onCancel={handleCropCancel}
          onDone={handleCropDone}
        />
      ) : null}
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.black,
      zIndex: 100,
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
      alignItems: 'flex-start',
      zIndex: 2,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    uploadCard: {
      width: '100%',
      maxWidth: 440,
      borderWidth: 1,
      borderColor: colors.gray500,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.gray900,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
    },
    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.gray700,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.white,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: typography.fontSize.base,
      color: colors.gray300,
    },
    uploadButton: {
      marginTop: spacing.sm,
      minWidth: 180,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    uploadButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.white,
    },
  });
