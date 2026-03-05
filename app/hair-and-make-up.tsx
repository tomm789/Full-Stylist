/**
 * Hair & Make-Up Presets Screen
 * Single-page flow with preview, inline editor, and lightbox.
 * All state and business logic lives in useHairAndMakeup hook.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { HeaderTabPill } from '@/components/shared';
import type { ThumbnailItem } from '@/components/shared';
import { FullscreenImageModal } from '@/components/shared/modals';
import HeadshotSocialTab from '@/components/headshots/HeadshotSocialTab';
import DrawModeInline from '@/components/headshots/DrawModeInline';
import MirrorTabContent from '@/components/headshots/MirrorTabContent';
import MirrorCategoryPillsRow from '@/components/headshots/MirrorCategoryPillsRow';
import ShareToFeedModal from '@/components/headshots/ShareToFeedModal';
import { HeaderTitlePillRow } from '@/components/shared/layout';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import PolicyBlockModal from '@/components/shared/modals/PolicyBlockModal';
import ErrorModal from '@/components/shared/modals/ErrorModal';
import { useHairAndMakeup, type EditTab } from '@/hooks/headshot';
import { useApplyLook, getPendingApplyLookSnapshot } from '@/hooks/headshot/useApplyLook';
import { LoadingOverlay } from '@/components/shared/loading';
import { GENERATION_MESSAGES } from '@/constants/generationMessages';
import CreatorBar from '@/components/shared/CreatorBar';
import HeadshotCreatorContainer from '@/components/headshots/HeadshotCreatorContainer';
import FaceMenuModal from '@/components/hair-and-makeup/FaceMenuModal';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useRouter } from 'expo-router';
import { theme } from '@/styles';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { useEdgeSwipe, useHideHeaderOnScroll } from '@/hooks/ui';
import { useKeyboardInsets } from '@/hooks/ui/useKeyboardInsets';

const { spacing } = theme;

export default function HairAndMakeUpScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const state = useHairAndMakeup();
  const insets = useSafeAreaInsets();
  const { variationId, returnToWardrobe, baseHeadshotId } = useLocalSearchParams<{ variationId?: string; returnToWardrobe?: string; baseHeadshotId?: string }>();
  const { applyLook } = useApplyLook();
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [mirrorEditTabRequest, setMirrorEditTabRequest] = React.useState<EditTab | null>(null);
  const returnToWardrobeRef = React.useRef(returnToWardrobe === '1');

  const { setTabBarOpacity, setTabBarDimmed } = useFloatingTabBar();
  const { keyboardVisible, bottomInset: kbBottomInset } = useKeyboardInsets();

  const {
    headerHeight,
    headerAnimatedStyle,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll: handleHeaderScroll,
    setHeaderVisible,
    resetScroll,
  } = useHideHeaderOnScroll({
    onVisibilityChange: (visible, timing) => {
      setTabBarDimmed(!visible, { hideDuration: timing.hideDuration, showDuration: timing.showDuration });
    },
  });

  // If redirected from wardrobe (returnToWardrobe=1), open on the mirror tab immediately
  React.useEffect(() => {
    if (returnToWardrobe === '1') {
      state.setPageTab('mirror');
    }
  }, []);

  // On mount: if a variationId URL param was set (by Apply Look), populate presets
  const appliedVariationRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!variationId || appliedVariationRef.current === variationId) return;
    appliedVariationRef.current = variationId;
    const snapshot = getPendingApplyLookSnapshot();
    if (snapshot) {
      state.applySnapshot(snapshot);
      state.setPageTab('mirror');
    }
  }, [variationId]);

  // On mount: if a baseHeadshotId URL param was set (by "Open in Mirror" from view page),
  // select that headshot and switch to the mirror tab
  const appliedBaseHeadshotRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!baseHeadshotId || appliedBaseHeadshotRef.current === baseHeadshotId) return;
    const headshot = state.allHeadshots.find((h) => h.id === baseHeadshotId);
    if (headshot) {
      appliedBaseHeadshotRef.current = baseHeadshotId;
      state.handleHeadshotSelect(headshot);
      state.setPageTab('mirror');
    }
  }, [baseHeadshotId, state.allHeadshots]);

  // Bottom padding to allow content to scroll above the floating tab bar or CreatorBar
  const floatingBarClearance = spacing.xl + 60 + spacing.md + insets.bottom;

  const isFocused = useIsFocused();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  // Hair length slider: extract options and find selected ID
  const hairLengthOptions = React.useMemo(() => {
    const section = state.quickTabHairPresets?.sections[0];
    return section?.options.map((o) => ({ id: o.id, title: o.title })) ?? [];
  }, [state.quickTabHairPresets]);

  const selectedHairLengthId = React.useMemo(() => {
    const ids = new Set(hairLengthOptions.map((o) => o.id));
    return state.selectedIds.find((id) => ids.has(id)) ?? null;
  }, [hairLengthOptions, state.selectedIds]);

  // ── Thumbnail strip data for generation variations ──────────────────────────
  const activeVariationId = React.useMemo(() => {
    if (state.previewGenerationIndex < 0) return null;
    return state.completedVariations[state.previewGenerationIndex]?.id ?? null;
  }, [state.previewGenerationIndex, state.completedVariations]);

  const headshotThumbnailItems = React.useMemo<ThumbnailItem[]>(() => {
    if (!state.sessionActiveThisVisit) return [];

    const referenceCard: ThumbnailItem = {
      id: '__selfie_ref__',
      imageUrl: state.selfieImageUrl,
      isActive: state.previewSource === 'selfie' || state.previewGenerationIndex === -1,
      isSaved: true,
      status: 'complete',
    };

    const variationCards = state.completedVariations.map((v) => ({
      id: v.id,
      imageUrl: state.variationUrls.get(v.image_id!) ?? null,
      isActive: v.id === activeVariationId,
      isSaved: v.is_saved,
      status: v.status as ThumbnailItem['status'],
    }));

    return [referenceCard, ...variationCards];
  }, [state.sessionActiveThisVisit, state.selfieImageUrl, state.previewSource, state.previewGenerationIndex, state.completedVariations, state.variationUrls, activeVariationId]);

  const handleHeadshotThumbnailSelect = React.useCallback((id: string) => {
    if (id === '__selfie_ref__') {
      state.handleRestoreSelfie();
      return;
    }
    const variation = state.completedVariations.find((v) => v.id === id);
    if (variation) state.setPreviewFromVariation(variation);
  }, [state.completedVariations, state.setPreviewFromVariation, state.handleRestoreSelfie]);

  // Timer-based message rotation for generating overlay
  const [generatingMessage, setGeneratingMessage] = useState('');
  useEffect(() => {
    if (!state.generating) return;
    const steps = GENERATION_MESSAGES.hairAndMakeup.progressSteps;
    const interval = GENERATION_MESSAGES.hairAndMakeup.MIN_DURATION_MS / steps.length;
    let stepIndex = 0;
    setGeneratingMessage(steps[0]);
    const timer = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < steps.length) {
        setGeneratingMessage(steps[stepIndex]);
      } else {
        clearInterval(timer);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [state.generating]);

  const handleEdgeSwipeStart = React.useCallback(() => {
    if (!state.isStyleDisabled) {
      state.handlePickCamera();
    }
  }, [state.isStyleDisabled, state.handlePickCamera]);

  const isFullscreenDraw = state.pageTab === 'mirror' && state.isDrawModeOpen;
  const isGenerateActive = state.pageTab === 'mirror' && state.hasSelections && !state.isDrawModeOpen;

  // Hide/show tab bar based on creator mode
  React.useEffect(() => {
    if (!isFocused) {
      setTabBarOpacity(1);
      setTabBarDimmed(false);
    } else if (state.isDrawModeOpen || isGenerateActive) {
      setTabBarOpacity(0);
    } else {
      setTabBarOpacity(1);
    }
  }, [isFocused, state.isDrawModeOpen, isGenerateActive, setTabBarOpacity, setTabBarDimmed]);

  // Restore tab bar on unmount
  React.useEffect(() => {
    return () => {
      setTabBarOpacity(1);
      setTabBarDimmed(false);
    };
  }, [setTabBarOpacity, setTabBarDimmed]);

  // Reset header + scroll tracking when tab changes
  React.useEffect(() => {
    setHeaderVisible(true);
    resetScroll();
  }, [state.pageTab]);

  // Mirror tab: offset-based hide/show (no delta tracking — prevents bounce loop on short content)
  const handleMirrorScroll = React.useCallback((event: any) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    if (offsetY <= 0) {
      setHeaderVisible(true);
      return;
    }
    if (offsetY > 20) {
      setHeaderVisible(false);
    }
  }, [setHeaderVisible]);

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
      !state.isDrawModeOpen,
  });

  const handleMirrorCategorySelect = React.useCallback((tab: EditTab) => {
    state.setEditTab(tab);
    setMirrorEditTabRequest(tab);
  }, [state.setEditTab]);

  const handleHeadshotPress = (item: { id: string; url: string | null }) => {
    const allIds = state.allHeadshots.map((h) => h.id).join(',');
    router.push(`/headshot/${item.id}/view?headshotIds=${encodeURIComponent(allIds)}` as any);
  };
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
        {!isFullscreenDraw && (
          <Animated.View
            style={[styles.headerContainer, { height: headerHeight }, headerAnimatedStyle]}
            pointerEvents={uiHidden ? 'none' : 'auto'}
          >
            <View onLayout={handleHeaderLayout}>
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
            </View>
          </Animated.View>
        )}

        {!isFullscreenDraw && state.pageTab === 'mirror' && (
          <View style={headerHeight !== undefined && headerHeight === 0 ? { paddingTop: insets.top } : undefined}>
            <MirrorCategoryPillsRow
              editTab={state.editTab}
              onSelectTab={handleMirrorCategorySelect}
            />
          </View>
        )}

        {/* Following / Inspiration feeds */}
        {!isFullscreenDraw && (state.pageTab === 'following' || state.pageTab === 'inspiration') && (
          <HeadshotSocialTab
            activeTab={state.pageTab as 'following' | 'inspiration'}
            currentUserId={state.userId ?? undefined}
            onApplyLook={applyLook}
          />
        )}

        {/* Grid tab: show only image grid */}
        {!isFullscreenDraw && state.pageTab === 'grid' && (
          <PostGrid
            data={state.allHeadshots}
            keyExtractor={(item) => item.id}
            renderItem={renderHeadshotGridItem}
            contentContainerStyle={{ paddingBottom: floatingBarClearance }}
            onScroll={handleHeaderScroll}
            scrollEventThrottle={16}
          />
        )}

        {isFullscreenDraw && (
          <DrawModeInline
            onClose={() => state.setIsDrawModeOpen(false)}
            previewImageUrl={state.previewImageUrl}
            baseImageId={state.baseImageId}
            userId={state.userId}
            creatorSelections={state.creatorSelections}
            hasSelections={state.hasSelections}
            generating={state.generating}
            onGenerate={state.handleGenerateVariation}
            onRemoveSelection={state.handleRemoveCreatorSelection}
            topInset={insets.top}
            drawingCanvasRef={state.drawingCanvasRef}
            keyboardVisible={keyboardVisible}
            keyboardBottomInset={kbBottomInset}
          />
        )}

        {!isFullscreenDraw && state.pageTab === 'mirror' && (
          <MirrorTabContent
            previewImageUrl={state.previewImageUrl}
            onPreviewPress={state.handlePreviewPress}
            onMenuPress={() => state.setShowFaceMenu(true)}
            generateOverlayStyle={state.generateOverlayStyle}
            previewIsGenerated={state.previewIsGenerated}
            onRestoreSelfie={state.handleRestoreSelfie}
            generating={state.generating}
            previewHasImage={state.previewHasImage}
            activeImageVariation={state.activeImageVariation}
            isStyleDisabled={state.isStyleDisabled}
            setIsDrawModeOpen={state.setIsDrawModeOpen}
            handlePickCamera={state.handlePickCamera}
            hasSelections={state.hasSelections}
            editTab={state.editTab}
            setEditTab={state.setEditTab}
            categoryPills={state.categoryPills}
            isCustomCategory={state.isCustomCategory}
            activeCategory={state.activeCategory}
            quickTabHairPresets={state.quickTabHairPresets}
            quickTabMakeupPresets={state.quickTabMakeupPresets}
            quickTabPresets={state.quickTabPresets}
            hairColorCategory={state.hairColorCategory}
            selectedIds={state.selectedIds}
            toggleSelection={state.toggleSelection}
            handleInfoPress={state.handleInfoPress}
            setActiveCategoryId={state.setActiveCategoryId}
            formatCategoryLabel={state.formatCategoryLabel}
            customDescriptionCopy={state.customDescriptionCopy}
            customDescription={state.customDescription}
            setCustomDescription={state.setCustomDescription}
            setInfoModalVisible={state.setInfoModalVisible}
            customPlaceholder={state.customPlaceholder}
            accessorySubcategory={state.accessorySubcategory}
            setAccessorySubcategory={state.setAccessorySubcategory}
            jewellerySubcategory={state.jewellerySubcategory}
            setJewellerySubcategory={state.setJewellerySubcategory}
            advancedFields={state.advancedFields}
            setAdvancedField={state.setAdvancedField}
            hairLengthOptions={hairLengthOptions}
            selectedHairLengthId={selectedHairLengthId}
            floatingBarClearance={floatingBarClearance}
            onScroll={handleMirrorScroll}
            scrollEventThrottle={16}
            editTabRequest={mirrorEditTabRequest}
            onEditTabRequestHandled={() => setMirrorEditTabRequest(null)}
            thumbnailItems={headshotThumbnailItems}
            onThumbnailSelect={handleHeadshotThumbnailSelect}
            thumbnailCanNavigateBack={state.canNavigateBack}
            thumbnailCanNavigateForward={state.canNavigateForward}
            onThumbnailNavigateBack={() => state.handleNavigateGeneration('back')}
            onThumbnailNavigateForward={() => state.handleNavigateGeneration('forward')}
            onThumbnailSave={state.handleSaveVariation}
            showThumbnailSaveIndicator={true}
            onSessionDone={state.handleDoneSession}
            sessionActive={state.sessionActiveThisVisit}
          />
        )}

        {!isFullscreenDraw && state.pageTab === 'mirror' && (
          <FaceMenuModal
            visible={state.showFaceMenu}
            onClose={() => state.setShowFaceMenu(false)}
            onSetAsActiveHeadshot={async () => {
              await state.handleSetAsActiveHeadshot();
              if (returnToWardrobeRef.current) {
                router.push('/(tabs)/wardrobe' as any);
              }
            }}
            onShareToFeed={() => setShowShareModal(true)}
            onShare={state.handleSharePreview}
            onDelete={state.handleDeletePreviewImage}
            canShare={state.canShare}
            showDeletePreview={state.showDeletePreview}
            previewImageId={state.previewImageId}
          />
        )}

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

        <FullscreenImageModal
          visible={state.lightboxVisible}
          images={state.lightboxUrl ? [state.lightboxUrl] : []}
          onClose={() => state.setLightboxVisible(false)}
        />

        <ShareToFeedModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShare={async (caption) => {
            setShowShareModal(false);
            await state.handleShareToFeed(caption);
          }}
        />

        {/* Headshot Creator Bar & Container — hidden when draw mode is active (DrawModeInline has its own) */}
        {isGenerateActive && (
          <>
            <HeadshotCreatorContainer
              selections={state.creatorSelections}
              onRemoveSelection={state.handleRemoveCreatorSelection}
              bottomOffset={insets.bottom}
            />
            <CreatorBar
              label={`Generate${state.creatorSelections.length > 0 ? ` (${state.creatorSelections.length})` : ''}`}
              onGenerate={state.handleGenerateVariation}
              isGenerating={state.generating}
              showOptionsButton={false}
              bottomOffset={insets.bottom}
            />
          </>
        )}

        <LoadingOverlay visible={state.generating} message={generatingMessage} />
      </View>
    </PanGestureHandler>
  );
}

