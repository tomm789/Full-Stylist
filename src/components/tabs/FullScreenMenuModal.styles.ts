import { StyleSheet } from 'react-native';
import { borderRadius, spacing, typography, shadows } from '@/styles/themeConfig';
import type { ThemeColors } from '@/styles/themeColors';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundSecondary,
    zIndex: 50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuCollapseButton: {
    padding: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  searchHeaderPillWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerIcon: {
    position: 'relative',
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  menuSearchRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuSearchWrap: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  menuSearchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.massive + spacing.huge,
    gap: spacing.lg,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  refreshIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  refreshTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  refreshTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  refreshDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  cardGroup: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  gridCardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardTitleDestructive: {
    color: colors.error,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
