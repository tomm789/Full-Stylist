/**
 * CameraView — mirror selfie instructions + capture + preview/accept flow.
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from './styles';

type CameraViewProps = {
  cameraUri: string | null;
  isUploading: boolean;
  onCapture: () => void;
  onAccept: () => void;
  onUndo: () => void;
};

export function CameraView({ cameraUri, isUploading, onCapture, onAccept, onUndo }: CameraViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!cameraUri) {
    return (
      <View style={styles.cameraContainer}>
        <View style={styles.cameraInstructions}>
          <Text style={styles.cameraInstructionTitle}>Mirror Selfie Instructions</Text>
          <Text style={styles.cameraInstructionText}>
            Stand in front of a full-length mirror and hold your phone up so that{' '}
            <Text style={styles.cameraInstructionBold}>both you and your reflection</Text>{' '}
            are visible.
          </Text>
          <Text style={styles.cameraInstructionText}>
            Make sure your{' '}
            <Text style={styles.cameraInstructionBold}>full body is visible</Text> from head to
            toe in the mirror.
          </Text>
          <Text style={styles.cameraInstructionText}>
            Stand in a{' '}
            <Text style={styles.cameraInstructionBold}>well-lit area</Text> for the best results.
          </Text>
        </View>

        <TouchableOpacity style={styles.cameraButton} onPress={onCapture} activeOpacity={0.7}>
          <Ionicons name="camera" size={28} color={colors.white} />
          <Text style={styles.cameraButtonText}>Open Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <View style={styles.cameraPreview}>
        <Image source={{ uri: cameraUri }} style={styles.cameraPreviewImage} contentFit="cover" />
      </View>

      <View style={styles.cameraPreviewActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={onUndo}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-undo" size={18} color={colors.primary} />
          <Text style={styles.actionButtonSecondaryText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.actionButtonPrimary,
            isUploading && styles.actionButtonDisabled,
          ]}
          onPress={onAccept}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={colors.white} />
              <Text style={styles.actionButtonPrimaryText}>Use Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
