import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderAddMenu, HeaderRightMenu, FullScreenMenuModal } from '@/components/tabs';
import { DropdownMenuModal } from '@/components/shared/modals/DropdownMenuModal';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingTabBarProvider, useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { HeaderSearchProvider } from '@/contexts/HeaderSearchContext';
import { useCalendarEntryFlow } from '@/contexts/CalendarEntryFlowContext';
import { borderRadius, shadows, spacing, typography } from '@/styles/theme';
import type { ThemeColors } from '@/styles/themes';
import type { BottomTabBarProps } from '-navigation/bottom-tabs';

const SEARCH_EXPAND_DURATION_MS = 180;

function FloatingTabBar(
  props: BottomTabBarProps & {
    onMenuPress?: () => void;
    menuActive?: boolean;
    menuQuery?: string;
    onMenuQueryChange?: (value: string) => void;
    onMenuQueryClear?: () => void;
    menuSearchExpanded?: boolean;
    onMenuSearchToggle?: (expanded: boolean) => void;
    onNotificationsPress?: () => void;
    onCreatePress?: () => void;
    onProfilePress?: () => void;
  }
) {
  const colors = useThemeColors();
  const { tabBarOpacity } = useFloatingTabBar();
  const menuInputRef = useRef<TextInput>(null);
  const menuSearchAnim = useRef(new Animated.Value(props.menuSearchExpanded ? 1 : 0)).current;
  const menuQuery = props.menuQuery ?? '';
  const menuSearchExpanded = Boolean(props.menuSearchExpanded);
  const containerZIndex = props.menuActive ? 60 : 40;
  const containerOpacity = props.menuActive ? 1 : tabBarOpacity;

  useEffect(() => {
    const animation = Animated.timing(menuSearchAnim, {
      toValue: menuSearchExpanded ? 1 : 0,
      duration: SEARCH_EXPAND_DURATION_MS,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && menuSearchExpanded) {
        menuInputRef.current?.focus();
      }
    });
    return () => {
      animation.stop();
    };
  }, [menuSearchAnim, menuSearchExpanded]);

  if (props.menuActive) {
    return (
      <Animated.View
        style={[
          floatingTabBarStyles.container,
          {
            backgroundColor: colors.backgroundSecondary,
            zIndex: containerZIndex,
            ...shadows.lg,
            opacity: containerOpacity,
          },
        ]}
      >
        <View style={[floatingTabBarStyles.inner, floatingTabBarStyles.menuInner]}>
          <Animated.View
            style={[
              floatingTabBarStyles.menuActionsRow,
              {
                opacity: menuSearchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [
                  {
                    translateY: menuSearchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 8],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={menuSearchExpanded ? 'none' : 'auto'}
          >
            <TouchableOpacity
              onPress={() => props.onMenuSearchToggle?.(true)}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Search menu"
            >
              <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onNotificationsPress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onCreatePress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Create new"
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onProfilePress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onMenuPress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons name="menu-outline" size={22} color={colors.primary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.primary }]}>Menu</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              floatingTabBarStyles.expandedSearchRow,
              {
                opacity: menuSearchAnim,
                transform: [
                  {
                    translateY: menuSearchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={menuSearchExpanded ? 'auto' : 'none'}
          >
            <View
              style={[
                floatingTabBarStyles.searchWrapExpanded,
                { borderColor: colors.borderLight, backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                ref={menuInputRef}
                value={menuQuery}
                onChangeText={props.onMenuQueryChange}
                placeholder="Search menu"
                placeholderTextColor={colors.textTertiary}
                style={[floatingTabBarStyles.searchInput, { color: colors.textPrimary }]}
                autoCorrect={false}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={() => props.onMenuSearchToggle?.(false)}
                accessibilityRole="button"
                accessibilityLabel="Collapse search"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        floatingTabBarStyles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          zIndex: containerZIndex,
          ...shadows.lg,
          opacity: containerOpacity,
        },
      ]}
    >
      <View style={floatingTabBarStyles.inner}>
        {props.state.routes.map((route, index) => {
          const { options } = props.descriptors[route.key];

          // Skip hidden tabs (create, social)
          const flatItemStyle = options.tabBarItemStyle
            ? StyleSheet.flatten(options.tabBarItemStyle)
            : null;
          if (flatItemStyle && (flatItemStyle as any).display === 'none') {
            return null;
          }

          const focused = props.state.index === index;
          const color = focused ? colors.primary : colors.textTertiary;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = props.navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              props.navigation.navigate(route.name, route.params);
            }
          };

          const iconNode = options.tabBarIcon?.({ focused, color, size: 22 });
          const labelText = typeof label === 'string' ? label : '';

          if (route.name === 'profile' && props.onMenuPress) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={props.onMenuPress}
                style={floatingTabBarStyles.tab}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={labelText || 'Menu'}
              >
                {iconNode}
                {labelText ? (
                  <Text style={[floatingTabBarStyles.label, { color }]}>{labelText}</Text>
                ) : null}
              </TouchableOpacity>
            );
          }

          // Use custom tabBarButton if provided (e.g. the Menu/profile tab)
          const ButtonComponent = options.tabBarButton;
          if (ButtonComponent) {
            return (
              <ButtonComponent
                key={route.key}
                style={floatingTabBarStyles.tab}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={labelText || undefined}
              >
                {iconNode}
                {labelText ? (
                  <Text style={[floatingTabBarStyles.label, { color }]}>{labelText}</Text>
                ) : null}
              </ButtonComponent>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={labelText || undefined}
            >
              {iconNode}
              {labelText ? (
                <Text style={[floatingTabBarStyles.label, { color }]}>{labelText}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const floatingTabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    height: 60,
  },
  menuInner: {
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  menuActionsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  expandedSearchRow: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  searchWrapExpanded: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    paddingVertical: 0,
  },
});

export default function TabsLayout() {
  return (
    <FloatingTabBarProvider>
      <HeaderSearchProvider>
        <TabsLayoutInner />
      </HeaderSearchProvider>
    </FloatingTabBarProvider>
  );
}

function TabsLayoutInner() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const { openDateSelector } = useCalendarEntryFlow();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [menuSearchExpanded, setMenuSearchExpanded] = useState(false);
  const tabBarPropsRef = useRef<BottomTabBarProps | null>(null);
  const tabBarUpdateScheduled = useRef(false);
  const [, forceTabBarRender] = useState(0);

  // Auth guard — redirect to login when session is lost
  useEffect(() => {
    if (!loading && !session) {
      router.replace('/auth/login' as any);
    }
  }, [session, loading, router]);

  useEffect(() => {
    if (!showMenu && menuQuery) {
      setMenuQuery('');
    }
    if (!showMenu) {
      setMenuSearchExpanded(false);
    }
  }, [showMenu, menuQuery]);

  const handleCreateOption = (type: string) => {
    setShowCreateMenu(false);

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
        key: 'search',
        label: 'Search',
        icon: 'search-outline' as const,
        description: 'Find outfits, people, and more',
        keywords: ['discover', 'find', 'browse', 'query'],
        onPress: () => handleMenuOption('search'),
      },
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

  const handleBottomPillCreate = useCallback(() => {
    setShowMenu(false);
    setShowCreateMenu(true);
  }, []);

  const handleBottomPillNotifications = useCallback(() => {
    setShowMenu(false);
    router.push('/notifications' as any);
  }, [router]);

  const handleBottomPillProfile = useCallback(() => {
    setShowMenu(false);
    router.push('/(tabs)/profile' as any);
  }, [router]);

  return (
    <>
      <Tabs
        tabBar={(props) => {
          // Store props so we can render the pill outside the Tabs tree
          // to keep it above the menu/calendar panels.
          if (tabBarPropsRef.current !== props) {
            tabBarPropsRef.current = props;
            if (!tabBarUpdateScheduled.current) {
              tabBarUpdateScheduled.current = true;
              requestAnimationFrame(() => {
                tabBarUpdateScheduled.current = false;
                forceTabBarRender((tick) => tick + 1);
              });
            }
          }
          return null;
        }}
        screenOptions={{
          headerShown: true,
          headerRight: () => <HeaderRightMenu />,
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
        }}
      >
        <Tabs.Screen
          name="calendar"
          options={{
            headerShown: false,
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="wardrobe"
          options={{
            headerShown: false,
            tabBarLabel: 'Wardrobe',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shirt-outline" size={size} color={color} />
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
          name="create"
          options={{
            headerShown: false,
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="hair-and-make-up"
          options={{
            headerShown: false,
            tabBarLabel: 'Hair & Make-Up',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cut-outline" size={size} color={color} />
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
            tabBarButton: ({ onPress: _nav, onLongPress: _long, onPressIn: _in, onPressOut: _out, href: _href, children, ...rest }) => (
              <TouchableOpacity
                {...rest}
                onPress={() => setShowMenu((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Menu"
              >
                {children}
              </TouchableOpacity>
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
        onAdd={() => { setShowMenu(false); setShowCreateMenu(true); }}
        gridTitle=""
        gridItems={gridItems}
        actionItems={actionItems}
        query={menuQuery}
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

      {/* Floating pill rendered last so it stacks above menu panels */}
      {tabBarPropsRef.current && (
        <FloatingTabBar
          {...tabBarPropsRef.current}
          onMenuPress={() => setShowMenu((prev) => !prev)}
          menuActive={showMenu}
          menuQuery={menuQuery}
          onMenuQueryChange={setMenuQuery}
          onMenuQueryClear={() => setMenuQuery('')}
          menuSearchExpanded={menuSearchExpanded}
          onMenuSearchToggle={setMenuSearchExpanded}
          onCreatePress={handleBottomPillCreate}
          onNotificationsPress={handleBottomPillNotifications}
          onProfilePress={handleBottomPillProfile}
        />
      )}
    </>
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
