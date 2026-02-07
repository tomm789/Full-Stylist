/**
 * ProfileHeader Component
 * Shared header for own and other users.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStats } from './ProfileStats';

interface ProfileHeaderProps {
  profile: {
    display_name?: string | null;
    handle?: string | null;
    avatar_url?: string | null;
    headshot_image_url?: string | null;
    stats?: {
      posts?: number | null;
      followers?: number | null;
      following?: number | null;
    } | null;
  };
  primaryStat?: {
    label: string;
    value: number;
  };
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  followStatus?: string | null;
  loadingFollow?: boolean;
  onFollowPress?: () => void;
  onEditPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export function ProfileHeader({
  profile,
  primaryStat,
  isOwnProfile = false,
  onEditPress,
  onFollowersPress,
  onFollowingPress,
}: ProfileHeaderProps) {
  const displayName = profile.display_name || profile.handle || 'User';
  const followers = profile.stats?.followers ?? 0;
  const following = profile.stats?.following ?? 0;
  const avatarUrl = profile.avatar_url || profile.headshot_image_url || null;
  const statsPrimary = primaryStat ?? {
    label: 'Posts',
    value: profile.stats?.posts ?? 0,
  };
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <ExpoImage
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons name="person-circle-outline" size={110} color="#999" />
          )}
        </View>

        <View style={styles.infoColumn}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {onEditPress && (
              <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
                <Ionicons name="create-outline" size={18} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
          <ProfileStats
            primaryLabel={statsPrimary.label}
            primaryValue={statsPrimary.value}
            followers={followers}
            following={following}
            onFollowersPress={onFollowersPress}
            onFollowingPress={onFollowingPress}
          />
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  infoColumn: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
});
