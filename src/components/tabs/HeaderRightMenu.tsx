/**
 * HeaderRightMenu Component
 * Right header menu with notifications and profile menu
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenMenuModal } from '@/components/tabs';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export function HeaderRightMenu() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuOption = async (action: string) => {
    setShowMenu(false);

    switch (action) {
      case 'profile_headshots':
        router.push('/(tabs)/profile?tab=headshots' as any);
        break;
      case 'outfits':
        router.push('/(tabs)/outfits' as any);
        break;
      case 'outfits_explore':
        router.push('/(tabs)/outfits?tab=explore' as any);
        break;
      case 'outfits_following':
        router.push('/(tabs)/outfits?tab=following' as any);
        break;
      case 'lookbooks':
        router.push('/(tabs)/outfits/lookbooks' as any);
        break;
      case 'calendar':
        router.push('/(tabs)/calendar' as any);
        break;
      case 'wardrobe':
        router.push('/(tabs)/wardrobe' as any);
        break;
      case 'profile':
        router.push('/(tabs)/profile' as any);
        break;
      case 'search':
        router.push('/search' as any);
        break;
      case 'notifications':
        router.push('/notifications' as any);
        break;
      case 'settings':
        router.push('/account-settings' as any);
        break;
      case 'feedback':
        router.push('/feedback' as any);
        break;
      case 'hair_makeup':
        router.push('/hair-and-make-up' as any);
        break;
      case 'outfit_archive':
        router.push('/archive' as any);
        break;
      case 'logout':
        await signOut();
        router.replace('/');
        break;
    }
  };

  const gridItems = useMemo(
    () => [
      {
        key: 'outfits_explore',
        label: 'Explore',
        icon: 'compass-outline' as const,
        description: 'Discover new looks',
        keywords: ['discover', 'trending', 'inspire'],
        onPress: () => handleMenuOption('outfits_explore'),
      },
      {
        key: 'outfits_following',
        label: 'Following',
        icon: 'people-outline' as const,
        description: 'Outfits from people you follow',
        keywords: ['feed', 'friends', 'social'],
        onPress: () => handleMenuOption('outfits_following'),
      },
      {
        key: 'profile',
        label: 'Profile',
        icon: 'person-outline' as const,
        description: 'Your account and stats',
        keywords: ['account', 'stats', 'bio'],
        onPress: () => handleMenuOption('profile'),
      },
      {
        key: 'headshots',
        label: 'Headshots',
        icon: 'camera-outline' as const,
        description: 'Generate a new headshot',
        keywords: ['model', 'studio', 'selfie', 'portrait'],
        onPress: () => handleMenuOption('profile_headshots'),
      },
      {
        key: 'lookbooks',
        label: 'Lookbooks',
        icon: 'book-outline' as const,
        description: 'Highlights and personal lookbooks',
        keywords: ['highlights', 'collections'],
        onPress: () => handleMenuOption('lookbooks'),
      },
      {
        key: 'outfits',
        label: 'Outfits',
        icon: 'sparkles-outline' as const,
        description: 'Your saved and created outfits',
        keywords: ['looks', 'styling', 'saved'],
        onPress: () => handleMenuOption('outfits'),
      },
      {
        key: 'wardrobe',
        label: 'Wardrobe',
        icon: 'shirt-outline' as const,
        description: 'Browse items and collections',
        keywords: ['closet', 'items', 'clothes', 'collection'],
        onPress: () => handleMenuOption('wardrobe'),
      },
      {
        key: 'calendar',
        label: 'Calendar',
        icon: 'calendar-outline' as const,
        description: 'Plan and schedule outfits',
        keywords: ['schedule', 'plan', 'events', 'dates'],
        onPress: () => handleMenuOption('calendar'),
      },
    ],
    [handleMenuOption, router]
  );

  const actionItems = useMemo(
    () => [
      {
        key: 'feedback',
        label: 'Feedback',
        icon: 'chatbubbles-outline' as const,
        description: 'Share ideas and report issues',
        keywords: ['support', 'help', 'bug', 'idea'],
        onPress: () => handleMenuOption('feedback'),
      },
      {
        key: 'hair_makeup',
        label: 'Hair & Make-Up',
        icon: 'cut-outline' as const,
        description: 'Preset styles for headshots',
        keywords: ['hair', 'makeup', 'headshot', 'preset', 'style', 'beauty'],
        onPress: () => handleMenuOption('hair_makeup'),
      },
      {
        key: 'outfit_archive',
        label: 'Archive',
        icon: 'archive-outline' as const,
        description: 'View archived items',
        keywords: ['archive', 'hidden', 'storage', 'past'],
        onPress: () => handleMenuOption('outfit_archive'),
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: 'notifications-outline' as const,
        description: 'Mentions, likes, and comments',
        keywords: ['alerts', 'mentions', 'likes', 'comments'],
        onPress: () => handleMenuOption('notifications'),
      },
      {
        key: 'settings',
        label: 'Account Settings',
        icon: 'settings-outline' as const,
        description: 'Preferences and privacy',
        keywords: [
          'settings',
          'preferences',
          'privacy',
          'model',
          'studio',
          'headshot',
          'bodyshot',
        ],
        onPress: () => handleMenuOption('settings'),
      },
      {
        key: 'logout',
        label: 'Log Out',
        icon: 'log-out-outline' as const,
        onPress: () => handleMenuOption('logout'),
        tone: 'destructive' as const,
      },
    ],
    [handleMenuOption]
  );

  return (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push('/notifications')}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <RNText style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </RNText>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setShowMenu(true)}
      >
        <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <FullScreenMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        gridTitle=""
        gridItems={gridItems}
        actionItems={actionItems}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  iconButton: {
    position: 'relative',
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});
