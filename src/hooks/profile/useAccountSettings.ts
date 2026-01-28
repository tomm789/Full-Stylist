/**
 * useAccountSettings Hook
 * Load and manage account settings
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, updateUserSettings, UserSettings } from '@/lib/settings';

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
  handleModelSelection: (model: string) => Promise<void>;
  handleHeadshotToggle: (enabled: boolean, password: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
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
    async (model: string) => {
      if (!user || !settings) return;

      const { error: updateError } = await updateUserSettings(user.id, {
        ai_model_preference: model,
      } as any);

      if (updateError) {
        Alert.alert('Error', 'Failed to update model preference');
        return;
      }

      setAiModelPreference(model);
      await loadData();
    },
    [user, settings, loadData]
  );

  const handleHeadshotToggle = useCallback(
    async (enabled: boolean, password: string) => {
      if (!user || !settings) return;

      // Validate password (same as model selection: "abcxyz")
      if (password !== 'abcxyz') {
        Alert.alert('Error', 'Incorrect password');
        return;
      }

      setSaving(true);

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
  };
}
