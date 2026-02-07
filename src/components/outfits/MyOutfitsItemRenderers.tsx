/**
 * MyOutfitsItemRenderers
 * Helpers for rendering my outfits grid/feed items.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { OutfitWithRating } from '@/lib/outfits';
import { ScheduleInfo } from '@/types/outfits';
import { postGridStyles } from '@/components/social/PostGrid';
import MyOutfitFeedCard from './MyOutfitFeedCard';
import { colors, typography, spacing } from '@/styles';

type GridItemProps = {
  item: OutfitWithRating;
  imageUrl: string | null;
  imageLoading: boolean;
  scheduleInfo: ScheduleInfo;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: (outfitId: string, imageUrl?: string | null) => void;
  onOpenFeed: (outfitId: string) => void;
  onActivateSelection: () => void;
};

type FeedItemProps = {
  item: OutfitWithRating;
  imageUrl: string | null;
  imageLoading: boolean;
  scheduleInfo: ScheduleInfo;
  userId: string | undefined;
  onOpenMenu: (outfitId: string) => void;
  onPressOutfit: (outfitId: string) => void;
  onComment: (outfitId: string) => void;
  onSchedulePress: (outfitId: string) => void;
};

export function MyOutfitGridItem({
  item,
  imageUrl,
  imageLoading,
  scheduleInfo,
  isSelected,
  selectionMode,
  onSelect,
  onOpenFeed,
  onActivateSelection,
}: GridItemProps) {
  const handlePress = () => {
    if (selectionMode) {
      onSelect(item.id, imageUrl);
      return;
    }
    onOpenFeed(item.id);
  };

  const handleLongPress = () => {
    if (!selectionMode) {
      onActivateSelection();
    }
    onSelect(item.id, imageUrl);
  };

  return (
    <TouchableOpacity
      style={postGridStyles.gridItem}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      {imageLoading ? (
        <View style={[postGridStyles.gridImagePlaceholder, styles.gridImagePlaceholder]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={[postGridStyles.gridImage, styles.gridImage]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[postGridStyles.gridImagePlaceholder, styles.gridImagePlaceholder]}>
          <Ionicons name="shirt-outline" size={28} color={colors.textTertiary} />
        </View>
      )}
      <View style={postGridStyles.infoOverlay}>
        <Text style={styles.scheduleOverlayText} numberOfLines={1}>
          {scheduleInfo.overlayLabel}
        </Text>
      </View>
      {isSelected && (
        <View style={postGridStyles.selectionBadge}>
          <Text style={postGridStyles.selectionBadgeText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MyOutfitFeedItem({
  item,
  imageUrl,
  imageLoading,
  scheduleInfo,
  userId,
  onOpenMenu,
  onPressOutfit,
  onComment,
  onSchedulePress,
}: FeedItemProps) {
  return (
    <MyOutfitFeedCard
      outfit={item}
      imageUrl={imageUrl}
      imageLoading={imageLoading}
      scheduleInfo={scheduleInfo}
      userId={userId}
      onOpenMenu={onOpenMenu}
      onPressOutfit={onPressOutfit}
      onComment={onComment}
      onSchedulePress={onSchedulePress}
    />
  );
}

const styles = StyleSheet.create({
  gridImage: {
  },
  gridImagePlaceholder: {
  },
  scheduleOverlayText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
