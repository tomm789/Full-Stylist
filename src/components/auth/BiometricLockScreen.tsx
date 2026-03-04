/**
 * BiometricLockScreen
 * Full-screen overlay shown when the app returns from background and biometric lock is enabled.
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BiometricLockScreenProps {
  biometricType: string | null;
  onAuthenticate: () => Promise<boolean>;
}

export default function BiometricLockScreen({
  biometricType,
  onAuthenticate,
}: BiometricLockScreenProps) {
  // Auto-trigger authentication on mount
  useEffect(() => {
    onAuthenticate();
  }, [onAuthenticate]);

  const iconName = biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name={iconName} size={64} color="#fff" />
        <Text style={styles.title}>Full Stylist</Text>
        <Text style={styles.subtitle}>
          {biometricType ? `Tap to unlock with ${biometricType}` : 'Tap to unlock'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onAuthenticate}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
