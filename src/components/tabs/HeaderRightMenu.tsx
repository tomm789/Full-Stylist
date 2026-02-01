/**
 * HeaderRightMenu Component
 * Right header menu with notifications and profile menu
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenuModal } from '@/components/shared/modals/DropdownMenuModal';

export function HeaderRightMenu() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuOption = async (action: string) => {
    setShowMenu(false);

    switch (action) {
      case 'outfits':
        router.push('/(tabs)/outfits' as any);
        break;
      case 'profile':
        router.push('/(tabs)/profile' as any);
        break;
      case 'settings':
        router.push('/account-settings' as any);
        break;
      case 'feedback':
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

      <DropdownMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        fullWidth
      >
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
      </DropdownMenuModal>
    </View>
  );
}

const styles = StyleSheet.create({
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
