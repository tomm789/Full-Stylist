/**
 * HeaderAvatarButton Component
 * Circular avatar button for header actions.
 */

import React, { useMemo, useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { AVATAR_IMAGE_PROPS } from '@/lib/images';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

type HeaderAvatarButtonProps = {
  uri?: string | null;
  initials?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  inline?: boolean;
  borderless?: boolean;
};

export default function HeaderAvatarButton({
  uri,
  initials = '',
  onPress,
  accessibilityLabel = 'Profile',
  inline = false,
  borderless = false,
}: HeaderAvatarButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = initials.slice(0, 2).toUpperCase();
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        inline && styles.containerInline,
        borderless && styles.containerBorderless,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      {uri && !imageError ? (
        <Image
          {...AVATAR_IMAGE_PROPS}
          source={{ uri }}
          style={styles.avatar}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.initials}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginLeft: spacing.xs,
  },
  containerInline: {
    marginLeft: 0,
  },
  containerBorderless: {
    borderWidth: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});
