/**
 * OutfitCreatorPanel Component
 * Unified bottom panel replacing OutfitCreatorContainer + OutfitCreatorCanvas.
 *
 * Collapsed: drag handle + horizontal scroll row (selected items & category shortcuts).
 * Expanded:  drag handle + tab bar + "Outfit" grid or "Advanced" canvas.
 *
 * Height transitions use LayoutAnimation (triggered by the caller before changing isExpanded).
 *
 * Private sub-components PanelItemCard and PanelCategoryCard eliminate the ~130 lines of
 * duplication between the collapsed-row and expanded-grid rendering paths.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { WardrobeCategory } from '@/lib/wardrobe';
import type {
  OutfitCanvasItemLayout,
  OutfitCanvasLayoutMap,
  OutfitCanvasTrimMap,
} from '@/lib/outfits/canvasLayout';
import HeadshotSelectorCard from './HeadshotSelectorCard';
import OutfitCreatorCanvas from './OutfitCreatorCanvas';
import { PanelItemCard, PanelCategoryCard } from './PanelCards';
import type { SelectedItem } from './PanelCards';
import {
  createStyles,
  PANEL_HANDLE_AREA_HEIGHT,
  PANEL_COLLAPSED_HEIGHT,
} from './OutfitCreatorPanel.styles';

export { PANEL_HANDLE_AREA_HEIGHT, PANEL_COLLAPSED_HEIGHT } from './OutfitCreatorPanel.styles';
export type { SelectedItem } from './PanelCards';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabId = 'outfit' | 'advanced';

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

  const styles = useMemo(() => createStyles(colors, cellSize), [colors, cellSize]);

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
  }, []); // refs are stable — effect runs once on mount (O-15)

  const availableCategories = useMemo(
    () => categories.filter((cat) => !selectedCategoryIds?.has(cat.id)),
    [categories, selectedCategoryIds]
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
              <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
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
                    <PanelItemCard
                      key={item.id}
                      item={item}
                      onRemove={onRemoveItem}
                      cardStyle={styles.itemCard}
                      placeholderIconSize={24}
                      removeIconSize={20}
                      imageStyle={styles.itemImage}
                      placeholderStyle={styles.itemImagePlaceholder}
                      removeButtonStyle={styles.removeButton}
                      errorColor={colors.error}
                    />
                  ))}

                  {/* Category shortcuts */}
                  {availableCategories.map((category) => (
                    <PanelCategoryCard
                      key={category.id}
                      category={category}
                      isSelected={selectedCategoryId === category.id}
                      onPress={() => onCategorySelect(category.id)}
                      cardStyle={styles.categoryCard}
                      selectedStyle={styles.categoryCardSelected}
                      iconSize={28}
                      addIconSize={16}
                      primaryColor={colors.primary}
                      secondaryColor={colors.textSecondary}
                      blackColor={colors.black}
                      plusIconStyle={styles.categoryPlusIcon}
                      plusIconOverlayStyle={styles.plusIconOverlay}
                    />
                  ))}
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
            <PanelItemCard
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              cardStyle={styles.itemCardRow}
              placeholderIconSize={20}
              removeIconSize={18}
              imageStyle={styles.itemImage}
              placeholderStyle={styles.itemImagePlaceholder}
              removeButtonStyle={styles.removeButton}
              errorColor={colors.error}
            />
          ))}

          {availableCategories.map((category) => (
            <PanelCategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategoryId === category.id}
              onPress={() => onCategorySelect(category.id)}
              cardStyle={styles.categoryCardRow}
              selectedStyle={styles.categoryCardSelected}
              iconSize={22}
              addIconSize={14}
              primaryColor={colors.primary}
              secondaryColor={colors.textSecondary}
              blackColor={colors.black}
              plusIconStyle={styles.categoryPlusIcon}
              plusIconOverlayStyle={styles.plusIconOverlay}
            />
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}
