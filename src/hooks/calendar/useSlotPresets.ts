/**
 * useSlotPresets Hook
 * Manages slot presets for calendar entries
 */

import { useState, useEffect } from 'react';
import { getSlotPresets, createSlotPreset, CalendarSlotPreset } from '@/lib/calendar';

interface UseSlotPresetsProps {
  userId: string | undefined;
}

interface UseSlotPresetsReturn {
  presets: CalendarSlotPreset[];
  loading: boolean;
  refresh: () => Promise<void>;
  createPreset: (name: string) => Promise<{ data: any; error: any }>;
}

export function useSlotPresets({ userId }: UseSlotPresetsProps): UseSlotPresetsReturn {
  const [presets, setPresets] = useState<CalendarSlotPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPresets = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data } = await getSlotPresets(userId);
      if (data) {
        setPresets(data);
      }
    } catch (error) {
      console.error('Error loading slot presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadPresets();
  };

  const createPreset = async (name: string) => {
    if (!userId) {
      return { data: null, error: { message: 'User not provided' } };
    }

    const result = await createSlotPreset(userId, name);

    if (!result.error) {
      await refresh();
    }

    return result;
  };

  useEffect(() => {
    loadPresets();
  }, [userId]);

  return {
    presets,
    loading,
    refresh,
    createPreset,
  };
}
