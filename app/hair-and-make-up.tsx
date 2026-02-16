/**
 * Hair & Make-Up Presets Screen
 * Single-page flow with preview, inline editor, and lightbox.
 * All state and business logic lives in useHairAndMakeup hook.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import {
  PillButton,
  EdgePeekSlider,
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared';
import HeadshotSlideItem from '@/components/headshots/HeadshotSlideItem';
import { HeaderTitlePillRow } from '@/components/shared/layout';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';
import { useHairAndMakeup } from '@/hooks/headshot';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useRouter } from 'expo-router';
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';
import { createCommonStyles } from '@/styles/commonStyles';

const { spacing, borderRadius, typography, shadows } = theme;
const INFO_ICON_SIZE = 16;

export default function HairAndMakeUpScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const commonStyles = createCommonStyles(colors);
  const state = useHairAndMakeup();
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

  const handleHeadshotPress = (item: { id: string; url: string | null }) => {
    state.handleHeadshotSelect(item);
    state.setActiveView('face');
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
      />
    ),
    [state.handlePreviewPress, handleMenuPress, state.generating, state.generateOverlayOpacity, state.previewIsGenerated, state.handleRestoreSelfie, state.isStyleDisabled],
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
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.pillRowStack}>
            <View style={styles.tabPills}>
              <View style={styles.tabRow}>
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[
                      styles.viewToggleButton,
                      state.showHeadshotGrid && styles.viewToggleButtonActive,
                    ]}
                    onPress={() => state.setActiveView('grid')}
                    accessibilityLabel="Show grid view"
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={state.showHeadshotGrid ? colors.textLight : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewToggleButton,
                      state.showFacePreview && styles.viewToggleButtonActive,
                    ]}
                    onPress={() => {
                      if (state.previewSource !== 'headshot' && state.previewSource !== 'variation') {
                        state.handleRestoreSelfie();
                      }
                      state.setActiveView('face');
                    }}
                    accessibilityLabel="Show face view"
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={18}
                      color={state.showFacePreview ? colors.textLight : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.tabPillsRow}>
                    <PillButton
                      label="Hair"
                      icon="cut-outline"
                      selected={state.activeView === 'hair'}
                      onPress={() => {
                        state.setLastPresetTab('hair');
                        state.setActiveView('hair');
                      }}
                      size="medium"
                      variant="default"
                    />
                    <PillButton
                      label="Make-Up"
                      icon="color-palette-outline"
                      selected={state.activeView === 'makeup'}
                      onPress={() => {
                        state.setLastPresetTab('makeup');
                        state.setActiveView('makeup');
                      }}
                      size="medium"
                      variant="default"
                    />
                  </View>
                </ScrollView>
              </View>
            </View>

            {state.isPresetView && state.presets.length > 0 && (
              <View style={styles.categoryPills}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryPillsRow}>
                    <PillButton
                      label="Custom"
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
          </View>
        </View>

        {state.showFacePreview && (
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
                edgeSwipeEnabled={Boolean(state.selfieImageId) && activeFaceIndex === 0}
                onEdgeSwipeStart={handleEdgeSwipeStart}
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
          </View>
        )}

        {state.showHeadshotGrid && (
          <PostGrid
            data={state.allHeadshots}
            keyExtractor={(item) => item.id}
            renderItem={renderHeadshotGridItem}
            scrollEnabled={false}
          />
        )}

        {state.isPresetView && (
          <>
            {(state.isCustomCategory || state.activeCategory) && (
              <View
                style={[
                  styles.categoryCard,
                  commonStyles.sectionHorizontalPadding,
                  commonStyles.sectionTopPadding,
                ]}
              >
                {state.isCustomCategory ? (
                  <>
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
                      <View style={styles.pillRow}>
                        {section.options.map((option) => {
                          const isSelected = state.selectedIds.includes(option.id);
                          return (
                            <TouchableOpacity
                              key={option.id}
                              style={[styles.pill, isSelected && styles.pillSelected]}
                              onPress={() => state.toggleSelection(option.id)}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.pillText,
                                  isSelected && styles.pillTextSelected,
                                ]}
                              >
                                {option.title}
                              </Text>
                              <TouchableOpacity
                                style={styles.infoButton}
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
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <DropdownMenuModal
        visible={state.showFaceMenu}
        onClose={() => state.setShowFaceMenu(false)}
        topOffset={120}
        align="right"
      >
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
      </DropdownMenuModal>

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
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  infoButton: {
    position: 'absolute',
    right: spacing.xs,
    top: '50%',
    transform: [{ translateY: -INFO_ICON_SIZE / 2 }],
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
});
