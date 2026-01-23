import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';

function HeaderTitle({ title }: { title: string }) {
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddOption = (type: string) => {
    setShowAddMenu(false);
    
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
    }
  };

  return (
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitleText}>{title}</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddMenu(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#000" />
      </TouchableOpacity>

      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMenu(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.menuTitle}>Add New</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('outfit')}
            >
              <Ionicons name="shirt-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('calendar')}
            >
              <Ionicons name="calendar-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Calendar Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('wardrobe')}
            >
              <Ionicons name="pricetag-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Wardrobe Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAddOption('lookbook')}
            >
              <Ionicons name="book-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Lookbook</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function HeaderRight() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { signOut, user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuOption = async (action: string) => {
    setShowMenu(false);
    
    switch (action) {
      case 'outfits':
        router.push('/(tabs)/outfits' as any);
        break;
      case 'profile':
        // Navigate to the profile tab (social profile)
        router.push('/(tabs)/profile' as any);
        break;
      case 'settings':
        // Navigate to account settings
        router.push('/account-settings' as any);
        break;
      case 'feedback':
        // Navigate to feedback forum
        router.push('/feedback' as any);
        break;
      case 'logout':
        await signOut();
        router.replace('/');
        break;
    }
  };

  return (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="search-outline" size={24} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push('/notifications')}
      >
        <Ionicons name="notifications-outline" size={24} color="#000" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setShowMenu(true)}
      >
        <Ionicons name="menu-outline" size={24} color="#000" />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.dropdownMenu, styles.menuRight]}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('outfits')}
            >
              <Ionicons name="shirt-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>All Outfits</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('profile')}
            >
              <Ionicons name="person-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('settings')}
            >
              <Ionicons name="settings-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Account Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('feedback')}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Feedback</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('logout')}
            >
              <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <HeaderRight />,
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: true,
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          headerTitle: () => <HeaderTitle title="Calendar" />,
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          headerTitle: () => <HeaderTitle title="Wardrobe" />,
          tabBarLabel: 'Wardrobe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lookbooks"
        options={{
          headerTitle: () => <HeaderTitle title="Lookbooks" />,
          tabBarLabel: 'Lookbooks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          headerTitle: () => <HeaderTitle title="Social" />,
          tabBarLabel: 'Social',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: () => <HeaderTitle title="Profile" />,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          href: null, // Hide from tab bar
          headerTitle: () => <HeaderTitle title="Outfits" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 4,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
    marginHorizontal: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuRight: {
    marginRight: 16,
    alignSelf: 'flex-end',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  logoutText: {
    color: '#ff3b30',
  },
});

