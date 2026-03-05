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
    padding: spacing.md,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  listingImage: {
    width: 120,
    height: 120,
  },
  listingImagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingImagePlaceholderText: {
    color: colors.gray600,
    fontSize: typography.fontSize.xs,
  },
  listingInfo: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  listingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  listingStatus: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  listingActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: borderRadius.sm,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
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
    marginBottom: spacing.md,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
