/**
 * Common Styles
 * Reusable style objects used across the app
 */

import { StyleSheet } from 'react-native';
import { theme } from './theme';

const { colors, spacing, borderRadius, typography, shadows, layout } = theme;

export const commonStyles = StyleSheet.create({
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
    backgroundColor: colors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  
  // Headers
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: layout.headerHeight - spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
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
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.gray100,
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.transparent,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonTextPrimary: {
    color: colors.textLight,
  },
  buttonTextSecondary: {
    color: colors.textPrimary,
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
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Cards
  card: {
    backgroundColor: colors.background,
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
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: colors.textTertiary,
    fontSize: typography.fontSize.sm,
  },
  
  // Lists
  listContainer: {
    padding: spacing.sm,
  },
  listItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
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
    borderBottomColor: colors.borderLight,
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
    color: colors.textPrimary,
  },
  
  // Text styles
  textPrimary: {
    color: colors.textPrimary,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
  textTertiary: {
    color: colors.textTertiary,
  },
  textLight: {
    color: colors.textLight,
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
    borderBottomColor: colors.borderLight,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});

export default commonStyles;
