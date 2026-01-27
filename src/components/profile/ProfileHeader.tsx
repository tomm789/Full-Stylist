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
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStats } from './ProfileStats';

interface ProfileHeaderProps {
  profile: {
    display_name?: string | null;
    handle?: string | null;
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
}

const getFollowLabel = (
  isFollowing: boolean,
  followStatus: string | null,
  loadingFollow: boolean
) => {
  if (loadingFollow) return 'Loading';
  if (isFollowing) {
    return followStatus === 'requested' ? 'Requested' : 'Following';
  }
  return 'Follow';
};

export function ProfileHeader({
  profile,
  primaryStat,
  isOwnProfile = false,
  isFollowing = false,
  followStatus = null,
  loadingFollow = false,
  onFollowPress,
  onEditPress,
}: ProfileHeaderProps) {
  const displayName = profile.display_name || profile.handle || 'User';
  const handle = profile.handle || 'unknown';
  const followers = profile.stats?.followers ?? 0;
  const following = profile.stats?.following ?? 0;
  const statsPrimary = primaryStat ?? {
    label: 'Posts',
    value: profile.stats?.posts ?? 0,
  };
  const showFollowButton = !isOwnProfile && !!onFollowPress;

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {profile.headshot_image_url ? (
          <ExpoImage
            source={{ uri: profile.headshot_image_url }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name="person-circle-outline" size={110} color="#999" />
        )}
      </View>

      {onEditPress && (
        <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      )}

      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.handle}>@{handle}</Text>

      {showFollowButton && (
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing && styles.followingButton,
            loadingFollow && styles.followButtonDisabled,
          ]}
          onPress={onFollowPress}
          disabled={loadingFollow}
        >
          {loadingFollow ? (
            <ActivityIndicator color={isFollowing ? '#007AFF' : '#fff'} />
          ) : (
            <Text
              style={[styles.followButtonText, isFollowing && styles.followingButtonText]}
            >
              {getFollowLabel(isFollowing, followStatus, loadingFollow)}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <ProfileStats
        primaryLabel={statsPrimary.label}
        primaryValue={statsPrimary.value}
        followers={followers}
        following={following}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#007AFF',
  },
});
