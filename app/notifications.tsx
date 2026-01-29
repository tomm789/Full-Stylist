import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { LoadingSpinner } from '@/components/shared';
import {
  Notification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationMessage,
  getNotificationIcon,
  getNotificationThumbnail,
} from '@/lib/notifications';

// Helper function to format timestamps
const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const notifTime = new Date(timestamp);
  const diffMs = now.getTime() - notifTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (notifTime.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return notifTime.toLocaleDateString('en-US', options);
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { notifications, loading, refreshNotifications, refreshUnreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshNotifications(), refreshUnreadCount()]);
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!user) return;

    // Mark as read
    if (!notification.is_read) {
      await markAsRead(user.id, notification.id);
      await refreshUnreadCount();
    }

    // Navigate to the relevant entity
    if (notification.entity_type === 'post' && notification.entity_id) {
      // Posts contain an outfit or lookbook - navigate to the actual entity
      const post = notification.entity?.post;
      if (post?.entity_type === 'outfit' && post.entity_id) {
        router.push(`/outfits/${post.entity_id}/view`);
      } else if (post?.entity_type === 'lookbook' && post.entity_id) {
        router.push(`/lookbooks/${post.entity_id}/view`);
      } else {
        // Fallback to social feed if we can't determine the entity
        router.push('/social');
      }
    } else if (notification.entity_type === 'outfit' && notification.entity_id) {
      router.push(`/outfits/${notification.entity_id}/view`);
    } else if (notification.entity_type === 'lookbook' && notification.entity_id) {
      router.push(`/lookbooks/${notification.entity_id}/view`);
    } else if (notification.notification_type === 'follow_request' || notification.notification_type === 'follow_accepted') {
      // Navigate to profile
      router.push('/profile');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    
    const { error } = await markAllAsRead(user.id);
    if (!error) {
      await Promise.all([refreshNotifications(), refreshUnreadCount()]);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;

    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteNotification(user.id, notificationId);
            if (!error) {
              await refreshNotifications();
            }
          },
        },
      ]
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const message = getNotificationMessage(item);
    const icon = getNotificationIcon(item);
    const actorAvatar = item.actor?.avatar_url;
    const actorInitial = item.actor?.display_name?.[0] || item.actor?.handle?.[0] || '?';
    const thumbnail = getNotificationThumbnail(item);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeleteNotification(item.id)}
      >
        <View style={styles.notificationIcon}>
          {actorAvatar ? (
            <Image
              source={{ uri: actorAvatar }}
              style={styles.avatarImage}
              onError={() => {
                // Avatar load failed, will show fallback on next render
              }}
            />
          ) : (
            <View style={styles.iconFallback}>
              <Text style={styles.avatarInitial}>{actorInitial.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationMessage}>{message}</Text>
          <Text style={styles.notificationTime}>{formatTimestamp(item.created_at)}</Text>
        </View>
        {thumbnail && (
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        )}
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllButtonText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              When people interact with your content, you'll see it here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f8f8ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  iconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5555ff',
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  thumbnailImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#f0f0f0',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
