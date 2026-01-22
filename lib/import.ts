import { supabase } from './supabase';
import { getDefaultWardrobeId } from './wardrobe';
import { createWardrobeItem } from './wardrobe';
import { saveOutfit } from './outfits';

export interface LocalStorageWardrobeItem {
  id: number;
  name: string;
  b64: string; // Base64 string without data URI prefix
  url?: string; // Data URI for display
  category: string;
  group?: string;
  colorData?: any;
  tags?: string[];
  created_at?: string;
}

export interface LocalStorageOutfit {
  id: number;
  name: string;
  mannequinB64?: string; // Base64 string
  humanB64?: string; // Base64 string
  categories?: string[];
  lookbooks?: string[];
  items?: number[]; // Array of wardrobe item IDs
  created_at?: string;
}

export interface LocalStorageData {
  version?: number;
  wardrobe?: LocalStorageWardrobeItem[];
  outfits?: LocalStorageOutfit[];
  savedLooks?: any[];
  customCategories?: string[];
  customGroups?: string[];
  lookbooks?: any[];
  workspaceItems?: any[];
  preferences?: any;
}

/**
 * Read data from localStorage
 */
export function readLocalStorageData(): LocalStorageData | null {
  const STORAGE_KEY = 'full_stylist_data';
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return data as LocalStorageData;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return null;
  }
}


/**
 * Map localStorage category name to database category ID
 * This is a helper that tries to match category names
 */
async function findCategoryId(categoryName: string): Promise<string | null> {
  // Get all categories from database
  const { data: categories } = await supabase
    .from('wardrobe_categories')
    .select('id, name');
  
  if (!categories) return null;
  
  // Try to find exact match
  const exactMatch = categories.find(
    (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (exactMatch) return exactMatch.id;
  
  // Try to find partial match
  const partialMatch = categories.find(
    (cat) => cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
             categoryName.toLowerCase().includes(cat.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.id;
  
  // Default to first category if no match found
  return categories.length > 0 ? categories[0].id : null;
}

/**
 * Import wardrobe items from localStorage
 */
export async function importWardrobeItems(
  userId: string,
  wardrobeItems: LocalStorageWardrobeItem[],
  onProgress?: (current: number, total: number) => void
): Promise<{
  data: { imported: number; errors: any[] };
  error: any;
}> {
  try {
    const wardrobeId = await getDefaultWardrobeId(userId);
    if (!wardrobeId) {
      throw new Error('Wardrobe not found');
    }

    const errors: any[] = [];
    let imported = 0;

    for (let i = 0; i < wardrobeItems.length; i++) {
      const item = wardrobeItems[i];
      
      try {
        // Find category ID
        const categoryId = await findCategoryId(item.category);
        if (!categoryId) {
          errors.push({ item: item.name, error: 'Category not found' });
          continue;
        }

        // Convert base64 to data URI for createWardrobeItem
        // Ensure base64 string has data URI prefix
        const base64WithPrefix = item.b64.startsWith('data:') 
          ? item.b64 
          : `data:image/png;base64,${item.b64}`;

        const imageFiles = [{
          uri: base64WithPrefix,
          type: 'image/png',
          name: `${item.name || `item_${item.id}`}.png`,
        }];

        // Create wardrobe item
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

      // Report progress
      if (onProgress) {
        onProgress(i + 1, wardrobeItems.length);
      }
    }

    return { data: { imported, errors }, error: null };
  } catch (error: any) {
    return { data: { imported: 0, errors: [] }, error };
  }
}

/**
 * Import outfits from localStorage
 * Note: This requires wardrobe items to be imported first and mapped to new IDs
 */
export async function importOutfits(
  userId: string,
  outfits: LocalStorageOutfit[],
  itemIdMap: Map<number, string>, // Maps old localStorage item IDs to new database item IDs
  onProgress?: (current: number, total: number) => void
): Promise<{
  data: { imported: number; errors: any[] };
  error: any;
}> {
  try {
    const errors: any[] = [];
    let imported = 0;

    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i];
      
      try {
        // Map outfit items from old IDs to new IDs
        const outfitItems: Array<{ category_id: string; wardrobe_item_id: string }> = [];
        
        if (outfit.items && outfit.items.length > 0) {
          // Get categories for mapped items
          for (const oldItemId of outfit.items) {
            const newItemId = itemIdMap.get(oldItemId);
            if (newItemId) {
              // Get category for this item
              const { data: item } = await supabase
                .from('wardrobe_items')
                .select('category_id')
                .eq('id', newItemId)
                .single();
              
              if (item) {
                outfitItems.push({
                  category_id: item.category_id,
                  wardrobe_item_id: newItemId,
                });
              }
            }
          }
        }

        // Create outfit
        const { error: createError } = await saveOutfit(
          userId,
          {
            title: outfit.name || `Imported Outfit ${outfit.id}`,
          },
          outfitItems
        );

        if (createError) {
          errors.push({ outfit: outfit.name, error: createError });
        } else {
          imported++;
        }
      } catch (error: any) {
        errors.push({ outfit: outfit.name, error: error.message || error });
      }

      // Report progress
      if (onProgress) {
        onProgress(i + 1, outfits.length);
      }
    }

    return { data: { imported, errors }, error: null };
  } catch (error: any) {
    return { data: { imported: 0, errors: [] }, error };
  }
}

/**
 * Disable localStorage writes by setting a flag
 */
export function disableLocalStorageWrites(): void {
  const STORAGE_KEY = 'full_stylist_data';
  const IMPORT_FLAG_KEY = 'full_stylist_imported';
  
  // Set flag to indicate import is complete
  localStorage.setItem(IMPORT_FLAG_KEY, 'true');
  
  // Optional: Clear old data (or keep as backup)
  // localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if localStorage import has been completed
 */
export function isLocalStorageImported(): boolean {
  const IMPORT_FLAG_KEY = 'full_stylist_imported';
  return localStorage.getItem(IMPORT_FLAG_KEY) === 'true';
}
