import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  form: {
    padding: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeOption: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray400,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#e7f3ff',
  },
  typeOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  typeOptionTextActive: {
    color: colors.primary,
  },
  typeOptionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
    textAlign: 'center',
  },
  visibilitySelector: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  visibilityOption: {
    flex: 1,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  visibilityOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#e7f3ff',
  },
  visibilityOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  visibilityOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  outfitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
  },
});
