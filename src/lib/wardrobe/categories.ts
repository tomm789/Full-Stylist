import { fetchList, QueryListResult } from '../utils/supabase-helpers';

export interface WardrobeCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface WardrobeSubcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

/**
 * Get all wardrobe categories
 */
export async function getWardrobeCategories(): Promise<
  QueryListResult<WardrobeCategory>
> {
  return fetchList<WardrobeCategory>('wardrobe_categories', '*', {
    orderBy: { column: 'sort_order', ascending: true },
  });
}

/**
 * Get subcategories for a category
 */
export async function getSubcategories(
  categoryId: string
): Promise<QueryListResult<WardrobeSubcategory>> {
  return fetchList<WardrobeSubcategory>('wardrobe_subcategories', '*', {
    filters: { category_id: categoryId },
    orderBy: { column: 'sort_order', ascending: true },
  });
}

/**
 * Get category by ID
 */
export async function getCategory(categoryId: string): Promise<{
  data: WardrobeCategory | null;
  error: any;
}> {
  const result = await fetchList<WardrobeCategory>(
    'wardrobe_categories',
    '*',
    {
      filters: { id: categoryId },
      limit: 1,
    }
  );

  return {
    data: result.data && result.data.length > 0 ? result.data[0] : null,
    error: result.error,
  };
}

/**
 * Get subcategory by ID
 */
export async function getSubcategory(subcategoryId: string): Promise<{
  data: WardrobeSubcategory | null;
  error: any;
}> {
  const result = await fetchList<WardrobeSubcategory>(
    'wardrobe_subcategories',
    '*',
    {
      filters: { id: subcategoryId },
      limit: 1,
    }
  );

  return {
    data: result.data && result.data.length > 0 ? result.data[0] : null,
    error: result.error,
  };
}

/**
 * Get all categories with their subcategories
 */
export async function getCategoriesWithSubcategories(): Promise<{
  data: Array<WardrobeCategory & { subcategories?: WardrobeSubcategory[] }>;
  error: any;
}> {
  try {
    const { data: categories, error: catError } =
      await getWardrobeCategories();
    
    if (catError || !categories) {
      return { data: [], error: catError };
    }

    const categoriesWithSubs = await Promise.all(
      categories.map(async (category) => {
        const { data: subcategories } = await getSubcategories(category.id);
        return {
          ...category,
          subcategories: subcategories || [],
        };
      })
    );

    return { data: categoriesWithSubs, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}
