import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderAddMenu, HeaderRightMenu } from '@/components/tabs';
import { DropdownMenuModal } from '@/components/shared/modals/DropdownMenuModal';
import { useThemeColors } from '@/contexts/ThemeContext';
import { borderRadius, spacing } from '@/styles/theme';
import type { ThemeColors } from '@/styles/themes';

export default function TabsLayout() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

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

  return (
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
            headerTitle: () => <HeaderAddMenu title="Wardrobe" />,
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
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
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
