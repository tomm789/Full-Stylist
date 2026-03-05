import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  form: {
    padding: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  description: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemCard: {
    flex: 1,
    margin: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  itemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  itemTitle: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  selectedItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryTint,
  },
  selectedItemTitle: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  changeButton: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  imagesList: {
    gap: spacing.sm,
  },
  imageCard: {
    flex: 1,
    margin: spacing.xs,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.transparent,
    position: 'relative',
  },
  imageCardSelected: {
    borderColor: colors.primary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: colors.textTertiary,
    fontSize: typography.fontSize.xs,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background,
  },
  conditionSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  conditionOption: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  conditionOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  conditionOptionText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  conditionOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    marginTop: spacing.lg,
  },
});
