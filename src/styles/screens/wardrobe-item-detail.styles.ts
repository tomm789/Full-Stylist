import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Image viewer always dark
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteButton: {
    // No special background, icon color indicates delete
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
  },
  detailsContent: {
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  itemTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemBrand: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemCategory: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  itemDescription: {
    fontSize: typography.fontSize.base,
    color: colors.gray800,
    marginBottom: spacing.xl,
    lineHeight: typography.lineHeight.relaxed,
  },
  emptyText: {
    color: '#fff', // On dark image viewer background
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.huge,
  },
  fastPathImageContainer: {
    aspectRatio: 1,
    backgroundColor: '#000', // Image viewer always dark
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  fastPathImage: {
    width: '100%',
    height: '100%',
  },
  fastPathImageDimmed: {
    opacity: 0.7,
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingOverlayText: {
    color: '#fff', // Overlay text always white on dark overlay
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },
  carouselWrapper: {
    position: 'relative',
  },
  titleSkeleton: {
    marginBottom: spacing.sm,
  },
  descriptionSkeleton: {
    marginBottom: spacing.xl,
  },
  skeletonLine: {
    height: spacing.lg,
    backgroundColor: colors.gray200,
    borderRadius: spacing.xs,
    marginBottom: spacing.sm,
    width: '100%',
  },
  skeletonLineShort: {
    width: '60%',
  },
  generationErrorBox: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
  },
  generationErrorText: {
    color: colors.error,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff', // Button text always white on primary bg
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  imageErrorContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  imageErrorText: {
    color: '#fff', // Overlay text always white
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  imagePlaceholder: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Image placeholder always dark
    alignSelf: 'center',
  },
});
