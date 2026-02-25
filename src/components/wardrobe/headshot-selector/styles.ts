/**
 * Shared styles for HeadshotSelectorModal and its sub-view components.
 */

import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography, shadows } = theme;

export type { Headshot } from '@/lib/wardrobe/items-types';

export const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Container
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    headerRight: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    newHeadshotButton: {
      padding: spacing.xs,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
    },
    selectButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    // Grid
    gridContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    columnWrapper: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    gridItem: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: colors.backgroundSecondary,
      ...shadows.sm,
    },
    gridImage: {
      width: '100%',
      height: '100%',
    },
    gridImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundTertiary,
    },
    checkmarkBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 80,
      gap: spacing.sm,
    },
    emptyStateText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    emptyStateSubtext: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Detail
    detailContainer: {
      flex: 1,
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.xl,
    },
    detailImageWrapper: {
      width: 200,
      height: 200,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    detailImage: {
      width: '100%',
      height: '100%',
    },
    detailImagePlaceholder: {
      backgroundColor: colors.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailStatus: {
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    detailStatusSubtext: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    detailStatusTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    tickCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.md,
    },
    detailActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    // Shared action buttons
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.round,
      minWidth: 100,
    },
    actionButtonPrimary: {
      backgroundColor: colors.primary,
    },
    actionButtonPrimaryText: {
      color: colors.white,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
    },
    actionButtonSecondary: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonSecondaryText: {
      color: colors.primary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
    },
    actionButtonDisabled: {
      opacity: 0.6,
    },
    // Camera
    cameraContainer: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.xl,
    },
    cameraInstructions: {
      gap: spacing.md,
    },
    cameraInstructionTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    cameraInstructionText: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    cameraInstructionBold: {
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    cameraButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.round,
      alignSelf: 'center',
    },
    cameraButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
    },
    cameraPreview: {
      flex: 1,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    cameraPreviewImage: {
      width: '100%',
      height: '100%',
    },
    cameraPreviewActions: {
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
    },
    // Generating
    generatingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.lg,
    },
    generatingTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    generatingSubtext: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    continueButton: {
      marginTop: spacing.md,
    },
    // Loading overlay
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
