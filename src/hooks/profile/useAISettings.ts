/**
 * useAISettings Hook
 * Manage per-generation AI model settings and lock flags
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, updateUserSettings, UserSettings } from '@/lib/settings';

export type AIModelSettingKey =
  | 'ai_model_outfit_render'
  | 'ai_model_outfit_mannequin'
  | 'ai_model_wardrobe_item_generate'
  | 'ai_model_wardrobe_item_render'
  | 'ai_model_product_shot'
  | 'ai_model_headshot_generate'
  | 'ai_model_body_shot_generate'
  | 'ai_model_auto_tag'
  | 'ai_model_style_advice';

export type AIModelLockKey =
  | 'ai_model_lock_outfit_render'
  | 'ai_model_lock_outfit_mannequin'
  | 'ai_model_lock_wardrobe_item_generate'
  | 'ai_model_lock_wardrobe_item_render'
  | 'ai_model_lock_product_shot'
  | 'ai_model_lock_headshot_generate'
  | 'ai_model_lock_body_shot_generate'
  | 'ai_model_lock_auto_tag'
  | 'ai_model_lock_style_advice';

export interface AISettingsState {
  settings: UserSettings | null;
  loading: boolean;
  saving: boolean;
  refresh: () => Promise<void>;
  updateModel: (key: AIModelSettingKey, value: string) => Promise<void>;
  updateLock: (key: AIModelLockKey, locked: boolean) => Promise<void>;
  updateMany: (updates: Partial<UserSettings>) => Promise<void>;
  lockedKeys: Set<AIModelSettingKey>;
}

export function useAISettings(): AISettingsState {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await getUserSettings(user.id);
    if (error) {
      console.error('[AISettings] Failed to load settings:', error);
      setSettings(null);
    } else {
      setSettings(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  const updateMany = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!user || !settings) return;
      setSaving(true);
      try {
        const { error } = await updateUserSettings(user.id, updates);
        if (error) {
          Alert.alert('Error', 'Failed to update AI settings');
          return;
        }
        setSettings({ ...settings, ...updates });
      } catch (error: any) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      } finally {
        setSaving(false);
      }
    },
    [user, settings]
  );

  const updateModel = useCallback(
    async (key: AIModelSettingKey, value: string) => {
      await updateMany({ [key]: value } as Partial<UserSettings>);
    },
    [updateMany]
  );

  const updateLock = useCallback(
    async (key: AIModelLockKey, locked: boolean) => {
      await updateMany({ [key]: locked } as Partial<UserSettings>);
    },
    [updateMany]
  );

  const lockedKeys = useMemo(() => {
    const set = new Set<AIModelSettingKey>();
    if (!settings) return set;
    if (settings.ai_model_lock_outfit_render) set.add('ai_model_outfit_render');
    if (settings.ai_model_lock_outfit_mannequin) set.add('ai_model_outfit_mannequin');
    if (settings.ai_model_lock_wardrobe_item_generate) set.add('ai_model_wardrobe_item_generate');
    if (settings.ai_model_lock_wardrobe_item_render) set.add('ai_model_wardrobe_item_render');
    if (settings.ai_model_lock_product_shot) set.add('ai_model_product_shot');
    if (settings.ai_model_lock_headshot_generate) set.add('ai_model_headshot_generate');
    if (settings.ai_model_lock_body_shot_generate) set.add('ai_model_body_shot_generate');
    if (settings.ai_model_lock_auto_tag) set.add('ai_model_auto_tag');
    if (settings.ai_model_lock_style_advice) set.add('ai_model_style_advice');
    return set;
  }, [settings]);

  return {
    settings,
    loading,
    saving,
    refresh,
    updateModel,
    updateLock,
    updateMany,
    lockedKeys,
  };
}
