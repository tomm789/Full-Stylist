import { supabase } from '../supabase';
import { getDefaultWardrobeId, createWardrobeItem } from '../wardrobe';
import type { LocalStorageWardrobeItem } from './reader';

async function findCategoryId(categoryName: string): Promise<string | null> {
  const { data: categories } = await supabase
    .from('wardrobe_categories')
    .select('id, name');
  
  if (!categories) return null;
  
  const exactMatch = categories.find(
    (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (exactMatch) return exactMatch.id;
  
  const partialMatch = categories.find(
    (cat) => cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
             categoryName.toLowerCase().includes(cat.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.id;
  
  return categories.length > 0 ? categories[0].id : null;
}

export async function importWardrobeItems(
  userId: string,
  wardrobeItems: LocalStorageWardrobeItem[],
  onProgress?: (current: number, total: number) => void
): Promise<{
  data: { imported: number; errors: any[] };
  error: any;
}> {
  try {
    const { data: wardrobeId } = await getDefaultWardrobeId(userId);
    if (!wardrobeId) {
      throw new Error('Wardrobe not found');
    }

    const errors: any[] = [];
    let imported = 0;

    for (let i = 0; i < wardrobeItems.length; i++) {
      const item = wardrobeItems[i];
      
      try {
        const categoryId = await findCategoryId(item.category);
        if (!categoryId) {
          errors.push({ item: item.name, error: 'Category not found' });
          continue;
        }

        const base64WithPrefix = item.b64.startsWith('data:') 
          ? item.b64 
          : `data:image/png;base64,${item.b64}`;

        const imageFiles = [{
          uri: base64WithPrefix,
          type: 'image/png',
          name: `${item.name || `item_${item.id}`}.png`,
        }];

        const { error: createError } = await createWardrobeItem(
          userId,
          wardrobeId,
          {
            title: item.name || `Imported Item ${item.id}`,
            description: item.tags?.join(', ') || undefined,
            category_id: categoryId,
          },
          imageFiles
        );

        if (createError) {
          errors.push({ item: item.name, error: createError });
        } else {
          imported++;
        }
      } catch (error: any) {
        errors.push({ item: item.name, error: error.message || error });
      }

      if (onProgress) {
        onProgress(i + 1, wardrobeItems.length);
      }
    }

    return { data: { imported, errors }, error: null };
  } catch (error: any) {
    return { data: { imported: 0, errors: [] }, error };
  }
}
