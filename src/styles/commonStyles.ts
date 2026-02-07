/**
 * Common Styles
 * Reusable style objects used across the app
 */

import { StyleSheet } from 'react-native';
import { theme } from './theme';
import type { ThemeColors } from './themes';

const { colors, spacing, borderRadius, typography, shadows, layout } = theme;

/**
 * Dynamic common styles factory - use with useThemeColors() for theme support
 */
export const createCommonStyles = (themeColors: ThemeColors) => StyleSheet.create({
  // Flex layouts
  flex1: {
    flex: 1,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Containers
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: themeColors.backgroundDark,
  },

  // Headers
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: layout.headerHeight - spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: themeColors.background,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: layout.headerHeight,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.textPrimary,
  },

  // Buttons
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: themeColors.primary,
  },
  buttonSecondary: {
    backgroundColor: themeColors.gray100,
  },
  buttonDanger: {
    backgroundColor: themeColors.error,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.transparent,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonTextPrimary: {
    color: themeColors.textLight,
  },
  buttonTextSecondary: {
    color: themeColors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  buttonPadding: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // Pills
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  pillSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    color: themeColors.textSecondary,
  },
  pillTextSelected: {
    color: themeColors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: themeColors.backgroundSecondary,
    color: themeColors.textPrimary,
  },
  inputFocused: {
    borderColor: themeColors.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Cards
  card: {
    backgroundColor: themeColors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Images
  imagePlaceholder: {
    backgroundColor: themeColors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: themeColors.textTertiary,
    fontSize: typography.fontSize.sm,
  },

  // Lists
  listContainer: {
    padding: spacing.sm,
  },
  listItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: themeColors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: themeColors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: themeColors.overlayLight,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: themeColors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  modalContent: {
    padding: spacing.xl,
  },

  // Sections
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.textPrimary,
  },

  // Text styles
  textPrimary: {
    color: themeColors.textPrimary,
  },
  textSecondary: {
    color: themeColors.textSecondary,
  },
  textTertiary: {
    color: themeColors.textTertiary,
  },
  textLight: {
    color: themeColors.textLight,
  },
  textBold: {
    fontWeight: typography.fontWeight.bold,
  },
  textSemibold: {
    fontWeight: typography.fontWeight.semibold,
  },

  // Spacing helpers
  mt8: { marginTop: spacing.sm },
  mt12: { marginTop: spacing.md },
  mt16: { marginTop: spacing.lg },
  mt20: { marginTop: spacing.xl },
  mb8: { marginBottom: spacing.sm },
  mb12: { marginBottom: spacing.md },
  mb16: { marginBottom: spacing.lg },
  mb20: { marginBottom: spacing.xl },
  ml8: { marginLeft: spacing.sm },
  mr8: { marginRight: spacing.sm },
  p8: { padding: spacing.sm },
  p12: { padding: spacing.md },
  p16: { padding: spacing.lg },
  p20: { padding: spacing.xl },

  // Borders
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: themeColors.borderLight,
  },
});

/**
 * Static common styles - light mode only (backward compatible)
 * Use createCommonStyles() with useThemeColors() for theme support
 */
export const commonStyles = createCommonStyles(colors);

export default commonStyles;
