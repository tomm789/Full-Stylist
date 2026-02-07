/**
 * MyOutfitFeedCard Component
 * Feed-style card for a user's own outfit with schedule status.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import SocialActionBar from '@/components/outfits/SocialActionBar';
import { useSocialEngagement } from '@/hooks/outfits/useSocialEngagement';
import { OutfitWithRating } from '@/lib/outfits';
import { formatTimestamp } from '@/utils/formatUtils';
import { OutfitScheduleStatus, ScheduleInfo } from '@/types/outfits';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

type MyOutfitFeedCardProps = {
  outfit: OutfitWithRating;
  imageUrl: string | null;
  imageLoading: boolean;
  scheduleInfo: ScheduleInfo;
  userId: string | undefined;
  onOpenMenu: (outfitId: string) => void;
  onPressOutfit: (outfitId: string) => void;
  onComment: (outfitId: string) => void;
  onSchedulePress: (outfitId: string) => void;
};

const MyOutfitFeedCard = React.memo(
  ({
    outfit,
    imageUrl,
    imageLoading,
    scheduleInfo,
    userId,
    onOpenMenu,
    onPressOutfit,
    onComment,
    onSchedulePress,
  }: MyOutfitFeedCardProps) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
    const engagement = useSocialEngagement('outfit', outfit.id, userId);

    return (
      <View style={styles.myFeedCard}>
        <View style={styles.feedHeader}>
          <TouchableOpacity
            style={styles.feedHeaderLeft}
            onPress={() => onSchedulePress(outfit.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={scheduleInfo.status ? colors.textPrimary : colors.textTertiary}
            />
            <Text
              style={[
                styles.feedHeaderTitle,
                !scheduleInfo.status && styles.feedHeaderTitleMuted,
              ]}
            >
              {scheduleInfo.statusLabel}
            </Text>
          </TouchableOpacity>
          <View style={styles.feedHeaderRight}>
            <Text style={styles.feedHeaderTimestamp}>
              {formatTimestamp(outfit.created_at)}
            </Text>
            <TouchableOpacity
              style={styles.feedHeaderMenu}
              onPress={() => onOpenMenu(outfit.id)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => onPressOutfit(outfit.id)}>
          {imageLoading ? (
            <View style={styles.myFeedImagePlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : imageUrl ? (
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.myFeedImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.myFeedImagePlaceholder}>
              <Ionicons name="shirt-outline" size={28} color={colors.textTertiary} />
            </View>
          )}
        </TouchableOpacity>

        <SocialActionBar
          liked={engagement.liked}
          likeCount={engagement.likeCount}
          saved={engagement.saved}
          saveCount={engagement.saveCount}
          commentCount={engagement.commentCount}
          onLike={engagement.toggleLike}
          onSave={engagement.toggleSave}
          onComment={() => onComment(outfit.id)}
        />
      </View>
    );
  }
);

MyOutfitFeedCard.displayName = 'MyOutfitFeedCard';

export default MyOutfitFeedCard;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  myFeedCard: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingVertical: spacing.sm + spacing.xs / 4,
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  feedHeaderTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  feedHeaderTitleMuted: {
    color: colors.textTertiary,
  },
  feedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedHeaderTimestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  feedHeaderMenu: {
    padding: spacing.xs / 2,
  },
  myFeedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  myFeedImagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
