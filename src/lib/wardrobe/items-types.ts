/**
 * Wardrobe Items Types
 * Type definitions for wardrobe items
 */

export interface WardrobeItem {
  id: string;
  wardrobe_id: string;
  owner_user_id: string;
  title: string;
  description?: string;
  category_id: string;
  subcategory_id?: string;
  brand?: string;
  color_primary?: string;
  color_palette?: any;
  size?: any;
  material?: any;
  seasonality?: any;
  is_favorite: boolean;
  visibility_override: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  condition?: string;
  is_sellable: boolean;
  created_at: string;
  updated_at: string;
}
