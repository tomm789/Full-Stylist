import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themeColors';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Image viewer always dark
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
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
    padding: 20,
    backgroundColor: colors.background,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  itemBrand: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 16,
    color: colors.gray800,
    marginBottom: 20,
    lineHeight: 24,
  },
  emptyText: {
    color: '#fff', // On dark image viewer background
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingOverlayText: {
    color: '#fff', // Overlay text always white on dark overlay
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  carouselWrapper: {
    position: 'relative',
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  descriptionSkeleton: {
    marginBottom: 20,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonLineShort: {
    width: '60%',
  },
  generationErrorBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.error + '10',
    borderRadius: 8,
  },
  generationErrorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff', // Button text always white on primary bg
    fontSize: 14,
    fontWeight: '600',
  },
  imageErrorContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageErrorText: {
    color: '#fff', // Overlay text always white
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Image placeholder always dark
    alignSelf: 'center',
  },
});
