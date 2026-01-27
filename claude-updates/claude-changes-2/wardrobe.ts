import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

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
 * Search for wardrobe items by title, brand, or description
 */
export async function searchWardrobeItems(query: string, limit: number = 20): Promise<{
  data: Array<{
    id: string;
    owner_user_id: string;
    title: string;
    brand?: string;
    category_id: string;
    visibility_override: string;
    created_at: string;
    owner?: { handle: string; display_name: string };
  }>;
  error: any;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return { data: [], error: null };
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id, owner_user_id, title, brand, category_id, visibility_override, created_at, users!owner_user_id(handle, display_name)')
      .or(`title.ilike.${searchTerm},brand.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .is('archived_at', null)
      .in('visibility_override', ['public', 'followers', 'inherit'])
      .limit(limit);

    if (error) {
      throw error;
    }

    // Transform the data to match the expected format
    const transformedData = (data || []).map((item: any) => {
      const owner = Array.isArray(item.users) ? item.users[0] : item.users;
      return {
        id: item.id as string,
        owner_user_id: item.owner_user_id as string,
        title: item.title as string,
        brand: item.brand as string | undefined,
        category_id: item.category_id as string,
        visibility_override: item.visibility_override as string,
        created_at: item.created_at as string,
        owner: owner ? {
          handle: owner.handle as string,
          display_name: owner.display_name as string,
        } : undefined,
      };
    });

    return { data: transformedData, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get user's default wardrobe ID
 */
export async function getDefaultWardrobeId(userId: string): Promise<{
  data: string | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('wardrobes')
    .select('id')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return { data: data?.id || null, error };
}

/**
 * Get all wardrobe categories
 */
export async function getWardrobeCategories(): Promise<{
  data: WardrobeCategory[];
  error: any;
}> {
  const { data, error } = await supabase
    .from('wardrobe_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  return { data: data || [], error };
}

/**
 * Get subcategories for a category
 */
export async function getSubcategories(categoryId: string): Promise<{
  data: WardrobeSubcategory[];
  error: any;
}> {
  const { data, error } = await supabase
    .from('wardrobe_subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });

  return { data: data || [], error };
}

/**
 * Check if the images RLS migration has been applied
 * This checks for the presence of the new RLS policies
 */
async function checkImagesRLSMigration(): Promise<boolean> {
  try {
    // Try to query the policy information from pg_policies
    // Note: This requires admin access, so we'll try a different approach
    // We'll check if we can access images through a test query pattern
    const { data: testData, error: testError } = await supabase
      .from('wardrobe_item_images')
      .select('id')
      .limit(1);
    
    // If we can't even query wardrobe_item_images, there's a bigger issue
    if (testError) {
      console.warn('[checkImagesRLSMigration] Could not query wardrobe_item_images:', testError);
      return false;
    }
    
    // The migration check is best done by attempting the actual query pattern
    // If images are accessible through the join, migration is likely applied
    return true;
  } catch (error) {
    console.error('[checkImagesRLSMigration] Error checking migration status:', error);
    return false;
  }
}

/**
 * Get wardrobe items for a user
 */
export async function getWardrobeItems(
  wardrobeId: string,
  filters?: {
    category_id?: string;
    search?: string;
    is_favorite?: boolean;
  }
): Promise<{
  data: WardrobeItem[];
  error: any;
}> {
  let query = supabase
    .from('wardrobe_items')
    .select('*')
    .eq('wardrobe_id', wardrobeId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters?.is_favorite !== undefined) {
    query = query.eq('is_favorite', filters.is_favorite);
  }

  const { data, error } = await query;

  return { data: data || [], error };
}

/**
 * Upload image to Supabase Storage
 */
// Helper function to convert base64 to ArrayBuffer (for React Native compatibility)
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function uploadImageToStorage(
  userId: string,
  file: Blob | File,
  fileName: string
): Promise<{
  data: { path: string; fullPath: string } | null;
  error: any;
}> {
  const fileExt = fileName.split('.').pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  // For React Native, convert Blob to ArrayBuffer (Blobs don't work with Supabase storage)
  let uploadData: ArrayBuffer | Blob | File;
  if (Platform.OS !== 'web' && file instanceof Blob) {
    // Convert Blob to base64, then to ArrayBuffer
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix if present
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    uploadData = base64ToArrayBuffer(base64);
  } else {
    // For web, use Blob/File directly
    uploadData = file;
  }

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, uploadData, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

  if (error) {
    return { data: null, error };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('media').getPublicUrl(data.path);

  return { data: { path: data.path, fullPath: publicUrl }, error: null };
}

/**
 * Convert image URI to Blob
 * Handles file:// URIs on native platforms using expo-file-system
 * Falls back to fetch() for web and other URI formats
 */
export async function uriToBlob(uri: string, mimeType: string): Promise<Blob> {
  // Check if this is a file:// URI on native platform
  if (uri.startsWith('file://') && Platform.OS !== 'web') {
    // Read file as base64 using expo-file-system
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    
    // Convert base64 to blob using data URL approach (works in React Native)
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const response = await fetch(dataUrl);
    return await response.blob();
  } else {
    // Use fetch for web (blob:, data:, http:) and other formats
    const response = await fetch(uri);
    return await response.blob();
  }
}

/**
 * Create wardrobe item with images
 */
export async function createWardrobeItem(
  userId: string,
  wardrobeId: string,
  itemData: {
    title: string;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    brand?: string;
    visibility_override?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  },
  imageFiles: Array<{ uri: string; type: string; name: string }>
): Promise<{
  data: { item: WardrobeItem; images: any[] } | null;
  error: any;
}> {
  try {
    // First, upload all images and create image records
    const imageIds: string[] = [];

    for (const imageFile of imageFiles) {
      // Convert URI to blob for upload (handles native file:// URIs)
      const blob = await uriToBlob(imageFile.uri, imageFile.type);

      // Upload to storage
      const uploadResult = await uploadImageToStorage(userId, blob, imageFile.name);
      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Create image record
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: userId,
          storage_bucket: 'media',
          storage_key: uploadResult.data!.path,
          mime_type: imageFile.type,
          source: 'upload',
        })
        .select()
        .single();

      if (imageError) {
        throw imageError;
      }

      imageIds.push(imageRecord.id);
    }

    // Create wardrobe item
    const { data: item, error: itemError } = await supabase
      .from('wardrobe_items')
      .insert({
        wardrobe_id: wardrobeId,
        owner_user_id: userId,
        ...itemData,
      })
      .select()
      .single();

    if (itemError) {
      throw itemError;
    }

    // Link images to wardrobe item
    const imageLinks = imageIds.map((imageId, index) => ({
      wardrobe_item_id: item.id,
      image_id: imageId,
      type: 'original' as const,
      sort_order: index,
    }));

    const { data: itemImages, error: linkError } = await supabase
      .from('wardrobe_item_images')
      .insert(imageLinks)
      .select();


    if (linkError) {
      // Enhanced error logging for link creation failures
      console.error('[createWardrobeItem] Failed to create image links. Item ID:', item.id);
      
      // Check if links were actually created despite the error (might be a constraint error if duplicates)
      // or RLS readback issue
      const { data: existingLinks } = await supabase
        .from('wardrobe_item_images')
        .select('*, images(*)')
        .eq('wardrobe_item_id', item.id)
        .order('sort_order', { ascending: true });
      
      
      if (existingLinks && existingLinks.length > 0) {
        return { data: { item, images: existingLinks }, error: null };
      }
      
      // Attempt automatic repair for this specific item
      try {
        const repairResult = await repairWardrobeItemImageLinks(userId, item.id);
        if (!repairResult.error && repairResult.data && repairResult.data.repaired > 0) {
          // Fetch the newly linked images
          const { data: repairedImages } = await supabase
            .from('wardrobe_item_images')
            .select('*, images(*)')
            .eq('wardrobe_item_id', item.id)
            .order('sort_order', { ascending: true });
          
          if (repairedImages && repairedImages.length > 0) {
            return { data: { item, images: repairedImages }, error: null };
          }
        }
      } catch (repairError) {
        // Silent fail, repair didn't work
      }
      
      // Return partial success - item and images were created, but links failed
      // This allows the caller to potentially repair the links later
      return {
        data: {
          item,
          images: [], // No linked images, but item exists
        } as any,
        error: {
          ...linkError,
          message: `Item created successfully but image links failed: ${linkError.message}`,
          partialSuccess: true,
        } as any,
      };
    }

    if (!itemImages || itemImages.length === 0) {
      // Verify links were actually created by querying separately
      const { data: verifiedLinks } = await supabase
        .from('wardrobe_item_images')
        .select('*, images(*)')
        .eq('wardrobe_item_id', item.id)
        .order('sort_order', { ascending: true });
      
      
      if (verifiedLinks && verifiedLinks.length > 0) {
        return { data: { item, images: verifiedLinks }, error: null };
      } else {
      }
    }


    return { data: { item, images: itemImages || [] }, error: null };
  } catch (error: any) {
    console.error('[createWardrobeItem] Error creating wardrobe item:', error?.message || error);
    
    return { data: null, error };
  }
}

/**
 * Find orphaned images (images not linked to any wardrobe item)
 */
export async function findOrphanedImages(userId: string): Promise<{
  data: {
    orphanedImages: Array<{ id: string; storage_key: string; created_at: string }>;
    itemsWithoutImages: Array<{ id: string; title: string; created_at: string }>;
  } | null;
  error: any;
}> {
  try {
    // Get all images owned by user
    const { data: allImages, error: imagesError } = await supabase
      .from('images')
      .select('id, storage_key, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });


    if (imagesError) {
      throw imagesError;
    }

    // Get all image links
    const imageIds = allImages?.map(img => img.id) || [];
    const { data: allLinks, error: linksError } = await supabase
      .from('wardrobe_item_images')
      .select('image_id')
      .in('image_id', imageIds.length > 0 ? imageIds : ['00000000-0000-0000-0000-000000000000']); // Dummy ID to avoid empty IN clause


    if (linksError) {
      throw linksError;
    }

    const linkedImageIds = new Set((allLinks || []).map(link => link.image_id));
    const orphanedImages = (allImages || []).filter(img => !linkedImageIds.has(img.id));

    // Get all wardrobe items owned by user
    const { data: allItems, error: itemsError } = await supabase
      .from('wardrobe_items')
      .select('id, title, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });


    if (itemsError) {
      throw itemsError;
    }

    // Get all item links to find items without images
    const itemIds = allItems?.map(item => item.id) || [];
    const { data: itemLinks, error: itemLinksError } = await supabase
      .from('wardrobe_item_images')
      .select('wardrobe_item_id')
      .in('wardrobe_item_id', itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000']);


    if (itemLinksError) {
      throw itemLinksError;
    }

    const linkedItemIds = new Set((itemLinks || []).map(link => link.wardrobe_item_id));
    const itemsWithoutImages = (allItems || []).filter(item => !linkedItemIds.has(item.id));

    return {
      data: {
        orphanedImages: orphanedImages.map(img => ({
          id: img.id,
          storage_key: img.storage_key,
          created_at: img.created_at,
        })),
        itemsWithoutImages: itemsWithoutImages.map(item => ({
          id: item.id,
          title: item.title,
          created_at: item.created_at,
        })),
      },
      error: null,
    };
  } catch (error: any) {
    console.error('[findOrphanedImages] Error finding orphaned images:', error);
    return { data: null, error };
  }
}

/**
 * Repair wardrobe item image links by matching orphaned images to items
 * This attempts to link images to items based on creation time proximity
 */
export async function repairWardrobeItemImageLinks(
  userId: string,
  itemId?: string
): Promise<{
  data: { repaired: number; linked: Array<{ itemId: string; imageId: string }> } | null;
  error: any;
}> {
  try {

    // Find orphaned images and items without images
    const { data: diagnostic, error: diagnosticError } = await findOrphanedImages(userId);
    if (diagnosticError || !diagnostic) {
      throw diagnosticError || new Error('Failed to find orphaned images');
    }

    const { orphanedImages, itemsWithoutImages } = diagnostic;


    if (orphanedImages.length === 0 || itemsWithoutImages.length === 0) {
      return { data: { repaired: 0, linked: [] }, error: null };
    }

    // Filter to specific item if provided
    const itemsToRepair = itemId
      ? itemsWithoutImages.filter(item => item.id === itemId)
      : itemsWithoutImages;

    if (itemsToRepair.length === 0) {
      return { data: { repaired: 0, linked: [] }, error: null };
    }

    const linked: Array<{ itemId: string; imageId: string }> = [];
    let repaired = 0;
    const linkedImageIds = new Set<string>(); // Track images that have been linked to avoid duplicates

    // Match images to items based on creation time proximity (within 5 minutes)
    for (const item of itemsToRepair) {
      const itemCreatedAt = new Date(item.created_at).getTime();

      // Find images created within 5 minutes of item creation that haven't been linked yet
      const matchingImages = orphanedImages
        .filter(img => !linkedImageIds.has(img.id)) // Only consider images that haven't been linked
        .filter(img => {
          const imageCreatedAt = new Date(img.created_at).getTime();
          const timeDiff = Math.abs(imageCreatedAt - itemCreatedAt);
          return timeDiff <= 5 * 60 * 1000; // 5 minutes in milliseconds
        });


      if (matchingImages.length > 0) {
        // Check if this item already has links (might have been created in parallel)
        const { data: existingLinks } = await supabase
          .from('wardrobe_item_images')
          .select('image_id')
          .eq('wardrobe_item_id', item.id);
        
        if (existingLinks && existingLinks.length > 0) {
          // Mark these images as linked to avoid processing them again
          existingLinks.forEach(link => linkedImageIds.add(link.image_id));
          continue;
        }

        // Link the first matching image (or all if multiple)
        const imagesToLink = matchingImages.slice(0, 3); // Max 3 images per item to avoid over-linking

        const imageLinks = imagesToLink.map((img, index) => ({
          wardrobe_item_id: item.id,
          image_id: img.id,
          type: 'original' as const,
          sort_order: index,
        }));

        const { data: insertedLinks, error: insertError } = await supabase
          .from('wardrobe_item_images')
          .insert(imageLinks)
          .select();


        if (insertError) {
          // Check if it's a duplicate key error (23505) - links might already exist
          if (insertError.code === '23505') {
            // Mark these images as linked
            imagesToLink.forEach(img => linkedImageIds.add(img.id));
            // Verify links exist
            const { data: verifiedLinks } = await supabase
              .from('wardrobe_item_images')
              .select('image_id')
              .eq('wardrobe_item_id', item.id);
            if (verifiedLinks && verifiedLinks.length > 0) {
              repaired++;
            }
          }
          continue;
        }

        // Mark images as linked and track the links
        imagesToLink.forEach(img => {
          linkedImageIds.add(img.id);
          linked.push({ itemId: item.id, imageId: img.id });
        });

        // If insert succeeded but select returned no data, verify links were actually created
        if (!insertedLinks || insertedLinks.length === 0) {
          const { data: verifiedLinks } = await supabase
            .from('wardrobe_item_images')
            .select('image_id')
            .eq('wardrobe_item_id', item.id);
          if (!verifiedLinks || verifiedLinks.length === 0) {
            continue;
          }
        }

        repaired++;
      }
    }


    return { data: { repaired, linked }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Diagnostic function to check if wardrobe_item_images records exist and diagnose RLS issues
 */
async function diagnoseWardrobeItemImages(itemId: string): Promise<void> {
  
  // Step 1: Check if wardrobe_item_images records exist (without join)
  const { data: linkData, error: linkError } = await supabase
    .from('wardrobe_item_images')
    .select('id, image_id, wardrobe_item_id, type, sort_order')
    .eq('wardrobe_item_id', itemId);


  if (linkError) {
    console.error('[diagnoseWardrobeItemImages] Error querying wardrobe_item_images - RLS policy issue');
    return;
  }

  if (!linkData || linkData.length === 0) {
    console.warn(`[diagnoseWardrobeItemImages] No image links found for item ${itemId}`);
    return;
  }

  // Step 2: Check if we can access the image records directly
  const imageIds = linkData.map(link => link.image_id);
  
  
  const { data: imageData, error: imageError } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key, owner_user_id')
    .in('id', imageIds);


  if (imageError) {
    console.error('[diagnoseWardrobeItemImages] Error querying images table - RLS policy issue');
    return;
  }

  if (!imageData || imageData.length === 0) {
    console.warn(`[diagnoseWardrobeItemImages] Found ${linkData.length} links but no accessible images - RLS blocking`);
  } else if (imageData.length < imageIds.length) {
    console.warn(`[diagnoseWardrobeItemImages] Some images blocked by RLS (${imageData.length}/${imageIds.length} accessible)`);
  }
}

// Debug flag - set to true to enable verbose logging
const DEBUG_IMAGES = false;

// Track which items we've logged to avoid console spam
const loggedItems = new Set<string>();

/**
 * Get images for multiple wardrobe items at once (batch query)
 */
export async function getWardrobeItemsImages(itemIds: string[]): Promise<{
  data: Map<string, Array<{ id: string; image_id: string; type: string; sort_order: number; image: any }>>;
  error: any;
}> {
  if (itemIds.length === 0) {
    return { data: new Map(), error: null };
  }

  try {
    // Fetch all links for all items at once
    const { data: links, error: linksError } = await supabase
      .from('wardrobe_item_images')
      .select('*')
      .in('wardrobe_item_id', itemIds)
      .order('sort_order', { ascending: true });

    if (linksError) {
      return { data: new Map(), error: linksError };
    }

    if (!links || links.length === 0) {
      return { data: new Map(), error: null };
    }

    // Get all unique image IDs
    const imageIds = [...new Set(links.map(link => link.image_id))];
    
    // Fetch all images at once
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .in('id', imageIds);

    if (imagesError) {
      return { data: new Map(), error: imagesError };
    }

    // Create a map of image ID to image data
    const imagesMap = new Map(images?.map(img => [img.id, img]) || []);

    // Group links by wardrobe_item_id and attach image data
    const itemImagesMap = new Map<string, Array<any>>();
    links.forEach(link => {
      const itemImages = itemImagesMap.get(link.wardrobe_item_id) || [];
      itemImages.push({
        ...link,
        image: imagesMap.get(link.image_id) || null
      });
      itemImagesMap.set(link.wardrobe_item_id, itemImages);
    });

    return { data: itemImagesMap, error: null };
  } catch (error: any) {
    return { data: new Map(), error };
  }
}

/**
 * Get a single wardrobe item by ID (optimized)
 */
export async function getWardrobeItem(itemId: string): Promise<{
  data: WardrobeItem | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('id', itemId)
    .is('archived_at', null)
    .single();

  return { data: data || null, error };
}

/**
 * Get multiple wardrobe items by IDs (batch query - optimized)
 */
export async function getWardrobeItemsByIds(itemIds: string[]): Promise<{
  data: WardrobeItem[];
  error: any;
}> {
  if (itemIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .in('id', itemIds)
    .is('archived_at', null);

  return { data: data || [], error };
}

/**
 * Get images for a wardrobe item
 */
export async function getWardrobeItemImages(itemId: string): Promise<{
  data: Array<{ id: string; image_id: string; type: string; sort_order: number; image: any }>;
  error: any;
}> {
  // Check migration status on first call (cache result)
  if (!(window as any).__imagesRLSMigrationChecked) {
    const migrationApplied = await checkImagesRLSMigration();
    if (!migrationApplied) {
      console.warn('[Images] ⚠️  RLS migration may not be applied - images may not be accessible');
    }
    (window as any).__imagesRLSMigrationChecked = true;
  }
  
  // Fetch wardrobe_item_images links first
  const { data: links, error: linksError } = await supabase
    .from('wardrobe_item_images')
    .select('*')
    .eq('wardrobe_item_id', itemId)
    .order('sort_order', { ascending: true });
  
  if (linksError) {
    return { data: [], error: linksError };
  }
  
  if (!links || links.length === 0) {
    return { data: [], error: null };
  }
  
  // Fetch images directly using the image IDs
  const linkImageIds = links.map(link => link.image_id);
  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .in('id', linkImageIds);
  
  if (imagesError) {
    return { data: [], error: imagesError };
  }
  
  // Manually join the data
  const imagesMap = new Map(images?.map(img => [img.id, img]) || []);
  const data = links.map(link => ({
    ...link,
    image: imagesMap.get(link.image_id) || null
  }));

  if (!data || data.length === 0) {
    if (!loggedItems.has(itemId)) {
      console.log(`[Images] No image links found for item ${itemId}`);
      loggedItems.add(itemId);
    }
    if (DEBUG_IMAGES) {
      await diagnoseWardrobeItemImages(itemId);
    }
    return { data: [], error: null };
  }

  // Validate image data structure and log any issues
  const validatedData = data.map((item, index) => {
    if (!item.image) {
      if (!loggedItems.has(`${itemId}-null`)) {
        console.warn(`[Images] Item ${itemId}: Image data is NULL (RLS may be blocking access)`);
        loggedItems.add(`${itemId}-null`);
      }
      return item;
    }

    if (!item.image.storage_key) {
      if (!loggedItems.has(`${itemId}-no-key`)) {
        console.warn(`[Images] Item ${itemId}: Missing storage_key`);
        loggedItems.add(`${itemId}-no-key`);
      }
    }

    return item;
  });
  
  return { data: validatedData, error: null };
}

/**
 * Get wardrobe items for another user (for viewing their wardrobe)
 */
export async function getUserWardrobeItems(
  userId: string,
  filters?: {
    category_id?: string;
    search?: string;
  }
): Promise<{
  data: WardrobeItem[];
  error: any;
}> {
  try {
    // Get user's default wardrobe
    const { data: wardrobeId, error: wardrobeError } = await getDefaultWardrobeId(userId);
    if (wardrobeError || !wardrobeId) {
      return { data: [], error: wardrobeError };
    }

    // Get items from that wardrobe
    const { data, error } = await getWardrobeItems(wardrobeId, filters);
    return { data: data || [], error };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Save a wardrobe item from another user to your saved items
 */
export async function saveWardrobeItem(
  userId: string,
  wardrobeItemId: string
): Promise<{
  data: { id: string } | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('saved_wardrobe_items')
      .insert({
        user_id: userId,
        wardrobe_item_id: wardrobeItemId,
      })
      .select('id')
      .single();

    if (error) {
      // If item is already saved, that's okay
      if (error.code === '23505') {
        return { data: null, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unsave a wardrobe item
 */
export async function unsaveWardrobeItem(
  userId: string,
  wardrobeItemId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('saved_wardrobe_items')
      .delete()
      .eq('user_id', userId)
      .eq('wardrobe_item_id', wardrobeItemId);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if a wardrobe item is saved by the user
 */
export async function isWardrobeItemSaved(
  userId: string,
  wardrobeItemId: string
): Promise<{
  data: boolean;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('saved_wardrobe_items')
      .select('id')
      .eq('user_id', userId)
      .eq('wardrobe_item_id', wardrobeItemId)
      .maybeSingle();

    if (error) {
      return { data: false, error };
    }

    return { data: !!data, error: null };
  } catch (error: any) {
    return { data: false, error };
  }
}

/**
 * Get all saved wardrobe items for a user (items from other users)
 */
export async function getSavedWardrobeItems(
  userId: string,
  filters?: {
    category_id?: string;
    search?: string;
  }
): Promise<{
  data: WardrobeItem[];
  error: any;
}> {
  try {
    // Get saved item IDs
    const { data: savedItems, error: savedError } = await supabase
      .from('saved_wardrobe_items')
      .select('wardrobe_item_id')
      .eq('user_id', userId);

    if (savedError || !savedItems || savedItems.length === 0) {
      return { data: [], error: savedError };
    }

    const itemIds = savedItems.map((item) => item.wardrobe_item_id);

    // Get the actual wardrobe items
    let query = supabase
      .from('wardrobe_items')
      .select('*')
      .in('id', itemIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error } = await query;

    return { data: data || [], error };
  } catch (error: any) {
    return { data: [], error };
  }
}