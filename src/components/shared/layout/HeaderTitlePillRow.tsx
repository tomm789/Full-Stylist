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
}: HeaderTitlePillRowProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <HeaderTitleRow
        title={title}
        rightSlot={
          <HeaderActionPill
            onCamera={onCamera}
            onNotifications={onNotifications}
            onProfile={onProfile}
            avatarUri={avatarUri ?? undefined}
            avatarInitials={avatarInitials}
            unreadCount={unreadCount}
            disabled={cameraDisabled}
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
});
