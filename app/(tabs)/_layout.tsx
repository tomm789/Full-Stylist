import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeTabIcon, OutfitsTabIcon, HairMakeupTabIcon } from '@/components/icons/tabs';
import { HeaderAddMenu, HeaderRightMenu, FullScreenMenuModal } from '@/components/tabs';
import { FloatingTabBar } from '@/components/tabs/FloatingTabBar';
import { DropdownMenuModal } from '@/components/shared/modals/DropdownMenuModal';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingTabBarProvider } from '@/contexts/FloatingTabBarContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { HeaderSearchProvider } from '@/contexts/HeaderSearchContext';
import { TabSearchProvider, useTabSearch } from '@/contexts/TabSearchContext';
import { useTabMenuItems } from '@/hooks/tabs/useTabMenuItems';
import { borderRadius, spacing } from '@/styles/theme';
import type { ThemeColors } from '@/styles/themes';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const CREATE_MENU_ITEMS = [{ type: 'outfit', icon: 'shirt-outline', label: 'Outfit' }, { type: 'calendar', icon: 'calendar-outline', label: 'Calendar Entry' }, { type: 'wardrobe', icon: 'pricetag-outline', label: 'Wardrobe Item' }, { type: 'lookbook', icon: 'book-outline', label: 'Lookbook' }, { type: 'headshot', icon: 'camera-outline', label: 'Headshot' }] as const;

export default function TabsLayout() {
  return (
    <FloatingTabBarProvider>
      <HeaderSearchProvider>
        <TabSearchProvider>
          <TabsLayoutInner />
        </TabSearchProvider>
      </HeaderSearchProvider>
    </FloatingTabBarProvider>
  );
}

function TabsLayoutInner() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const { getTabSearch, version: tabSearchVersion } = useTabSearch();
  const { handleCreateOption, handleMenuOption, gridItems, actionItems } = useTabMenuItems();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
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
  }, [showMenu, menuQuery]);

  const tabSearchState = getTabSearch(pathname);
  void tabSearchVersion;
  const tabSearchEnabled = Boolean(
    tabSearchState && (pathname?.includes('/wardrobe') || pathname?.includes('/outfits'))
  );
  const withMenuClose = (item: any) => ({ ...item, onPress: () => { setShowMenu(false); item.onPress(); } });
  const gridMenuItems = useMemo(() => gridItems.map(withMenuClose), [gridItems]);
  const actionMenuItems = useMemo(() => actionItems.map(withMenuClose), [actionItems]);

  const handleBottomPillCreate = useCallback(() => {
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
              <WardrobeTabIcon width={size} height={size} color={color} fill={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="outfits"
          options={{
            headerShown: false,
            tabBarLabel: 'Outfits',
            tabBarIcon: ({ color, size }) => (
              <OutfitsTabIcon width={size} height={size} color={color} fill={color} />
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
              <HairMakeupTabIcon width={size} height={size} color={color} fill={color} />
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
        onAdd={() => {
          setShowMenu(false);
          setShowCreateMenu(true);
        }}
        onProfile={() => handleMenuOption('profile')}
        gridTitle=""
        gridItems={gridMenuItems}
        actionItems={actionMenuItems}
        query={menuQuery}
        onQueryChange={setMenuQuery}
      />

      <DropdownMenuModal
        visible={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
        placement="bottom"
        bottomOffset={spacing.huge + spacing.md}
      >
        <Text style={styles.menuTitle}>Add New</Text>
        {CREATE_MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={styles.menuItem}
            onPress={() => {
              setShowCreateMenu(false);
              handleCreateOption(item.type);
            }}
          >
            <Ionicons name={item.icon} size={20} color={colors.black} />
            <Text style={styles.menuItemText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </DropdownMenuModal>

      {/* Floating pill rendered last so it stacks above menu panels */}
      {tabBarPropsRef.current && (
        <FloatingTabBar
          {...tabBarPropsRef.current}
          onMenuPress={() => setShowMenu((prev) => !prev)}
          menuActive={showMenu}
          tabSearchEnabled={tabSearchEnabled}
          tabSearchQuery={tabSearchState?.query}
          tabSearchOpen={tabSearchState?.open}
          onTabSearchToggle={(expanded) => {
            if (!tabSearchState) return;
            if (expanded) {
              tabSearchState.setDefaultFilter?.();
              tabSearchState.onOpen();
              return;
            }
            tabSearchState.onClose();
          }}
          onTabSearchChange={(value) => tabSearchState?.onQueryChange(value)}
          tabSearchPlaceholder={
            pathname?.includes('/wardrobe') ? 'Search wardrobe...' : 'Search outfits...'
          }
          onCreatePress={handleBottomPillCreate}
          onNotificationsPress={handleBottomPillNotifications}
          onProfilePress={handleBottomPillProfile}
        />
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
