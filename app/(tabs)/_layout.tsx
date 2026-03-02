import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { TabSearchProvider } from '@/contexts/TabSearchContext';
import { useTabMenuItems } from '@/hooks/tabs/useTabMenuItems';
import { spacing } from '@/styles/theme';
import type { ThemeColors } from '@/styles/themes';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

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
  const {
    handleCreateOption: onCreateOption,
    handleMenuOption: onMenuOption,
    gridItems,
    actionItems,
  } = useTabMenuItems();
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

  const handleCreateOption = useCallback((type: string) => {
    setShowCreateMenu(false);
    onCreateOption(type);
  }, [onCreateOption]);

  const handleMenuOption = useCallback(async (action: string) => {
    setShowMenu(false);
    await onMenuOption(action);
  }, [onMenuOption]);

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
        onAdd={() => { setShowMenu(false); setShowCreateMenu(true); }}
        onProfile={() => handleMenuOption('profile')}
        gridTitle=""
        gridItems={gridItems}
        actionItems={actionItems}
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
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
