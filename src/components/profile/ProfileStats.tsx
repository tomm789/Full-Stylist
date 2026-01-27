/**
 * ProfileStats Component
 * Display posts, followers, following counts
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProfileStatsProps {
  posts: number;
  followers: number;
  following: number;
}

export function ProfileStats({ posts, followers, following }: ProfileStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{posts}</Text>
        <Text style={styles.statLabel}>Posts</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{followers}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{following}</Text>
        <Text style={styles.statLabel}>Following</Text>
      </View>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});
