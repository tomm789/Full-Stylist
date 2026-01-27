/**
 * ProfileHeader Component
 * Display user avatar, name, handle, and edit button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  displayName: string;
  handle: string;
  headshotUrl: string | null;
  onEditPress: () => void;
}

export function ProfileHeader({
  displayName,
  handle,
  headshotUrl,
  onEditPress,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {headshotUrl ? (
          <ExpoImage
            source={{ uri: headshotUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name="person-circle-outline" size={100} color="#999" />
        )}
      </View>

      <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
        <Ionicons name="create-outline" size={20} color="#007AFF" />
      </TouchableOpacity>

      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.handle}>@{handle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
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
    marginBottom: 24,
  },
});
