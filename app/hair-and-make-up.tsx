/**
 * Hair & Make-Up Presets Screen
 * Single-page flow with preview, inline editor, and lightbox.
 * All state and business logic lives in useHairAndMakeup hook.
 */

import React from 'react';
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import {
  PillButton,
  EdgePeekSlider,
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
  HeaderTabPill,
} from '@/components/shared';
import HeadshotSlideItem from '@/components/headshots/HeadshotSlideItem';
import { HeaderTitlePillRow } from '@/components/shared/layout';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';
import {
  useHairAndMakeup,
} from '@/hooks/headshot';
import {
  ACCESSORY_SUBCATEGORIES,
  JEWELLERY_SUBCATEGORIES,
  ADVANCED_FIELDS,
} from '@/hooks/headshot/useHairAndMakeup';
import CreatorBar from '@/components/shared/CreatorBar';
import HeadshotCreatorContainer from '@/components/headshots/HeadshotCreatorContainer';
import HeadshotPromptSettings from '@/components/headshots/HeadshotPromptSettings';
import HairLengthSlider from '@/components/headshots/HairLengthSlider';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useRouter } from 'expo-router';
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';
import { createCommonStyles } from '@/styles/commonStyles';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

const { spacing, borderRadius, typography, shadows } = theme;
const INFO_ICON_SIZE = 16;
const SCREEN_WIDTH = Dimensions.get('window').width;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


/** Approximate fill colors for hair-color preset pills. */
const HAIR_COLOR_SWATCHES: Record<string, string | string[]> = {
  // Natural
  'color-black':            '#1a1a1a',
  'color-dark-brown':       '#3b2213',
  'color-medium-brown':     '#6b3a2a',
  'color-light-brown':      '#8b5e3c',
  'color-dirty-blonde':     '#b59a6e',
  'color-golden-blonde':    '#d4a84b',
  'color-platinum-blonde':  '#e8dcc8',
  'color-strawberry-blonde':'#c8836a',
  'color-auburn':           '#7b3019',
  'color-copper-red':       '#b7452a',
  'color-ginger':           '#d46a38',
  'color-silver-grey':      '#a8a8a8',
  'color-white':            '#f0ede8',
  // Dyed
  'dyed-jet-black':         '#0a0a0a',
  'dyed-burgundy':          '#6b1c3a',
  'dyed-cherry-red':        '#9b1b30',
  'dyed-bright-red':        '#d62020',
  'dyed-rose-gold':         '#c9908a',
  'dyed-pastel-pink':       '#f2b5c8',
  'dyed-hot-pink':          '#e0308a',
  'dyed-lavender':          '#b19cd9',
  'dyed-purple':            '#7b2d8e',
  'dyed-blue':              '#2a5fcc',
  'dyed-teal-green':        '#2a9d8f',
  'dyed-peach':             '#f4a87d',
  'dyed-silver':            '#c0c0c0',
  'dyed-ombre':             ['#3b2213', '#d4a84b'],
  'dyed-balayage':          ['#6b3a2a', '#c8a96e'],
  'dyed-highlights':        ['#6b3a2a', '#e8dcc8'],
  'dyed-split':             ['#1a1a1a', '#e8dcc8'],
};

/** Returns true when white text is needed on a given hex background. */
function needsLightTextOnColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance (perceived brightness)
  return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
}

export default function HairAndMakeUpScreen() {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const styles = createStyles(colors);
  const commonStyles = createCommonStyles(colors);
  const state = useHairAndMakeup();

  const presetGridGap = spacing.sm;
  const presetTileSize = (windowWidth - 2 * spacing.lg - 2 * spacing.sm - 3 * presetGridGap) / 4;
  const isFocused = useIsFocused();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const baseHeadshots = React.useMemo(
    () =>
      [...state.allHeadshots].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [state.allHeadshots]
  );
  const headshots = React.useMemo(() => {
    const selfieItem = state.selfieImageId
      ? { id: state.selfieImageId, url: state.selfieImageUrl || null }
      : null;
    const filtered = baseHeadshots.filter((item) => item.id !== state.selfieImageId);
    return selfieItem ? [selfieItem, ...filtered] : filtered;
  }, [baseHeadshots, state.selfieImageId, state.selfieImageUrl]);

  // Hair length slider: extract options and find selected ID
  const hairLengthOptions = React.useMemo(() => {
    const section = state.quickTabHairPresets?.sections[0];
    return section?.options.map((o) => ({ id: o.id, title: o.title })) ?? [];
  }, [state.quickTabHairPresets]);

  const selectedHairLengthId = React.useMemo(() => {
    const ids = new Set(hairLengthOptions.map((o) => o.id));
    return state.selectedIds.find((id) => ids.has(id)) ?? null;
  }, [hairLengthOptions, state.selectedIds]);

  const [editModalVisible, setEditModalVisible] = React.useState(false);

  const handleEditTabChange = React.useCallback(
    (tab: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      state.setEditTab(tab as any);
      setEditModalVisible(true);
    },
    [state.setEditTab],
  );

  const handleHeadshotPress = (item: { id: string; url: string | null }) => {
    state.handleHeadshotSelect(item);
    state.setPageTab('mirror');
  };
  const activeFaceIndex = React.useMemo(() => {
    if (headshots.length === 0) return 0;
    const index = headshots.findIndex((item) => item.id === state.previewImageId);
    return index >= 0 ? index : 0;
  }, [headshots, state.previewImageId]);

  // Keep a ref for activeFaceIndex so renderSliderItem stays referentially
  // stable across swipes. FlatList re-renders items via extraData instead.
  const activeFaceIndexRef = React.useRef(activeFaceIndex);
  activeFaceIndexRef.current = activeFaceIndex;

  const headshotKeyExtractor = React.useCallback(
    (item: { id: string; url: string | null }) => item.id,
    [],
  );

  const handleSliderIndexChange = React.useCallback(
    (nextIndex: number) => {
      const next = headshots[nextIndex];
      if (next) {
        state.handleSwipeIndexChange(next);
      }
    },
    [headshots, state.handleSwipeIndexChange],
  );

  const handleMenuPress = React.useCallback(
    () => state.setShowFaceMenu(true),
    [state.setShowFaceMenu],
  );

  const handleEdgeSwipeStart = React.useCallback(() => {
    if (!state.isStyleDisabled) {
      state.handlePickCamera();
    }
  }, [state.isStyleDisabled, state.handlePickCamera]);

  const { setTabBarOpacity } = useFloatingTabBar();

  // Hide/show tab bar based on creator mode
  React.useEffect(() => {
    if (!isFocused) {
      setTabBarOpacity(1);
    } else if (state.hasSelections) {
      setTabBarOpacity(0);
    } else {
      setTabBarOpacity(1);
    }
  }, [isFocused, state.hasSelections, setTabBarOpacity]);

  // Restore tab bar on unmount
  React.useEffect(() => {
    return () => setTabBarOpacity(1);
  }, [setTabBarOpacity]);

  const cameraSwipe = useEdgeSwipe({
    direction: 'left',
    onSwipe: handleEdgeSwipeStart,
    enabled:
      isFocused &&
      !state.isStyleDisabled &&
      !state.lightboxVisible &&
      !state.infoModalVisible &&
      !state.policyModalVisible &&
      !state.showFaceMenu &&
      !state.isDrawMode,
  });

  const renderSliderItem = React.useCallback(
    ({ item, index }: { item: { id: string; url: string | null }; index: number }) => (
      <HeadshotSlideItem
        item={item}
        isActive={index === activeFaceIndexRef.current}
        onPreviewPress={state.handlePreviewPress}
        onMenuPress={handleMenuPress}
        generating={state.generating}
        generateOverlayOpacity={state.generateOverlayOpacity}
        previewIsGenerated={state.previewIsGenerated}
        onRestoreSelfie={state.handleRestoreSelfie}
        isStyleDisabled={state.isStyleDisabled}
        drawingEnabled={state.isDrawMode}
        currentColor={state.currentDrawColor}
        drawingCanvasRef={state.drawingCanvasRef}
      />
    ),
    [state.handlePreviewPress, handleMenuPress, state.generating, state.generateOverlayOpacity, state.previewIsGenerated, state.handleRestoreSelfie, state.isStyleDisabled, state.isDrawMode, state.currentDrawColor, state.drawingCanvasRef],
  );

  const renderHeadshotGridItem = ({ item }: { item: { id: string; url: string | null } }) => (
    <TouchableOpacity
      style={postGridStyles.gridItem}
      onPress={() => handleHeadshotPress(item)}
      activeOpacity={0.85}
    >
      {item.url ? (
        <ExpoImage
          source={{ uri: item.url }}
          style={postGridStyles.gridImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.headshotGridPlaceholder}>
          <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <PanGestureHandler enabled={cameraSwipe.enabled} onGestureEvent={cameraSwipe.onGestureEvent}>
      <View style={commonStyles.container}>
      <HeaderTitlePillRow
        title="Hair & Make-Up"
        onCamera={state.handlePickCamera}
        onNotifications={() => router.push('/notifications' as any)}
        onProfile={() => router.push('/profile' as any)}
        avatarUri={state.headshotImageUrl}
        avatarInitials={state.profileInitials}
        unreadCount={unreadCount}
        cameraDisabled={state.isStyleDisabled}
        centerSlot={
          <HeaderTabPill
            pills={[
              { id: 'grid', label: 'Grid', icon: 'grid-outline' },
              { id: 'mirror', label: 'My Mirror', icon: 'person-circle-outline' },
              { id: 'following', label: 'Following', icon: 'people-outline' },
              { id: 'inspiration', label: 'Inspiration', icon: 'sparkles-outline' },
            ]}
            activeId={state.pageTab}
            onPress={(id) => state.setPageTab(id as 'grid' | 'mirror' | 'following' | 'inspiration')}
          />
        }
      />

      {/* Following / Inspiration placeholder */}
      {(state.pageTab === 'following' || state.pageTab === 'inspiration') && (
        <View style={styles.emptyTabContainer}>
          <Ionicons
            name={state.pageTab === 'following' ? 'people-outline' : 'sparkles-outline'}
            size={48}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyTabText}>
            {state.pageTab === 'following' ? 'Following' : 'Inspiration'} coming soon
          </Text>
        </View>
      )}

      {/* Grid tab: show only image grid */}
      {state.pageTab === 'grid' && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PostGrid
            data={state.allHeadshots}
            keyExtractor={(item) => item.id}
            renderItem={renderHeadshotGridItem}
            scrollEnabled={false}
          />
        </ScrollView>
      )}

      {state.pageTab === 'mirror' && (
        <>
          {/* Tab pills row: below header, above image slider */}
          <View style={styles.pillRowStack}>
            <View style={styles.tabPills}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tabPillsRow}>
                  <PillButton
                    label="Quick"
                    icon="flash-outline"
                    selected={state.editTab === 'quick'}
                    onPress={() => handleEditTabChange('quick')}
                    size="medium"
                    variant="default"
                    layout="vertical"
                  />
                  <PillButton
                    label="Hair"
                    icon="cut-outline"
                    selected={state.editTab === 'hair'}
                    onPress={() => handleEditTabChange('hair')}
                    size="medium"
                    variant="default"
                    layout="vertical"
                  />
                  <PillButton
                    label="Make-Up"
                    icon="color-palette-outline"
                    selected={state.editTab === 'makeup'}
                    onPress={() => handleEditTabChange('makeup')}
                    size="medium"
                    variant="default"
                    layout="vertical"
                  />
                  <PillButton
                    label="Accessories"
                    icon="glasses-outline"
                    selected={state.editTab === 'accessories'}
                    onPress={() => handleEditTabChange('accessories')}
                    size="medium"
                    variant="default"
                    layout="vertical"
                  />
                  <PillButton
                    label="Jewellery"
                    icon="diamond-outline"
                    selected={state.editTab === 'jewellery'}
                    onPress={() => handleEditTabChange('jewellery')}
                    size="medium"
                    variant="default"
                    layout="vertical"
                  />
                  <PillButton
                    label="Advanced"
                    icon="options-outline"
                    selected={state.editTab === 'advanced'}
                    onPress={() => handleEditTabChange('advanced')}
                    size="medium"
                    variant="default"
                    layout="vertical"
                  />
                </View>
              </ScrollView>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              state.hasSelections && { paddingBottom: spacing.massive + 140 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Image slider then prompt details */}
            <View
              style={[
                styles.facePreviewSection,
                commonStyles.sectionTopPadding,
              ]}
            >
              {headshots.length > 0 ? (
                <EdgePeekSlider
                  data={headshots}
                  keyExtractor={headshotKeyExtractor}
                  itemWidthRatio={0.78}
                  aspectRatio={3 / 4}
                  gap={2}
                  initialIndex={activeFaceIndex}
                  activeIndex={activeFaceIndex}
                  extraData={activeFaceIndex}
                  enableHaptics
                  edgeSwipeEnabled={false}
                  onIndexChange={handleSliderIndexChange}
                  renderItem={renderSliderItem}
                />
              ) : (
                <View style={styles.faceEmptyCard}>
                  <TouchableOpacity
                    style={styles.placeholder}
                    onPress={state.handlePickCamera}
                    disabled={state.isStyleDisabled}
                  >
                    <Ionicons name="camera-outline" size={42} color={colors.textSecondary} />
                    <Text style={styles.placeholderText}>Tap to open camera</Text>
                  </TouchableOpacity>
                </View>
              )}
              {state.previewHasImage && Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[
                    styles.drawModeButton,
                    state.isDrawMode && styles.drawModeButtonActive,
                  ]}
                  onPress={() => state.setIsDrawMode((prev) => !prev)}
                  accessibilityLabel={state.isDrawMode ? 'Exit draw mode' : 'Enter draw mode'}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={16}
                    color={state.isDrawMode ? colors.textLight : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.drawModeButtonLabel,
                      state.isDrawMode && styles.drawModeButtonLabelActive,
                    ]}
                  >
                    {state.isDrawMode ? 'Drawing' : 'Draw'}
                  </Text>
                </TouchableOpacity>
              )}
              <HeadshotPromptSettings variation={state.activeImageVariation} />
            </View>
          </ScrollView>

          {/* Edit tab content modal */}
          <Modal
            visible={editModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setEditModalVisible(false)}
          >
            <View style={styles.editModalOverlay}>
              <View style={styles.editModalCard}>
                <View style={styles.editModalHeader}>
                  <Text style={styles.editModalTitle}>
                    {state.editTab === 'quick' && 'Quick'}
                    {state.editTab === 'hair' && 'Hair'}
                    {state.editTab === 'makeup' && 'Make-Up'}
                    {state.editTab === 'accessories' && 'Accessories'}
                    {state.editTab === 'jewellery' && 'Jewellery'}
                    {state.editTab === 'advanced' && 'Advanced'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.editModalScroll}
                  contentContainerStyle={styles.editModalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Accessories: subcategory row — same styling as Hair/Make-up category row */}
                  {state.editTab === 'accessories' && (
                    <View style={styles.categoryPills}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.categoryPillsRow}>
                          {ACCESSORY_SUBCATEGORIES.map((sub) => (
                            <PillButton
                              key={sub.id}
                              label={sub.name}
                              selected={state.accessorySubcategory === sub.id}
                              onPress={() => state.setAccessorySubcategory(
                                state.accessorySubcategory === sub.id ? null : sub.id
                              )}
                              size="medium"
                              variant="default"
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                  {/* Jewellery: subcategory row — same styling as Hair/Make-up category row */}
                  {state.editTab === 'jewellery' && (
                    <View style={styles.categoryPills}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.categoryPillsRow}>
                          {JEWELLERY_SUBCATEGORIES.map((sub) => (
                            <PillButton
                              key={sub.id}
                              label={sub.name}
                              selected={state.jewellerySubcategory === sub.id}
                              onPress={() => state.setJewellerySubcategory(
                                state.jewellerySubcategory === sub.id ? null : sub.id
                              )}
                              size="medium"
                              variant="default"
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                  {/* Category pills — only for hair/makeup tabs */}
                  {state.editTab !== 'accessories' && state.editTab !== 'jewellery' && state.editTab !== 'advanced' && state.categoryPills.length > 0 && (
                    <View style={styles.categoryPills}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.categoryPillsRow}>
                          <PillButton
                            label="Quick"
                            selected={state.isCustomCategory}
                            onPress={() => state.setActiveCategoryId('custom')}
                            size="medium"
                            variant="default"
                          />
                          {state.categoryPills.map((category) => (
                            <PillButton
                              key={category.id}
                              label={state.formatCategoryLabel(category.title)}
                              selected={state.activeCategory?.id === category.id}
                              onPress={() => state.setActiveCategoryId(category.id)}
                              size="medium"
                              variant="default"
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {(state.isCustomCategory || state.activeCategory) && (
          <>
            <View
              style={[
                styles.categoryCard,
                commonStyles.sectionHorizontalPadding,
                commonStyles.sectionTopPadding,
              ]}
            >
              {state.isCustomCategory ? (
                <>
                  {/* Quick / custom tab: inline presets */}
                  {state.editTab === 'quick' ? (
                    <>
                      {/* Quick tab: hair length slider + major-aesthetics */}
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionLabel}>Hair Length</Text>
                        <HairLengthSlider
                          options={hairLengthOptions}
                          selectedId={selectedHairLengthId}
                          onSelect={(id) => state.toggleSelection(id)}
                        />
                      </View>
                      {state.quickTabMakeupPresets?.sections.map((section) => (
                        <View key={section.id} style={styles.sectionBlock}>
                          <Text style={styles.sectionLabel}>Makeup</Text>
                          <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                            {section.options.map((option) => {
                              const isSelected = state.selectedIds.includes(option.id);
                              return (
                                <View
                                  key={option.id}
                                  style={{ width: presetTileSize, height: presetTileSize }}
                                >
                                  <TouchableOpacity
                                    style={[styles.presetGridTile, isSelected && styles.presetGridTileSelected]}
                                    onPress={() => state.toggleSelection(option.id)}
                                    activeOpacity={0.85}
                                  >
                                    <View style={styles.presetGridTileTitleArea}>
                                      <Text
                                        numberOfLines={2}
                                        style={[
                                          styles.presetGridTileText,
                                          isSelected && styles.presetGridTileTextSelected,
                                        ]}
                                      >
                                        {option.title}
                                      </Text>
                                    </View>
                                    <View style={styles.presetGridTileInfoRow}>
                                      <TouchableOpacity
                                        style={styles.presetGridTileInfoButton}
                                        onPress={(event) => {
                                          event.stopPropagation?.();
                                          state.handleInfoPress(option);
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <Ionicons
                                          name="information-circle-outline"
                                          size={INFO_ICON_SIZE}
                                          color={isSelected ? colors.textLight : colors.textSecondary}
                                        />
                                      </TouchableOpacity>
                                    </View>
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </>
                  ) : state.editTab === 'hair' ? (
                    /* Hair tab quick section: length slider */
                    <View style={styles.sectionBlock}>
                      <HairLengthSlider
                        options={hairLengthOptions}
                        selectedId={selectedHairLengthId}
                        onSelect={(id) => state.toggleSelection(id)}
                      />
                    </View>
                  ) : (
                    <>
                      {/* Makeup quick sub-tab presets */}
                      {state.quickTabPresets?.sections.map((section) => (
                        <View key={section.id} style={styles.sectionBlock}>
                          <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                            {section.options.map((option) => {
                              const isSelected = state.selectedIds.includes(option.id);
                              return (
                                <View
                                  key={option.id}
                                  style={{ width: presetTileSize, height: presetTileSize }}
                                >
                                  <TouchableOpacity
                                    style={[styles.presetGridTile, isSelected && styles.presetGridTileSelected]}
                                    onPress={() => state.toggleSelection(option.id)}
                                    activeOpacity={0.85}
                                  >
                                    <View style={styles.presetGridTileTitleArea}>
                                      <Text
                                        numberOfLines={2}
                                        style={[
                                          styles.presetGridTileText,
                                          isSelected && styles.presetGridTileTextSelected,
                                        ]}
                                      >
                                        {option.title}
                                      </Text>
                                    </View>
                                    <View style={styles.presetGridTileInfoRow}>
                                      <TouchableOpacity
                                        style={styles.presetGridTileInfoButton}
                                        onPress={(event) => {
                                          event.stopPropagation?.();
                                          state.handleInfoPress(option);
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <Ionicons
                                          name="information-circle-outline"
                                          size={INFO_ICON_SIZE}
                                          color={isSelected ? colors.textLight : colors.textSecondary}
                                        />
                                      </TouchableOpacity>
                                    </View>
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                  {/* Custom description */}
                  <View style={styles.customHeader}>
                    <Text style={styles.customHint}>{state.customDescriptionCopy}</Text>
                    <TouchableOpacity
                      style={styles.infoIconButton}
                      onPress={() => state.setInfoModalVisible(true)}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.customInput}
                    placeholder={state.customPlaceholder}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    value={state.customDescription}
                    onChangeText={state.setCustomDescription}
                  />
                </>
              ) : (
                  state.activeCategory?.sections.map((section) => (
                    <View key={section.id} style={styles.sectionBlock}>
                      {state.activeCategory!.sections.length > 1 && (
                        <Text style={styles.sectionLabel}>{section.title}</Text>
                      )}
                      <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                        {section.options.map((option) => {
                          const isSelected = state.selectedIds.includes(option.id);
                          return (
                            <View
                              key={option.id}
                              style={{ width: presetTileSize, height: presetTileSize }}
                            >
                              <TouchableOpacity
                                style={[styles.presetGridTile, isSelected && styles.presetGridTileSelected]}
                                onPress={() => state.toggleSelection(option.id)}
                                activeOpacity={0.85}
                              >
                                <View style={styles.presetGridTileTitleArea}>
                                  <Text
                                    numberOfLines={2}
                                    style={[
                                      styles.presetGridTileText,
                                      isSelected && styles.presetGridTileTextSelected,
                                    ]}
                                  >
                                    {option.title}
                                  </Text>
                                </View>
                                <View style={styles.presetGridTileInfoRow}>
                                  <TouchableOpacity
                                    style={styles.presetGridTileInfoButton}
                                    onPress={(event) => {
                                      event.stopPropagation?.();
                                      state.handleInfoPress(option);
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons
                                      name="information-circle-outline"
                                      size={INFO_ICON_SIZE}
                                      color={isSelected ? colors.textLight : colors.textSecondary}
                                    />
                                  </TouchableOpacity>
                                </View>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </View>

            {/* Hair Color — always visible when hair or quick tab is active */}
            {state.hairColorCategory && (
              <View
                style={[
                  styles.categoryCard,
                  commonStyles.sectionHorizontalPadding,
                  commonStyles.sectionTopPadding,
                ]}
              >
                {state.hairColorCategory.sections.map((section) => (
                  <View key={section.id} style={styles.sectionBlock}>
                    {state.hairColorCategory!.sections.length > 1 && (
                      <Text style={styles.sectionLabel}>{section.title}</Text>
                    )}
                    <View style={[styles.presetGrid, { gap: presetGridGap }]}>
                      {section.options.map((option) => {
                        const isSelected = state.selectedIds.includes(option.id);
                        const swatch = HAIR_COLOR_SWATCHES[option.id];
                        const isDualColor = Array.isArray(swatch);
                        const needsLightText = swatch ? needsLightTextOnColor(isDualColor ? swatch[0] : swatch) : false;
                        return (
                          <View
                            key={option.id}
                            style={{ width: presetTileSize, height: presetTileSize }}
                          >
                            <TouchableOpacity
                              style={[
                                styles.colorPillGridTile,
                                swatch && !isDualColor && { backgroundColor: swatch as string },
                                isSelected && styles.colorPillSelected,
                              ]}
                              onPress={() => state.toggleSelection(option.id)}
                              activeOpacity={0.85}
                            >
                              {/* Dual-color angled background */}
                              {isDualColor && (
                                <View style={[styles.colorPillDualBg, { backgroundColor: swatch[1] }]}>
                                  <View style={[styles.colorPillDualLeft, { backgroundColor: swatch[0] }]} />
                                </View>
                              )}
                              <View style={styles.colorPillGridTileTitleArea}>
                                <Text
                                  numberOfLines={2}
                                  style={[
                                    styles.colorPillText,
                                    (needsLightText || isSelected) && styles.colorPillTextLight,
                                    { textAlign: 'center' },
                                  ]}
                                >
                                  {option.title}
                                </Text>
                              </View>
                              <View style={styles.colorPillGridTileInfoRow}>
                                <TouchableOpacity
                                  style={styles.colorPillGridTileInfoButton}
                                  onPress={(event) => {
                                    event.stopPropagation?.();
                                    state.handleInfoPress(option);
                                  }}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons
                                    name="information-circle-outline"
                                    size={INFO_ICON_SIZE}
                                    color={(needsLightText || isSelected) ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
                                  />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Accessories tab content */}
        {state.editTab === 'accessories' && (
          <View style={[styles.categoryCard, commonStyles.sectionHorizontalPadding, commonStyles.sectionTopPadding]}>
            {state.accessorySubcategory ? (
              <View style={styles.emptySubcategoryContainer}>
                <Ionicons name="glasses-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptySubcategoryText}>
                  {ACCESSORY_SUBCATEGORIES.find((s) => s.id === state.accessorySubcategory)?.name} presets coming soon
                </Text>
              </View>
            ) : (
              <View style={styles.emptySubcategoryContainer}>
                <Text style={styles.emptySubcategoryText}>Select a subcategory above</Text>
              </View>
            )}
          </View>
        )}

        {/* Jewellery tab content */}
        {state.editTab === 'jewellery' && (
          <View style={[styles.categoryCard, commonStyles.sectionHorizontalPadding, commonStyles.sectionTopPadding]}>
            {state.jewellerySubcategory ? (
              <View style={styles.emptySubcategoryContainer}>
                <Ionicons name="diamond-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptySubcategoryText}>
                  {JEWELLERY_SUBCATEGORIES.find((s) => s.id === state.jewellerySubcategory)?.name} presets coming soon
                </Text>
              </View>
            ) : (
              <View style={styles.emptySubcategoryContainer}>
                <Text style={styles.emptySubcategoryText}>Select a subcategory above</Text>
              </View>
            )}
          </View>
        )}

        {/* Advanced tab content */}
        {state.editTab === 'advanced' && (
          <View style={[styles.categoryCard, commonStyles.sectionHorizontalPadding, commonStyles.sectionTopPadding]}>
            {ADVANCED_FIELDS.map((field) => (
              <View key={field.id} style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>{field.label}</Text>
                <TextInput
                  style={styles.advancedInput}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  value={state.advancedFields[field.id] || ''}
                  onChangeText={(text) => state.setAdvancedField(field.id, text)}
                />
              </View>
            ))}
          </View>
        )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}

      {state.pageTab === 'mirror' && <DropdownMenuModal
        visible={state.showFaceMenu}
        onClose={() => state.setShowFaceMenu(false)}
        topOffset={120}
        align="right"
      >
        <DropdownMenuItem
          label="Set as Active Headshot"
          icon="checkmark-circle-outline"
          onPress={() => {
            state.setShowFaceMenu(false);
            state.handleSetAsActiveHeadshot();
          }}
          disabled={!state.previewImageId}
        />
        <View style={dropdownMenuStyles.menuDivider} />
        <DropdownMenuItem
          label="Share"
          icon="share-outline"
          onPress={() => {
            state.setShowFaceMenu(false);
            state.handleSharePreview();
          }}
          disabled={!state.canShare}
        />
        <View style={dropdownMenuStyles.menuDivider} />
        <DropdownMenuItem
          label="Delete"
          icon="trash-outline"
          onPress={() => {
            state.setShowFaceMenu(false);
            state.handleDeletePreviewImage();
          }}
          danger
          disabled={!state.showDeletePreview}
        />
      </DropdownMenuModal>}

      <PolicyBlockModal
        visible={state.policyModalVisible}
        message={state.policyMessage}
        onClose={() => state.setPolicyModalVisible(false)}
      />

      <ErrorModal
        visible={!!state.error && !state.generating}
        message={state.error || undefined}
        onClose={() => state.setError(null)}
      />

      <Modal
        visible={state.infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => state.setInfoModalVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>How It Works</Text>
              <TouchableOpacity onPress={() => state.setInfoModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoModalText}>
              Choose presets below to build your hair and make-up direction.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={state.lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => state.setLightboxVisible(false)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxCloseButton}
            onPress={() => state.setLightboxVisible(false)}
          >
            <Ionicons name="close" size={22} color={colors.textLight} />
          </TouchableOpacity>
          {state.lightboxUrl && (
            <ExpoImage
              source={{ uri: state.lightboxUrl }}
              style={styles.lightboxImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>

      {/* Headshot Creator Bar & Container */}
      {state.pageTab === 'mirror' && state.hasSelections && (
        <>
          <HeadshotCreatorContainer
            selections={state.creatorSelections}
            onRemoveSelection={state.handleRemoveCreatorSelection}
          />
          <CreatorBar
            label={`Generate${state.creatorSelections.length > 0 ? ` (${state.creatorSelections.length})` : ''}`}
            onGenerate={state.handleGenerateVariation}
            isGenerating={state.generating}
            showOptionsButton={false}
          />
        </>
      )}
      </View>
    </PanGestureHandler>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  emptyTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.massive,
    gap: spacing.md,
  },
  emptyTabText: {
    fontSize: typography.fontSize.base,
    color: colors.textTertiary,
  },
  content: {
    paddingBottom: spacing.massive,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  facePreviewSection: {
    width: '100%',
    gap: spacing.md,
  },
  faceEmptyCard: {
    width: '100%',
    aspectRatio: 3 / 4,
    alignSelf: 'center',
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: {
    alignSelf: 'center',
    width: '100%',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  previewNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  previewNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewNavButtonDisabled: {
    opacity: 0.4,
  },
  previewRailRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  previewCore: {
    flex: 1,
    minWidth: 0,
  },
  railColumnLeft: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  railStack: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  railColumnRight: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  railSlot: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageButton: {
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  railButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  placeholderText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mediaButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  generateButton: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  infoIconButton: {
    padding: spacing.xs,
  },
  tabPills: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  viewToggleButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  pillRowStack: {
    gap: 0,
  },
  tabPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryPills: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 0,
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  presetGridTile: {
    flex: 1,
    flexDirection: 'column',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  presetGridTileTitleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  presetGridTileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  presetGridTileInfoButton: {
    padding: spacing.xs,
  },
  presetGridTileSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetGridTileText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  presetGridTileTextSelected: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs * 2 + INFO_ICON_SIZE,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
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
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs * 2 + INFO_ICON_SIZE,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  colorPillGridTile: {
    flex: 1,
    flexDirection: 'column',
    borderRadius: borderRadius.round,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 0,
  },
  colorPillGridTileTitleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    zIndex: 1,
  },
  colorPillGridTileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    zIndex: 1,
  },
  colorPillGridTileInfoButton: {
    padding: spacing.xs,
  },
  colorPillSelected: {
    borderColor: colors.textLight,
  },
  colorPillText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    zIndex: 1,
  },
  colorPillTextLight: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  colorPillDualBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  colorPillDualLeft: {
    position: 'absolute',
    top: -10,
    left: -10,
    bottom: -10,
    width: '58%',
    transform: [{ rotate: '-6deg' }],
  },
  infoButton: {
    position: 'absolute',
    right: spacing.xs,
    top: '50%',
    transform: [{ translateY: -INFO_ICON_SIZE / 2 }],
    zIndex: 1,
  },
  headshotGridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  customInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  editModalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  editModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  editModalScroll: {
    flexGrow: 0,
    maxHeight: '85%',
  },
  editModalScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.massive,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  infoModalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  infoModalText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  historySection: {
    gap: spacing.md,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyLoadingText: {
    color: colors.textSecondary,
  },
  variationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  variationCard: {
    width: 86,
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  variationCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  variationImage: {
    width: '100%',
    height: '100%',
  },
  variationPending: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  variationStatusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  savedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  savedBadgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  variationMenuTrigger: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  variationMenuOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  variationMenuCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  variationMenuTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  variationMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  variationMenuButtonDestructive: {
    backgroundColor: colors.backgroundSecondary,
  },
  variationMenuButtonCancel: {
    justifyContent: 'center',
  },
  variationMenuButtonDisabled: {
    opacity: 0.5,
  },
  variationMenuButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.black,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  // Expandable pill (accessories/jewellery)
  expandedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.black,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  expandedLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  subcategoryScroll: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  // Accessories/Jewellery empty states
  emptySubcategoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptySubcategoryText: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // Draw mode toggle button
  drawModeButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
  },
  drawModeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  drawModeButtonLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  drawModeButtonLabelActive: {
    color: colors.textLight,
  },
  // Advanced tab text fields
  advancedInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.sm,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
});
