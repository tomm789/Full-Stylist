import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  listingsList: {
    padding: spacing.xs,
  },
  listingCard: {
    flex: 1,
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  listingImage: {
    width: '100%',
    aspectRatio: 1,
  },
  listingImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingImagePlaceholderText: {
    color: colors.gray600,
    fontSize: typography.fontSize.xs,
  },
  listingInfo: {
    padding: spacing.sm,
  },
  listingTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  listingCondition: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
    marginBottom: 4,
  },
  listingSeller: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
