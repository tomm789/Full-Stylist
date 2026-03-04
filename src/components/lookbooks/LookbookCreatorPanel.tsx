/**
 * LookbookCreatorPanel Component
 * Expandable bottom panel for lookbook creation.
 *
 * Collapsed: horizontal drag-to-reorder row of 60×60 thumbnails.
 * Expanded:  header row + 3-column portrait-ratio drag-to-reorder grid.
 *
 * Models the same expand/collapse UX as OutfitCreatorPanel.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { haptics } from '@/utils/haptics';
import { ImagePlaceholder } from '@/components/shared';
import { GRID_IMAGE_PROPS } from '@/lib/images';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { spacing, borderRadius, typography } = theme;

export const LOOKBOOK_PANEL_HANDLE_AREA_HEIGHT = 24;
const ROW_CONTENT_HEIGHT = 76; // paddingVertical(8) + card(60) + paddingVertical(8)
export const LOOKBOOK_PANEL_COLLAPSED_HEIGHT = LOOKBOOK_PANEL_HANDLE_AREA_HEIGHT + ROW_CONTENT_HEIGHT;
const HEADER_ROW_HEIGHT = 44;

type OutfitItem = { id: string; imageUrl: string | null };

export interface LookbookCreatorPanelProps {
  outfits: OutfitItem[];
  onReorder: (reordered: OutfitItem[]) => void;
  onRemoveOutfit: (outfitId: string) => void;
  onExit: () => void;
  bottomOffset: number;
}

const createStyles = (colors: ThemeColors, cellWidth: number) => {
  const cellHeight = Math.floor(cellWidth * (4 / 3));
  return StyleSheet.create({
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
      overflow: 'hidden',
    },
    handleArea: {
      height: LOOKBOOK_PANEL_HANDLE_AREA_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
    },
    // ── Expanded header ──────────────────────────────────────────────────────
    headerRow: {
      height: HEADER_ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    headerLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    headerCount: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    // ── Grid cell ────────────────────────────────────────────────────────────
    gridCell: {
      width: cellWidth,
      height: cellHeight,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.gray200,
    },
    // ── Collapsed row card ───────────────────────────────────────────────────
    rowCard: {
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
    // ── Horizontal row container style ───────────────────────────────────────
    rowScrollContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    // ── Grid container style ─────────────────────────────────────────────────
    gridScrollContent: {
      padding: spacing.md,
    },
    columnWrapper: {
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
  });
};

export default function LookbookCreatorPanel({
  outfits,
  onReorder,
  onRemoveOutfit,
  onExit,
  bottomOffset,
}: LookbookCreatorPanelProps) {
  const colors = useThemeColors();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [isExpanded, setIsExpanded] = useState(false);

  // Panel inner width (screenWidth minus left/right margins and border)
  const panelWidth = screenWidth - 2 * spacing.lg - 2;
  // Cell width for 3-column grid: (panelWidth - padding*2 - gap*2) / 3
  const cellWidth = Math.floor((panelWidth - spacing.md * 2 - spacing.sm * 2) / 3);
  const cellHeight = Math.floor(cellWidth * (4 / 3));

  const styles = useMemo(() => createStyles(colors, cellWidth), [colors, cellWidth]);

  // Expanded height: show ~2 rows of cells comfortably, capped at 60% of screen
  const expandedHeight = Math.min(
    LOOKBOOK_PANEL_HANDLE_AREA_HEIGHT + HEADER_ROW_HEIGHT + (cellHeight + spacing.sm) * 2 + spacing.md * 2,
    Math.floor(screenHeight * 0.6),
  );

  // Mount slide-up animation
  const mountAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [mountAnim, opacityAnim]);

  const handleToggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const panelHeight = isExpanded ? expandedHeight : LOOKBOOK_PANEL_COLLAPSED_HEIGHT;

  // ── Collapsed row item ───────────────────────────────────────────────────
  const renderRowItem = ({ item, drag, isActive }: RenderItemParams<OutfitItem>) => (
    <TouchableOpacity
      onLongPress={() => { haptics.medium(); drag(); }}
      style={[styles.rowCard, isActive && { opacity: 0.7 }]}
      activeOpacity={0.9}
    >
      {item.imageUrl ? (
        <Image
          {...GRID_IMAGE_PROPS}
          source={{ uri: item.imageUrl }}
          style={styles.itemImage}
          recyclingKey={item.id}
        />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <ImagePlaceholder text="" iconSize={20} />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemoveOutfit(item.id)}
        hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <Ionicons name="close-circle" size={18} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ── Expanded grid item ───────────────────────────────────────────────────
  const renderGridItem = ({ item, drag, isActive }: RenderItemParams<OutfitItem>) => (
    <TouchableOpacity
      onLongPress={() => { haptics.medium(); drag(); }}
      style={[styles.gridCell, isActive && { opacity: 0.7 }]}
      activeOpacity={0.9}
    >
      {item.imageUrl ? (
        <Image
          {...GRID_IMAGE_PROPS}
          source={{ uri: item.imageUrl }}
          style={styles.itemImage}
          recyclingKey={item.id}
        />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <ImagePlaceholder text="" iconSize={24} />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemoveOutfit(item.id)}
        hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          bottom: bottomOffset,
          height: panelHeight,
          opacity: opacityAnim,
          transform: [{ translateY: mountAnim }],
        },
      ]}
    >
      {/* ── Drag handle ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.handleArea}
        onPress={handleToggleExpanded}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 40, right: 40 }}
      >
        <View style={styles.handle} />
      </TouchableOpacity>

      {isExpanded ? (
        <>
          {/* ── Header row ───────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View style={styles.headerLabelRow}>
              <Text style={styles.headerLabel}>Selected</Text>
              <Text style={styles.headerCount}>{outfits.length}</Text>
            </View>
            <TouchableOpacity
              onPress={onExit}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── 3-column portrait grid ────────────────────────────────────── */}
          <DraggableFlatList
            data={outfits}
            keyExtractor={(item) => item.id}
            renderItem={renderGridItem}
            onDragEnd={({ data }) => onReorder(data)}
            numColumns={3}
            contentContainerStyle={styles.gridScrollContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        /* ── Collapsed horizontal row ─────────────────────────────────── */
        <DraggableFlatList
          data={outfits}
          keyExtractor={(item) => item.id}
          renderItem={renderRowItem}
          onDragEnd={({ data }) => onReorder(data)}
          horizontal
          contentContainerStyle={styles.rowScrollContent}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}
