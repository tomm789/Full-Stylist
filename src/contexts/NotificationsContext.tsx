import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  getNotifications,
  getUnreadCount,
  subscribeToNotifications,
  Notification,
} from '@/lib/notifications';
import { SUPABASE_CONFIG } from '@/lib/supabase';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await getNotifications(user.id, 50, 0);
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  // Initial load
  useEffect(() => {
    if (user) {
      refreshNotifications();
      refreshUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    if (SUPABASE_CONFIG.DEV_MODE && !SUPABASE_CONFIG.REALTIME_ENABLED) {
      console.log('[Notifications] Realtime disabled in dev');
      return;
    }

    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Poll for unread count every 30 seconds as fallback
  useEffect(() => {
    if (!user) return;

    if (SUPABASE_CONFIG.REALTIME_ENABLED) {
      return;
    }

    if (SUPABASE_CONFIG.DEV_MODE && !SUPABASE_CONFIG.POLLING_ENABLED) {
      return;
    }

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
