import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderAddMenu, HeaderRightMenu, ConnectedHeaderSearchMenu, FullScreenMenuModal } from '@/components/tabs';
import { DropdownMenuModal } from '@/components/shared/modals/DropdownMenuModal';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { HeaderSearchProvider, useHeaderSearch } from '@/contexts/HeaderSearchContext';
import { borderRadius, spacing } from '@/styles/theme';
import type { ThemeColors } from '@/styles/themes';

export default function TabsLayout() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { signOut } = useAuth();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCreateOption = (type: string) => {
    setShowCreateMenu(false);

    switch (type) {
      case 'outfit':
        router.push('/outfits/new' as any);
        break;
      case 'calendar':
        router.push('/(tabs)/calendar?openAddPicker=true' as any);
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
  };

  const handleMenuOption = useCallback(async (action: string) => {
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
  }, [router, signOut]);

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
    <HeaderSearchProvider>
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerRight: () => <HeaderRightMenu />,
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: true,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
        }}
      >
        <Tabs.Screen
          name="calendar"
          options={{
            headerTitle: () => <HeaderAddMenu title="Calendar" />,
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wardrobe"
          options={{
            headerTitle: 'Wardrobe',
            headerRight: () => <ConnectedHeaderSearchMenu />,
            tabBarLabel: 'Wardrobe',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shirt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            headerShown: false,
            tabBarLabel: '',
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.createButtonContainer}
                onPress={() => setShowCreateMenu(true)}
                accessibilityRole="button"
                accessibilityLabel="Create"
              >
                <View style={styles.createButton}>
                  <Ionicons name="add" size={28} color={colors.white} />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen
          name="outfits"
          options={{
            headerShown: false,
            tabBarLabel: 'Outfits',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerTitle: () => <HeaderAddMenu title="Profile" />,
            tabBarLabel: 'Menu',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu-outline" size={size} color={color} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setShowMenu(true)}
                accessibilityRole="button"
                accessibilityLabel="Menu"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />
      </Tabs>

      <FullScreenMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        gridTitle=""
        gridItems={gridItems}
        actionItems={actionItems}
      />

      <DropdownMenuModal
        visible={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
        placement="bottom"
        bottomOffset={spacing.huge + spacing.md}
      >
        <Text style={styles.menuTitle}>Add New</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleCreateOption('outfit')}
        >
          <Ionicons name="shirt-outline" size={20} color={colors.black} />
          <Text style={styles.menuItemText}>Outfit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleCreateOption('calendar')}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.black} />
          <Text style={styles.menuItemText}>Calendar Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleCreateOption('wardrobe')}
        >
          <Ionicons name="pricetag-outline" size={20} color={colors.black} />
          <Text style={styles.menuItemText}>Wardrobe Item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleCreateOption('lookbook')}
        >
          <Ionicons name="book-outline" size={20} color={colors.black} />
          <Text style={styles.menuItemText}>Lookbook</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleCreateOption('headshot')}
        >
          <Ionicons name="camera-outline" size={20} color={colors.black} />
          <Text style={styles.menuItemText}>Headshot</Text>
        </TouchableOpacity>
      </DropdownMenuModal>
    </>
    </HeaderSearchProvider>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  createButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
