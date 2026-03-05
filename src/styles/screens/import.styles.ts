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
    flexGrow: 1,
  },
  content: {
    padding: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.xxl,
  },
  dataSummary: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxl,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noDataContainer: {
    backgroundColor: colors.warningBannerBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxl,
  },
  noDataText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warningBannerText,
    marginBottom: spacing.sm,
  },
  noDataSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.warningBannerText,
  },
  progressContainer: {
    backgroundColor: colors.primaryTint,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  progressStep: {
    fontSize: typography.fontSize.md,
    color: colors.primaryAccent,
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryAccent,
    marginBottom: spacing.sm,
  },
  progressSpinner: {
    marginTop: spacing.sm,
  },
  resultsContainer: {
    backgroundColor: colors.successBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxl,
  },
  resultsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.successText,
    marginBottom: spacing.sm,
  },
  resultsItem: {
    fontSize: typography.fontSize.md,
    color: colors.successText,
    marginBottom: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  skipButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.base,
  },
});
