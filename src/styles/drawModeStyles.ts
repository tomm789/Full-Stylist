/**
 * Shared styles for DrawModeModal and DrawModeInline.
 *
 * createColorControlsStyles — only the color selector / panel styles.
 *   Used directly by ColorControlsPanel.
 *
 * createDrawModeStyles — full shared style set (includes color controls,
 *   controls row, canvas container, info modal, template browser).
 *   Used by DrawModeModal and DrawModeInline; each adds its own
 *   structural styles (safeArea / root / header) locally.
 */

import { StyleSheet } from 'react-native';
import { theme, shadows } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export const createColorControlsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    colorControlsSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    // Row A: color circles
    colorSelectorRow: {
      flexShrink: 0,
    },
    colorSelectorContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      alignItems: 'center',
    },
    colorCircleButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    colorCircleRing: {
      position: 'absolute',
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
    },
    // Row B: stacked per-colour panels
    colorPanelsScroll: {
      flexGrow: 0,
      maxHeight: 230,
    },
    colorSettingsPanel: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    colorPromptRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    activeColorSwatch: {
      width: 22,
      height: 22,
      borderRadius: 11,
      flexShrink: 0,
    },
    activeColorSwatchTopAligned: {
      marginTop: spacing.xs,
    },
    colorPromptInput: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      minHeight: 52,
      textAlignVertical: 'top',
    },
    colorPromptInputInline: {
      flex: 1,
    },
  });

export const createDrawModeStyles = (
  colors: ThemeColors,
  canvasWidth: number,
  canvasHeight: number,
) =>
  StyleSheet.create({
    // Controls row (shared between Modal and Inline)
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      gap: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    controlButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.sm,
    },
    controlButtonDisabled: {
      opacity: 0.35,
    },
    controlSpacer: {
      flex: 1,
    },
    // Canvas
    canvasContainer: {
      width: canvasWidth,
      height: canvasHeight,
      overflow: 'hidden',
      backgroundColor: colors.backgroundTertiary,
    },
    zoomHint: {
      position: 'absolute',
      bottom: spacing.sm,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
    },
    zoomHintText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
    },
    // Color controls (re-export via spread so components only need this import)
    ...createColorControlsStyles(colors),
    // Info modal
    infoOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    infoCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      ...shadows.md,
    },
    infoTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    infoBody: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    infoClose: {
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.round,
    },
    infoCloseText: {
      color: colors.white,
      fontWeight: typography.fontWeight.semibold,
      fontSize: typography.fontSize.sm,
    },
    // Template browser
    templateEmpty: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      textAlign: 'center',
      padding: spacing.xl,
    },
    templateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    templateThumb: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
    },
    templateInfo: {
      flex: 1,
    },
    templateDate: {
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    templateName: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
