import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';
import UserWardrobeScreen from '@/app/components/UserWardrobeScreen';

type WardrobeUser = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function UserWardrobeRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [user, setUser] = useState<WardrobeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!id || typeof id !== 'string') return;
      setLoading(true);
      const { data } = await supabase
        .from('users')
        .select('id, handle, display_name, avatar_url')
        .eq('id', id)
        .single();
      setUser(data || null);
      setLoading(false);
    };
    loadUser();
  }, [id]);

  if (!id || typeof id !== 'string') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <UserWardrobeScreen
      userId={id}
      headerComponent={
        <View style={styles.header}>
          {user?.avatar_url ? (
            <ExpoImage source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View>
            <Text style={styles.userName}>
              {user?.display_name || user?.handle || 'User'}
            </Text>
            {user?.handle ? (
              <Text style={styles.userHandle}>@{user.handle}</Text>
            ) : null}
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e5e5',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  userHandle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
