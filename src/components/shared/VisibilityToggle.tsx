/**
 * VisibilityToggle Component
 * Header icon button that opens a dropdown to change post visibility.
 * Shows current visibility state via icon variant.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { DropdownMenuModal } from './modals/DropdownMenuModal';
import { DropdownMenuItem } from './modals/DropdownMenuItem';
import type { Visibility } from '@/lib/posts';

const { spacing } = theme;

type IoniconsName = keyof typeof Ionicons.glyphMap;

const VISIBILITY_CONFIG: Record<Visibility, { icon: IoniconsName; label: string }> = {
  public: { icon: 'eye-outline', label: 'Public' },
  followers: { icon: 'people-outline', label: 'Followers' },
  private_link: { icon: 'link-outline', label: 'Link Only' },
  private: { icon: 'eye-off-outline', label: 'Private' },
  inherit: { icon: 'eye-outline', label: 'Default' },
};

interface VisibilityToggleProps {
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  disabled?: boolean;
  size?: number;
}

export function VisibilityToggle({
  visibility,
  onVisibilityChange,
  disabled = false,
  size = 22,
}: VisibilityToggleProps) {
  const colors = useThemeColors();
  const [menuVisible, setMenuVisible] = useState(false);

  const config = VISIBILITY_CONFIG[visibility] || VISIBILITY_CONFIG.public;

  const handleSelect = useCallback((v: Visibility) => {
    onVisibilityChange(v);
    setMenuVisible(false);
  }, [onVisibilityChange]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        disabled={disabled}
        accessibilityLabel={`Visibility: ${config.label}`}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Ionicons name={config.icon} size={size} color={colors.textPrimary} />
      </TouchableOpacity>

      <DropdownMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        align="right"
      >
        <DropdownMenuItem
          label="Public"
          icon="eye-outline"
          onPress={() => handleSelect('public')}
          iconColor={visibility === 'public' ? colors.primary : undefined}
        />
        <DropdownMenuItem
          label="Followers"
          icon="people-outline"
          onPress={() => handleSelect('followers')}
          iconColor={visibility === 'followers' ? colors.primary : undefined}
        />
        <DropdownMenuItem
          label="Link Only"
          icon="link-outline"
          onPress={() => handleSelect('private_link')}
          iconColor={visibility === 'private_link' ? colors.primary : undefined}
        />
        <DropdownMenuItem
          label="Private"
          icon="eye-off-outline"
          onPress={() => handleSelect('private')}
          iconColor={visibility === 'private' ? colors.primary : undefined}
        />
      </DropdownMenuModal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
