/**
 * OutfitCreatorPanel Component
 * Unified bottom panel replacing OutfitCreatorContainer + OutfitCreatorCanvas.
 *
 * Collapsed: drag handle + horizontal scroll row (selected items & category shortcuts).
 * Expanded:  drag handle + tab bar + "Outfit" grid or "Advanced" canvas.
 *
 * Height transitions use LayoutAnimation (triggered by the caller before changing isExpanded).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder, WardrobeCategoryIcon } from '@/components/shared';
import HeadshotSelectorCard from './HeadshotSelectorCard';
import OutfitCreatorCanvas from './OutfitCreatorCanvas';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory } from '@/lib/wardrobe';
import type {
  OutfitCanvasItemLayout,
  OutfitCanvasLayoutMap,
  OutfitCanvasTrimMap,
  OutfitCanvasTrimStatus,
} from '@/lib/outfits/canvasLayout';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { spacing, borderRadius, typography } = theme;

export const PANEL_HANDLE_AREA_HEIGHT = 24;
const TAB_BAR_HEIGHT = 44;
const ROW_CONTENT_HEIGHT = 76; // paddingVertical(8) + card(60) + paddingVertical(8)
export const PANEL_COLLAPSED_HEIGHT = PANEL_HANDLE_AREA_HEIGHT + ROW_CONTENT_HEIGHT;

type TabId = 'outfit' | 'advanced';

interface SelectedItem {
  id: string;
  imageUrl: string | null;
  trimStatus: OutfitCanvasTrimStatus;
}

export interface OutfitCreatorPanelProps {
  // Layout
  isExpanded: boolean;
  onToggleExpanded: () => void;
  expandedHeight: number;
  bottomOffset: number;
  zIndex?: number;

  // Selected items & categories
  selectedItems: SelectedItem[];
  categories: WardrobeCategory[];
  onRemoveItem: (itemId: string) => void;
  onCategorySelect: (categoryId: string) => void;
  selectedCategoryId?: string | null;
  selectedCategoryIds?: Set<string>;
  currentHeadshotUrl: string | null;
  onHeadshotSelect: () => void;

  // Canvas
  isPreparing: boolean;
  layoutMap: OutfitCanvasLayoutMap;
  trimMap: OutfitCanvasTrimMap;
  onLayoutChange: (itemId: string, next: OutfitCanvasItemLayout) => void;
  onBringForward: (itemId: string) => void;
  onSendBackward: (itemId: string) => void;
}

const createStyles = (colors: ThemeColors, cellSize: number) =>
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

export default function OutfitCreatorPanel({
  isExpanded,
  onToggleExpanded,
  expandedHeight,
  bottomOffset,
  zIndex = 13,
  selectedItems,
  categories,
  onRemoveItem,
  onCategorySelect,
  selectedCategoryId,
  selectedCategoryIds,
  currentHeadshotUrl,
  onHeadshotSelect,
  isPreparing,
  layoutMap,
  trimMap,
  onLayoutChange,
  onBringForward,
  onSendBackward,
}: OutfitCreatorPanelProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  // Cell size for the 2-column grid:
  // panel margins: spacing.lg * 2 = 32
  // panel inner padding: spacing.md * 2 = 24
  // column gap: spacing.sm = 8
  const cellSize = Math.floor((screenWidth - 32 - 2 - 24 - 8) / 2);

  const styles = createStyles(colors, cellSize);

  const [activeTab, setActiveTab] = useState<TabId>('outfit');

  // Reset to Outfit tab each time the panel collapses
  useEffect(() => {
    if (!isExpanded) {
      setActiveTab('outfit');
    }
  }, [isExpanded]);

  // Mount slide-up animation
  const mountAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [mountAnim, opacityAnim]);

  const availableCategories = categories.filter(
    (cat) => !selectedCategoryIds?.has(cat.id),
  );

  const panelHeight = isExpanded ? expandedHeight : PANEL_COLLAPSED_HEIGHT;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          bottom: bottomOffset,
          height: panelHeight,
          zIndex,
          opacity: opacityAnim,
          transform: [{ translateY: mountAnim }],
        },
      ]}
    >
      {/* ── Drag handle ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.handleArea}
        onPress={onToggleExpanded}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 40, right: 40 }}
      >
        <View style={styles.handle} />
      </TouchableOpacity>

      {isExpanded ? (
        <>
          {/* ── Tab bar ────────────────────────────────────────────────── */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'outfit' && styles.tabActive]}
              onPress={() => setActiveTab('outfit')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'outfit' && styles.tabTextActive]}>
                Outfit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'advanced' && styles.tabActive]}
              onPress={() => setActiveTab('advanced')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'advanced' && styles.tabTextActive]}>
                Advanced
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Tab content ────────────────────────────────────────────── */}
          <View style={styles.contentArea}>
            {activeTab === 'outfit' ? (
              <ScrollView
                style={styles.gridScroll}
                showsVerticalScrollIndicator={false}
              >
              <View style={styles.gridContent}>
                {/* Headshot */}
                <View style={styles.itemCard}>
                  <HeadshotSelectorCard
                    headshotUrl={currentHeadshotUrl}
                    onSelect={onHeadshotSelect}
                  />
                </View>

                {/* Selected items */}
                {selectedItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.itemImagePlaceholder}>
                        <ImagePlaceholder text="" iconSize={24} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => onRemoveItem(item.id)}
                      hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Category shortcuts */}
                {availableCategories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        isSelected && styles.categoryCardSelected,
                      ]}
                      onPress={() => onCategorySelect(category.id)}
                      activeOpacity={0.7}
                    >
                      <WardrobeCategoryIcon
                        categoryName={category.name}
                        size={28}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <View style={styles.categoryPlusIcon}>
                        <Ionicons
                          name="add-circle"
                          size={16}
                          color={colors.black}
                          style={styles.plusIconOverlay}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              </ScrollView>
            ) : (
              <OutfitCreatorCanvas
                visible={true}
                isPreparing={isPreparing}
                selectedItems={selectedItems}
                layoutMap={layoutMap}
                trimMap={trimMap}
                onLayoutChange={onLayoutChange}
                onBringForward={onBringForward}
                onSendBackward={onSendBackward}
              />
            )}
          </View>
        </>
      ) : (
        /* ── Collapsed: horizontal row ─────────────────────────────────── */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.rowScroll}
          contentContainerStyle={styles.rowScrollContent}
        >
          <HeadshotSelectorCard
            headshotUrl={currentHeadshotUrl}
            onSelect={onHeadshotSelect}
          />

          {selectedItems.map((item) => (
            <View key={item.id} style={styles.itemCardRow}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <ImagePlaceholder text="" iconSize={20} />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveItem(item.id)}
                hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          {availableCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCardRow,
                  isSelected && styles.categoryCardSelected,
                ]}
                onPress={() => onCategorySelect(category.id)}
                activeOpacity={0.7}
              >
                <WardrobeCategoryIcon
                  categoryName={category.name}
                  size={22}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <View style={styles.categoryPlusIcon}>
                  <Ionicons
                    name="add-circle"
                    size={14}
                    color={colors.black}
                    style={styles.plusIconOverlay}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
}
