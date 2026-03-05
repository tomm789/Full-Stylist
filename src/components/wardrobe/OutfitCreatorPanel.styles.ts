import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

export const PANEL_HANDLE_AREA_HEIGHT = 24;
export const TAB_BAR_HEIGHT = 44;
export const ROW_CONTENT_HEIGHT = 76; // paddingVertical(8) + card(60) + paddingVertical(8)
export const PANEL_COLLAPSED_HEIGHT = PANEL_HANDLE_AREA_HEIGHT + ROW_CONTENT_HEIGHT;

export const createStyles = (colors: ThemeColors, cellSize: number) =>
  StyleSheet.create({
    panel: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'visible',
    },
    // ── Handle ──────────────────────────────────────────────────────────────
    handleArea: {
      height: PANEL_HANDLE_AREA_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
    },
    // ── Tab bar ─────────────────────────────────────────────────────────────
    tabBar: {
      flexDirection: 'row',
      height: TAB_BAR_HEIGHT,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: typography.fontWeight.semibold,
    },
    // ── Content area ────────────────────────────────────────────────────────
    contentArea: {
      flex: 1,
      overflow: 'visible',
    },
    // ── Collapsed row ───────────────────────────────────────────────────────
    rowScroll: {
      flex: 1,
    },
    rowScrollContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    // ── Outfit grid ─────────────────────────────────────────────────────────
    gridScroll: {
      flex: 1,
    },
    gridContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.md,
      gap: spacing.sm,
    },
    // ── Shared card styles ───────────────────────────────────────────────────
    itemCard: {
      width: cellSize,
      height: cellSize,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.gray200,
    },
    itemCardRow: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.gray200,
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    itemImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.gray200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeButton: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.white,
      borderRadius: 10,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    // ── Category shortcut ────────────────────────────────────────────────────
    categoryCard: {
      width: cellSize,
      height: cellSize,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    categoryCardRow: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    categoryCardSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    categoryPlusIcon: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: colors.white,
      borderRadius: 10,
    },
    plusIconOverlay: {
      padding: 2,
    },
  });
