/**
 * useBiometricAuth
 * Manages biometric authentication state (Face ID / Touch ID).
 */

import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Check hardware support
  useEffect(() => {
    if (Platform.OS === 'web') return;

    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(compatible && enrolled);

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        }
      }

      const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(stored === 'true');
    })();
  }, []);

  // Lock on background → foreground transition
  useEffect(() => {
    if (Platform.OS === 'web' || !isEnabled) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isEnabled) {
        setIsLocked(true);
      }
    });

    return () => subscription.remove();
  }, [isEnabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Full Stylist',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      setIsLocked(false);
    }

    return result.success;
  }, []);

  const toggleEnabled = useCallback(async (value: boolean) => {
    if (value) {
      // Require successful auth before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType || 'Biometric'} Lock`,
        cancelLabel: 'Cancel',
      });
      if (!result.success) return;
    }

    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, value.toString());
    setIsEnabled(value);
    if (!value) setIsLocked(false);
  }, [biometricType]);

  return {
    isAvailable,
    biometricType,
    isEnabled,
    isLocked,
    authenticate,
    toggleEnabled,
  };
}
