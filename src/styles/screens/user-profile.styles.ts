import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, typography } = theme;

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerContainer: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  headerHandle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  followingButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  followingButtonText: {
    color: colors.primary,
  },
});
