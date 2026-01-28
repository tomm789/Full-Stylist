/**
 * AccountDangerZone Component
 * Sign out button section for account settings
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AccountDangerZoneProps {
  onSignOut: () => Promise<void>;
}

export function AccountDangerZone({ onSignOut }: AccountDangerZoneProps) {
  return (
    <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
      <Text style={styles.signOutText}>Sign Out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
