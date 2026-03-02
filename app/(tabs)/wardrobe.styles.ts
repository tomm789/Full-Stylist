import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

export const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    headerContainer: {
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      backgroundColor: colors.background,
    },
    placeholderContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    filterAndCategoriesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.backgroundDark,
    },
    filterButton: {
      marginLeft: theme.spacing.sm,
      marginRight: theme.spacing.xs,
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.backgroundDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    draftButton: {
      marginLeft: theme.spacing.sm,
      marginRight: theme.spacing.xs,
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.backgroundDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
