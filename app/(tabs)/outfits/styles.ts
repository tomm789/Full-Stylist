import { StyleSheet } from 'react-native';
import { theme, colors, spacing, typography, layout } from '@/styles';

const { spacing: themeSpacing } = theme;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  headerContainer: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  listContent: {
    padding: themeSpacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: themeSpacing.xs / 2,
  },
  gridList: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.containerMaxWidth,
  },
  gridContent: {
    paddingBottom: spacing.lg,
  },
  gridRowLeft: {
    justifyContent: 'flex-start',
    gap: 1,
  },
  gridItem: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '33.333333%',
    maxWidth: '33.333333%',
    aspectRatio: 3 / 4,
    margin: 0.5,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
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

export default styles;
