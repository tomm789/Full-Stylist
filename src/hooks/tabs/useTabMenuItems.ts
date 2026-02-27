import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntryFlow } from '@/contexts/CalendarEntryFlowContext';

export function useTabMenuItems() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { openDateSelector } = useCalendarEntryFlow();

  const handleCreateOption = useCallback((type: string) => {
    switch (type) {
      case 'outfit':
        router.push('/outfits/new' as any);
        break;
      case 'calendar':
        openDateSelector(new Date());
        break;
      case 'wardrobe':
        router.push('/wardrobe/add' as any);
        break;
      case 'lookbook':
        router.push('/lookbooks/new' as any);
        break;
      case 'headshot':
        router.push('/headshot/new' as any);
        break;
    }
  }, [router, openDateSelector]);

  const handleMenuOption = useCallback(async (action: string) => {
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
        router.push('/calendar' as any);
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
        router.push('/(tabs)/hair-and-make-up' as any);
        break;
      case 'outfit_archive':
        router.push('/archive' as any);
        break;
      case 'logout':
        await signOut();
        router.replace('/');
        break;
    }
  }, [router, signOut]);

  const gridItems = useMemo(
    () => [
      {
        key: 'profile',
        label: 'Profile',
        icon: 'person-outline' as const,
        description: 'Your account and stats',
        keywords: ['account', 'stats', 'bio'],
        onPress: () => handleMenuOption('profile'),
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
        key: 'outfits_explore',
        label: 'Explore',
        icon: 'compass-outline' as const,
        description: 'Discover new looks',
        keywords: ['discover', 'trending', 'inspire'],
        onPress: () => handleMenuOption('outfits_explore'),
      },
      {
        key: 'outfits_following',
        label: 'Followers',
        icon: 'people-outline' as const,
        description: 'Outfits from people you follow',
        keywords: ['feed', 'friends', 'social'],
        onPress: () => handleMenuOption('outfits_following'),
      },
    ],
    [handleMenuOption]
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
        key: 'notifications',
        label: 'Notifications',
        icon: 'notifications-outline' as const,
        description: 'Mentions, likes, and comments',
        keywords: ['alerts', 'mentions', 'likes', 'comments'],
        onPress: () => handleMenuOption('notifications'),
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

  return { handleCreateOption, handleMenuOption, gridItems, actionItems };
}
