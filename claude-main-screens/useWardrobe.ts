/**
 * useWardrobe Hook
 * Manages wardrobe ID and overall wardrobe state
 */

import { useState, useEffect } from 'react';
import { getDefaultWardrobeId } from '@/lib/wardrobe';
import { useCategories } from './useCategories';

export function useWardrobe(userId: string | null | undefined) {
  const [wardrobeId, setWardrobeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { categories, loadCategories, getCategoryById } = useCategories();

  useEffect(() => {
    if (userId) {
      loadWardrobe();
    }
  }, [userId]);

  const loadWardrobe = async () => {
    if (!userId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { data: defaultWardrobeId, error: wardrobeError } = await getDefaultWardrobeId(userId);
      
      if (wardrobeError) {
        throw wardrobeError;
      }

      setWardrobeId(defaultWardrobeId);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load wardrobe:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    wardrobeId,
    categories,
    loading,
    error,
    loadWardrobe,
    getCategoryById,
  };
}

export default useWardrobe;
