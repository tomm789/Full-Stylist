/**
 * ProfileStats Component
 * Display primary stat with followers/following counts
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProfileStatsProps {
  primaryLabel: string;
  primaryValue: number;
  followers: number;
  following: number;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export function ProfileStats({
  primaryLabel,
  primaryValue,
  followers,
  following,
  onFollowersPress,
  onFollowingPress,
}: ProfileStatsProps) {
  const FollowersWrapper = onFollowersPress ? TouchableOpacity : View;
  const FollowingWrapper = onFollowingPress ? TouchableOpacity : View;

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{primaryValue}</Text>
        <Text style={styles.statLabel}>{primaryLabel}</Text>
      </View>
      <FollowersWrapper
        style={styles.statItem}
        onPress={onFollowersPress}
        disabled={!onFollowersPress}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{followers}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </FollowersWrapper>
      <FollowingWrapper
        style={styles.statItem}
        onPress={onFollowingPress}
        disabled={!onFollowingPress}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{following}</Text>
        <Text style={styles.statLabel}>Following</Text>
      </FollowingWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
});
