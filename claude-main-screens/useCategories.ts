/**
 * useCategories Hook
 * Manages wardrobe categories and subcategories
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWardrobeCategories,
  getSubcategories,
  WardrobeCategory,
  WardrobeSubcategory,
} from '@/lib/wardrobe';

export function useCategories() {
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [subcategories, setSubcategories] = useState<WardrobeSubcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: categoriesError } = await getWardrobeCategories();
      
      if (categoriesError) {
        throw categoriesError;
      }

      setCategories(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load subcategories for a specific category
  const loadSubcategories = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    try {
      const { data, error: subcategoriesError } = await getSubcategories(categoryId);
      
      if (subcategoriesError) {
        throw subcategoriesError;
      }

      setSubcategories(data || []);
    } catch (err) {
      console.error('Failed to load subcategories:', err);
      setSubcategories([]);
    }
  }, []);

  // Get category by ID
  const getCategoryById = useCallback(
    (categoryId: string | null) => {
      if (!categoryId) return null;
      return categories.find((c) => c.id === categoryId) || null;
    },
    [categories]
  );

  // Get subcategory by ID
  const getSubcategoryById = useCallback(
    (subcategoryId: string | null) => {
      if (!subcategoryId) return null;
      return subcategories.find((s) => s.id === subcategoryId) || null;
    },
    [subcategories]
  );

  return {
    categories,
    subcategories,
    loading,
    error,
    loadCategories,
    loadSubcategories,
    getCategoryById,
    getSubcategoryById,
  };
}

export default useCategories;
