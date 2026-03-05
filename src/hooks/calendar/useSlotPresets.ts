/**
 * useSlotPresets Hook
 * Manages slot presets for calendar entries
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['slotPresets', userId],
    queryFn: async () => {
      const { data } = await getSlotPresets(userId!);
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['slotPresets', userId] });
  }, [queryClient, userId]);

  const handleCreatePreset = useCallback(async (name: string) => {
    if (!userId) {
      return { data: null, error: { message: 'User not provided' } };
    }

    const result = await createSlotPreset(userId, name);

    if (!result.error) {
      await queryClient.invalidateQueries({ queryKey: ['slotPresets', userId] });
    }

    return result;
  }, [userId, queryClient]);

  return {
    presets: data ?? [],
    loading: isLoading,
    refresh,
    createPreset: handleCreatePreset,
  };
}
