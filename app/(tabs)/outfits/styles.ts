import { StyleSheet } from 'react-native';
import { spacing, typography, layout } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  headerContainer: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  outfitFeedCard: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedListWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.containerMaxWidth,
  },
  feedList: {
    paddingHorizontal: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray800,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
});

export default createStyles;
