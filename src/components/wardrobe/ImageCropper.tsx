/**
 * ImageCropper Component
 * Modal for cropping images to 1:1 square with white background
 * Web-only component using react-easy-crop
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Platform, Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Cropper, { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/utils/canvasUtils';
import { compressImageFile } from '@/utils/image-compression';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface ImageCropperProps {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onDone: (blob: Blob, fileName: string) => void;
}

export default function ImageCropper({
  visible,
  imageUri,
  onCancel,
  onDone,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset crop and zoom when image changes
  useEffect(() => {
    if (visible && imageUri) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [visible, imageUri]);

  // Only render on web platform
  if (Platform.OS !== 'web') {
    // On native platforms, skip cropping and pass through the image
    // This is a fallback - ideally you'd want a native cropping solution
    if (visible) {
      // Convert URI to blob and pass through
      fetch(imageUri)
        .then((res) => res.blob())
        .then((blob) => {
          const fileName = `image-${Date.now()}.webp`;
          onDone(blob, fileName);
        })
        .catch(() => {
          onCancel();
        });
    }
    return null;
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    // Always update croppedAreaPixels when crop changes
    // This ensures we have a valid crop area even if user doesn't interact
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = useCallback(async () => {
    if (!croppedAreaPixels || !imageUri) {
      console.warn('Cannot complete crop: missing croppedAreaPixels or imageUri');
      return;
    }

    setIsProcessing(true);

    try {
      // Get cropped image as blob
      const croppedBlob = await getCroppedImg(imageUri, croppedAreaPixels, '#FFFFFF');

      // Compress the cropped image
      const fileName = `cropped-${Date.now()}.webp`;
      const file = new File([croppedBlob], fileName, { type: 'image/webp' });
      const compressedFile = await compressImageFile(file);

      // Convert compressed file back to blob
      const finalBlob = await compressedFile.arrayBuffer().then(
        (buffer) => new Blob([buffer], { type: 'image/webp' })
      );

      onDone(finalBlob, fileName);
    } catch (error) {
      console.error('Error cropping image:', error);
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageUri, onDone, onCancel]);

  if (Platform.OS !== 'web') {
    return null;
  }

  // Don't render if no image URI
  if (!imageUri || imageUri.trim() === '') {
    return null;
  }

  return (
    <Modal
      visible={visible && !!imageUri}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Crop & Scale</Text>
            <Text style={styles.subtitle}>Adjust your image to fit a square frame</Text>
          </View>

          <View style={styles.cropperContainer}>
            <Cropper
              image={imageUri}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              style={{
                containerStyle: styles.cropper,
                cropAreaStyle: styles.cropArea,
              }}
            />
          </View>

          <View style={styles.controls}>
            <View style={styles.zoomControl}>
              <Text style={styles.zoomLabel}>Zoom</Text>
              <View style={styles.sliderContainer}>
                {/* @ts-ignore - web-only HTML input */}
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  aria-label="Zoom level"
                  title={`Zoom: ${zoom.toFixed(1)}x`}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.gray300,
                    outline: 'none',
                    WebkitAppearance: 'none' as any,
                    appearance: 'none' as any,
                  }}
                />
                <Text style={styles.zoomValue}>{zoom.toFixed(1)}x</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.doneButton, isProcessing && styles.buttonDisabled]}
              onPress={handleDone}
              disabled={isProcessing}
            >
              <Text style={styles.doneButtonText}>
                {isProcessing ? 'Processing...' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  cropperContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  cropper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  cropArea: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  controls: {
    marginBottom: spacing.lg,
  },
  zoomControl: {
    width: '100%',
  },
  zoomLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  zoomValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray100,
  },
  doneButton: {
    backgroundColor: colors.black,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  doneButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
