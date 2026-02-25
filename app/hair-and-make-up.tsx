/**
 * Hair & Make-Up Presets Screen
 * Single-page flow with preview, inline editor, and lightbox.
 * All state and business logic lives in useHairAndMakeup hook.
 */

import React, { useMemo } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { HeaderTabPill } from '@/components/shared';
import HeadshotSocialTab from '@/components/headshots/HeadshotSocialTab';
import HeadshotSlideItem from '@/components/headshots/HeadshotSlideItem';
import DrawModeInline from '@/components/headshots/DrawModeInline';
import MirrorTabContent from '@/components/headshots/MirrorTabContent';
import ShareToFeedModal from '@/components/headshots/ShareToFeedModal';
import { HeaderTitlePillRow } from '@/components/shared/layout';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';
import { useHairAndMakeup } from '@/hooks/headshot';
import { useApplyLook, getPendingApplyLookSnapshot } from '@/hooks/headshot/useApplyLook';
import { useGenerationDialogAnimation } from '@/hooks/headshot/useGenerationDialogAnimation';
import CreatorBar from '@/components/shared/CreatorBar';
import HeadshotCreatorContainer from '@/components/headshots/HeadshotCreatorContainer';
import FaceMenuModal from '@/components/hairAndMakeup/FaceMenuModal';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useRouter } from 'expo-router';
import { theme } from '@/styles';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

const { spacing } = theme;

export default function HairAndMakeUpScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const commonStyles = createCommonStyles(colors);
  const state = useHairAndMakeup();
  const insets = useSafeAreaInsets();
  const { variationId, returnToWardrobe } = useLocalSearchParams<{ variationId?: string; returnToWardrobe?: string }>();
  const { applyLook } = useApplyLook();
  const [showShareModal, setShowShareModal] = React.useState(false);
  const returnToWardrobeRef = React.useRef(returnToWardrobe === '1');

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

  // Bottom padding to allow content to scroll above the floating tab bar or CreatorBar
  const floatingBarClearance = spacing.xl + 60 + spacing.md + insets.bottom;

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

  // Edit modal state lifted here so handleOpenCategoryEditor (from DrawModeInline) can open it
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const handleCloseEditModal = React.useCallback(() => {
    setEditModalVisible(false);
  }, []);

  const { dialogLine1Opacity, dialogLine2Opacity, dialogLine3Opacity, dialogLine4Opacity } =
    useGenerationDialogAnimation(state.generating);

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
    (item: { id: string; url: string | null }) => {
      state.handleSwipeIndexChange(item);
      state.setShowFaceMenu(true);
    },
    [state.handleSwipeIndexChange, state.setShowFaceMenu],
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
      !state.isDrawModeOpen,
  });

  const renderSliderItem = React.useCallback(
    ({ item, index }: { item: { id: string; url: string | null }; index: number }) => (
      <HeadshotSlideItem
        item={item}
        isActive={index === activeFaceIndexRef.current}
        onPreviewPress={state.handlePreviewPress}
        onMenuPress={() => handleMenuPress(item)}
        generating={state.generating}
        generateOverlayOpacity={state.generateOverlayOpacity}
        previewIsGenerated={state.previewIsGenerated}
        onRestoreSelfie={state.handleRestoreSelfie}
        isStyleDisabled={state.isStyleDisabled}
      />
    ),
    [state.handlePreviewPress, handleMenuPress, state.generating, state.generateOverlayOpacity, state.previewIsGenerated, state.handleRestoreSelfie, state.isStyleDisabled],
  );

  const handleHeadshotPress = (item: { id: string; url: string | null }) => {
    state.handleHeadshotSelect(item);
    state.setPageTab('mirror');
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

        {/* Following / Inspiration feeds */}
        {(state.pageTab === 'following' || state.pageTab === 'inspiration') && (
          <HeadshotSocialTab
            activeTab={state.pageTab as 'following' | 'inspiration'}
            currentUserId={state.userId ?? undefined}
            onApplyLook={applyLook}
          />
        )}

        {/* Grid tab: show only image grid */}
        {state.pageTab === 'grid' && (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: floatingBarClearance }]}
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

        {state.pageTab === 'mirror' && state.isDrawModeOpen && (
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
            drawingCanvasRef={state.drawingCanvasRef}
          />
        )}

        {state.pageTab === 'mirror' && !state.isDrawModeOpen && (
          <MirrorTabContent
            headshots={headshots}
            activeFaceIndex={activeFaceIndex}
            onIndexChange={handleSliderIndexChange}
            renderSliderItem={renderSliderItem}
            keyExtractor={headshotKeyExtractor}
            generating={state.generating}
            dialogLine1Opacity={dialogLine1Opacity}
            dialogLine2Opacity={dialogLine2Opacity}
            dialogLine3Opacity={dialogLine3Opacity}
            dialogLine4Opacity={dialogLine4Opacity}
            previewHasImage={state.previewHasImage}
            activeImageVariation={state.activeImageVariation}
            isStyleDisabled={state.isStyleDisabled}
            setIsDrawModeOpen={state.setIsDrawModeOpen}
            handlePickCamera={state.handlePickCamera}
            hasSelections={state.hasSelections}
            editModalVisible={editModalVisible}
            setEditModalVisible={setEditModalVisible}
            onEditModalClose={handleCloseEditModal}
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
          />
        )}

        {state.pageTab === 'mirror' && (
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

        <ShareToFeedModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShare={async (caption) => {
            setShowShareModal(false);
            await state.handleShareToFeed(caption);
          }}
        />

        {/* Headshot Creator Bar & Container — hidden when draw mode is active (DrawModeInline has its own) */}
        {state.pageTab === 'mirror' && state.hasSelections && !state.isDrawModeOpen && (
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
