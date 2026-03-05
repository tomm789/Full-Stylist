/**
 * useUserSettings Hook
 * Shared React Query-based hook for user settings.
 * Deduplicates network requests when multiple hooks need the same settings data.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, UserSettings } from '@/lib/settings';

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      const { data, error } = await getUserSettings(user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['userSettings', user.id] });
    }
  };

  const optimisticUpdate = (updates: Partial<UserSettings>) => {
    if (user) {
      queryClient.setQueryData<UserSettings | null>(
        ['userSettings', user.id],
        (old) => (old ? { ...old, ...updates } : null)
      );
    }
  };

  return {
    settings: data ?? null,
    loading: isLoading,
    error,
    invalidate,
    optimisticUpdate,
  };
}
