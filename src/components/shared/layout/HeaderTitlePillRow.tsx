/**
 * HeaderTitlePillRow
 * Shared header row with title + right action pill.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import HeaderTitleRow from '@/components/tabs/HeaderTitleRow';
import HeaderActionPill from './HeaderActionPill';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

type HeaderTitlePillRowProps = {
  title: string;
  onCamera: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  avatarUri?: string | null;
  avatarInitials?: string;
  unreadCount?: number;
  cameraDisabled?: boolean;
  /** When provided, renders in the center and hides the title. */
  centerSlot?: React.ReactNode;
};

export default function HeaderTitlePillRow({
  title,
  onCamera,
  onNotifications,
  onProfile,
  avatarUri,
  avatarInitials,
  unreadCount = 0,
  cameraDisabled = false,
  centerSlot,
}: HeaderTitlePillRowProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <HeaderTitleRow
        title={title}
        leftIcon="camera-outline"
        onLeftAction={cameraDisabled ? undefined : onCamera}
        centerSlot={centerSlot}
        rightSlot={
          <HeaderActionPill
            onNotifications={onNotifications}
            onProfile={onProfile}
            avatarUri={avatarUri ?? undefined}
            avatarInitials={avatarInitials}
            unreadCount={unreadCount}
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
});
