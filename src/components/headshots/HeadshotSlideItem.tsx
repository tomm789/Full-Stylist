/**
 * HeadshotSlideItem
 * Memoized slide item for the EdgePeekSlider on the Hair & Make-Up screen.
 * Wrapped in React.memo so the FlatList only re-renders items whose props
 * actually changed (typically only the 2 items whose `isActive` flipped).
 */

import React from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';
const { spacing } = theme;

type HeadshotSlideItemProps = {
  item: { id: string; url: string | null };
  isActive: boolean;
  onPreviewPress: () => void;
  onMenuPress: () => void;
  generating: boolean;
  generateOverlayOpacity: Animated.AnimatedInterpolation<number>;
  previewIsGenerated: boolean;
  onRestoreSelfie: () => void;
  isStyleDisabled: boolean;
};

const HeadshotSlideItem = React.memo(
  ({
    item,
    isActive,
    onPreviewPress,
    onMenuPress,
    generating,
    generateOverlayOpacity,
    previewIsGenerated,
    onRestoreSelfie,
    isStyleDisabled,
  }: HeadshotSlideItemProps) => {
    const colors = useThemeColors();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    return (
      <View style={styles.faceSlideCard}>
        <TouchableOpacity
          style={styles.faceSlideButton}
          onPress={onPreviewPress}
          activeOpacity={0.9}
          disabled={!item.url}
        >
          {item.url ? (
            <ExpoImage
              source={{ uri: item.url }}
              style={styles.faceSlideImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.faceSlideImage} />
          )}
        </TouchableOpacity>

        {isActive && (
          <>
            <TouchableOpacity
              style={[
                styles.faceMenuButton,
                !item.url && styles.faceMenuButtonDisabled,
              ]}
              onPress={onMenuPress}
              disabled={!item.url}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textLight} />
            </TouchableOpacity>

            {generating && item.url && (
              <Animated.View
                style={[styles.generateOverlay, { opacity: generateOverlayOpacity }]}
                pointerEvents="none"
              />
            )}

            {previewIsGenerated && (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={onRestoreSelfie}
                disabled={isStyleDisabled}
                accessibilityLabel="Restore selfie"
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  },
);

HeadshotSlideItem.displayName = 'HeadshotSlideItem';

export default HeadshotSlideItem;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    faceSlideCard: {
      width: '100%',
      height: '100%',
      position: 'relative',
      borderWidth: 0.5,
      borderColor: colors.borderLight,
      backgroundColor: colors.backgroundTertiary,
    },
    faceSlideButton: {
      width: '100%',
      height: '100%',
    },
    faceSlideImage: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.backgroundTertiary,
    },
    faceMenuButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    faceMenuButtonDisabled: {
      opacity: 0.5,
    },
    generateOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.gray200,
    },
    restoreButton: {
      position: 'absolute',
      left: spacing.md,
      bottom: spacing.md,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
  });
