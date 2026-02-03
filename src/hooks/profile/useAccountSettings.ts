/**
 * useAccountSettings Hook
 * Load and manage account settings, including account deactivation and deletion
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, updateUserSettings, validateModelPassword, UserSettings } from '@/lib/settings';
import { deactivateAccount, deleteAccountPermanently } from '@/lib/user';

interface UseAccountSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  saving: boolean;
  aiModelPreference: string;
  includeHeadshotInGeneration: boolean;
  loadData: () => Promise<void>;
  handleUpdateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<void>;
  handleModelSelection: (model: string, password?: string) => Promise<void>;
  handleHeadshotToggle: (enabled: boolean, password: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleDeactivateAccount: () => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
}

export function useAccountSettings(): UseAccountSettingsReturn {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiModelPreference, setAiModelPreference] = useState<string>('gemini-2.5-flash-image');
  const [includeHeadshotInGeneration, setIncludeHeadshotInGeneration] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Load settings
    const { data: settingsData, error: settingsError } = await getUserSettings(user.id);
    if (settingsError) {
      console.log('[AccountSettings] Settings not found, user may need to complete onboarding');
      setSettings(null);
    } else {
      setSettings(settingsData);
      if (settingsData) {
        setAiModelPreference(settingsData.ai_model_preference || 'gemini-2.5-flash-image');
        setIncludeHeadshotInGeneration(settingsData.include_headshot_in_generation ?? false);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleUpdateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      if (!user || !settings) return;

      setSaving(true);

      try {
        const { error } = await updateUserSettings(user.id, { [key]: value });

        if (error) {
          Alert.alert('Error', 'Failed to update setting');
        } else {
          setSettings({ ...settings, [key]: value });
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      } finally {
        setSaving(false);
      }
    },
    [user, settings]
  );

  const handleModelSelection = useCallback(
    async (model: string, password?: string) => {
      if (!user || !settings) return;

      // If selecting Pro model, validate password via Netlify function
      if (model === 'gemini-3-pro-image-preview') {
        if (!password) {
          Alert.alert('Error', 'Password is required for Pro model');
          return;
        }

        setSaving(true);
        try {
          const { valid, error } = await validateModelPassword(password, user.id);

          if (!valid) {
            Alert.alert('Error', error || 'Incorrect password');
            setSaving(false);
            return;
          }
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to validate password');
          setSaving(false);
          return;
        }
      } else {
        setSaving(true);
      }

      try {
        const { error: updateError } = await updateUserSettings(user.id, {
          ai_model_preference: model,
        } as any);

        if (updateError) {
          Alert.alert('Error', 'Failed to update model preference');
          return;
        }

        setAiModelPreference(model);
        await loadData();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      } finally {
        setSaving(false);
      }
    },
    [user, settings, loadData]
  );

  const handleHeadshotToggle = useCallback(
    async (enabled: boolean, password: string) => {
      if (!user || !settings) return;

      // Validate password via Netlify function (same as model selection)
      setSaving(true);
      try {
        const { valid, error } = await validateModelPassword(password, user.id);

        if (!valid) {
          Alert.alert('Error', error || 'Incorrect password');
          setSaving(false);
          return;
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to validate password');
        setSaving(false);
        return;
      }

      try {
        const { error: updateError } = await updateUserSettings(user.id, {
          include_headshot_in_generation: enabled,
        } as any);

        if (updateError) {
          Alert.alert('Error', 'Failed to update headshot setting');
          return;
        }

        setIncludeHeadshotInGeneration(enabled);
        await loadData();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      } finally {
        setSaving(false);
      }
    },
    [user, settings, loadData]
  );

  const handleSignOut = useCallback(async () => {
    // On web, use window.confirm instead of Alert.alert since Alert callbacks don't work on web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');

      if (confirmed) {
        try {
          await signOut();
          router.replace('/');
        } catch (error: any) {
          Alert.alert('Error', 'Failed to sign out. Please try again.');
        }
      }
    } else {
      // Native platforms - use Alert.alert
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]);
    }
  }, [signOut, router]);

  const handleDeactivateAccount = useCallback(async () => {
    if (!user) return;

    try {
      const { success, error } = await deactivateAccount(user.id);

      if (!success) {
        Alert.alert('Error', error || 'Failed to deactivate account');
        return;
      }

      // Sign out after deactivation
      await signOut();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to deactivate account');
    }
  }, [user, signOut, router]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    try {
      const { success, error } = await deleteAccountPermanently(user.id);

      if (!success) {
        Alert.alert('Error', error || 'Failed to delete account');
        return;
      }

      // Sign out after deletion
      await signOut();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account');
    }
  }, [user, signOut, router]);

  return {
    settings,
    loading,
    saving,
    aiModelPreference,
    includeHeadshotInGeneration,
    loadData,
    handleUpdateSetting,
    handleModelSelection,
    handleHeadshotToggle,
    handleSignOut,
    handleDeactivateAccount,
    handleDeleteAccount,
  };
}
