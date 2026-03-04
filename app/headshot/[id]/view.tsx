/**
 * Headshot View Screen
 * Full-screen headshot viewing with swipe navigation and bottom thumbnail slider.
 * Pattern follows outfits/[id]/view.tsx.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import {
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EdgePeekSlider } from '@/components/shared';
import HeadshotSlideItem from '@/components/headshots/HeadshotSlideItem';
import HeadshotPromptSettings from '@/components/headshots/HeadshotPromptSettings';
import ShareToFeedModal from '@/components/headshots/ShareToFeedModal';
import FaceMenuModal from '@/components/hairAndMakeup/FaceMenuModal';
import NavigationSlider from '@/components/wardrobe/NavigationSlider';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { FullscreenImageModal } from '@/components/shared/modals';
import { useHeadshotView } from '@/hooks/headshot/useHeadshotView';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from './view.styles';

// Static style for non-generating state (no overlay)
const ZERO_OVERLAY_STYLE = { opacity: 0 };

export default function HeadshotViewScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id, headshotIds } = useLocalSearchParams<{
    id: string;
    headshotIds?: string;
  }>();

  const state = useHeadshotView({ headshotId: id, headshotIds });

  const [showShareModal, setShowShareModal] = React.useState(false);

  // Keep a ref for currentIndex so renderSliderItem stays referentially stable
  const currentIndexRef = useRef(state.currentIndex);
  currentIndexRef.current = state.currentIndex;

  const headshotKeyExtractor = useCallback(
    (item: { id: string; url: string | null }) => item.id,
    [],
  );

  const handleMenuPress = useCallback(() => {
    state.setShowMenu(true);
  }, [state.setShowMenu]);

  // Open fullscreen modal directly with the item's URL (no async lookup needed)
  const openLightbox = useCallback(
    (url: string | null) => {
      if (url) {
        state.setLightboxUrl(url);
        state.setLightboxVisible(true);
      }
    },
    [state.setLightboxUrl, state.setLightboxVisible],
  );

  const renderSliderItem = useCallback(
    ({ item, index }: { item: { id: string; url: string | null }; index: number }) => (
      <HeadshotSlideItem
        item={item}
        isActive={index === currentIndexRef.current}
        onPreviewPress={() => openLightbox(item.url)}
        onMenuPress={handleMenuPress}
        generating={false}
        generateOverlayStyle={ZERO_OVERLAY_STYLE}
        previewIsGenerated={false}
        onRestoreSelfie={() => {}}
        isStyleDisabled={false}
      />
    ),
    [openLightbox, handleMenuPress],
  );

  return (
    <View style={styles.container}>
      {/* Header (non-overlay — content flows below it) */}
      <Header
        leftContent={
          <HeaderIconButton icon="chevron-back" onPress={state.handleBackPress} />
        }
        rightContent={
          <HeaderIconButton
            icon="ellipsis-vertical"
            onPress={() => state.setShowMenu(true)}
            accessibilityLabel="Open menu"
          />
        }
      />

      {/* Face Menu */}
      <FaceMenuModal
        visible={state.showMenu}
        onClose={() => state.setShowMenu(false)}
        onSetAsActiveHeadshot={async () => {
          await state.handleSetAsActiveHeadshot();
        }}
        onOpenInMirror={() => {
          state.setShowMenu(false);
          state.handleOpenInMirror();
        }}
        onEdit={() => {
          state.setShowMenu(false);
          state.handleEdit();
        }}
        onShareToFeed={() => setShowShareModal(true)}
        onShare={state.handleShare}
        onDelete={state.handleDelete}
        canShare={state.canShare}
        showDeletePreview={!!state.currentHeadshotId}
        previewImageId={state.currentHeadshotId}
      />

      {/* Scrollable content: Image slider + prompt settings */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Slider */}
        <View style={styles.sliderContainer}>
          {state.headshots.length > 0 && (
            <EdgePeekSlider
              data={state.headshots}
              keyExtractor={headshotKeyExtractor}
              itemWidthRatio={1}
              aspectRatio={3 / 4}
              gap={0}
              initialIndex={state.currentIndex}
              activeIndex={state.currentIndex}
              extraData={state.currentIndex}
              enableHaptics
              edgeSwipeEnabled={false}
              onIndexChange={state.handleSliderIndexChange}
              renderItem={renderSliderItem}
            />
          )}
        </View>

        {/* Prompt settings (presets + custom description used to generate) */}
        <HeadshotPromptSettings variation={state.activeVariation} />
      </ScrollView>

      {/* Bottom Navigation Slider */}
      <NavigationSlider
        items={state.navigationItems}
        currentItemId={state.currentHeadshotId ?? ''}
        onNavigate={state.navigateToHeadshot}
      />

      {/* Fullscreen Image Modal */}
      <FullscreenImageModal
        visible={state.lightboxVisible}
        images={state.lightboxUrl ? [state.lightboxUrl] : []}
        onClose={() => state.setLightboxVisible(false)}
      />

      {/* Share to Feed Modal */}
      <ShareToFeedModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={async (caption) => {
          setShowShareModal(false);
          // TODO: integrate with headshot share-to-feed action
        }}
      />
    </View>
  );
}
