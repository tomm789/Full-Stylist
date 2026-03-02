/**
 * Outfit generation sessions and variations CRUD.
 * Mirrors src/lib/headshot/generation.ts for consistency.
 */

import { supabase } from '@/lib/supabase';
import { getPublicImageUrl } from '@/lib/images';
import { saveOutfit } from './items';
import type { OutfitCanvasLayoutMap, OutfitCanvasTrimMap } from './canvasLayout';

// ── Types ────────────────────────────────────────────────────────────────────

export type OutfitGenerationSession = {
  id: string;
  user_id: string;
  input_json: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type OutfitVariationSnapshot = {
  items: Array<{
    wardrobe_item_id: string;
    category_id: string | null;
    position: number;
    text_snapshot: Record<string, unknown>;
  }>;
  canvas_layout: OutfitCanvasLayoutMap | null;
  canvas_trim_map: OutfitCanvasTrimMap | null;
  body_shot_image_id: string;
  model_preference: string;
  stacked_image_id: string | null;
};

export type OutfitGenerationVariation = {
  id: string;
  session_id: string;
  user_id: string;
  ai_job_id: string | null;
  outfit_id: string | null;
  image_id: string | null;
  status: 'pending' | 'complete' | 'failed';
  input_snapshot_json: OutfitVariationSnapshot;
  is_saved: boolean;
  created_at: string;
};

// ── Session CRUD ─────────────────────────────────────────────────────────────

export async function getActiveOutfitSession(
  userId: string
): Promise<OutfitGenerationSession | null> {
  const { data, error } = await supabase
    .from('outfit_generation_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0] as OutfitGenerationSession;
}

export async function createOutfitSession(
  userId: string,
  inputJson: Record<string, unknown> = {}
): Promise<OutfitGenerationSession | null> {
  const { data, error } = await supabase
    .from('outfit_generation_sessions')
    .insert({ user_id: userId, input_json: inputJson })
    .select('*')
    .single();

  if (error || !data) {
    console.warn('createOutfitSession failed', error);
    return null;
  }
  return data as OutfitGenerationSession;
}

export async function updateOutfitSessionInput(
  sessionId: string,
  inputJson: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('outfit_generation_sessions')
    .update({ input_json: inputJson })
    .eq('id', sessionId);

  if (error) console.warn('updateOutfitSessionInput failed', error);
}

export async function endOutfitSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('outfit_generation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) console.warn('endOutfitSession failed', error);
}

// ── Variation CRUD ───────────────────────────────────────────────────────────

export async function listOutfitVariations(
  sessionId: string
): Promise<OutfitGenerationVariation[]> {
  const { data, error } = await supabase
    .from('outfit_generation_variations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as OutfitGenerationVariation[];
}

export async function createOutfitVariation(
  variation: Omit<
    OutfitGenerationVariation,
    'id' | 'created_at' | 'ai_job_id' | 'image_id' | 'is_saved'
  > & {
    ai_job_id?: string | null;
    image_id?: string | null;
    is_saved?: boolean;
  }
): Promise<OutfitGenerationVariation | null> {
  const { data, error } = await supabase
    .from('outfit_generation_variations')
    .insert({
      session_id: variation.session_id,
      user_id: variation.user_id,
      ai_job_id: variation.ai_job_id || null,
      outfit_id: variation.outfit_id,
      image_id: variation.image_id || null,
      status: variation.status,
      input_snapshot_json: variation.input_snapshot_json,
      is_saved: variation.is_saved ?? false,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.warn('createOutfitVariation failed', error);
    return null;
  }
  return data as OutfitGenerationVariation;
}

export async function updateOutfitVariation(
  variationId: string,
  updates: Partial<
    Pick<
      OutfitGenerationVariation,
      'ai_job_id' | 'image_id' | 'status' | 'input_snapshot_json' | 'is_saved'
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from('outfit_generation_variations')
    .update(updates)
    .eq('id', variationId);

  if (error) console.warn('updateOutfitVariation failed', error);
}

export async function getOutfitVariationByImageId(
  imageId: string
): Promise<OutfitGenerationVariation | null> {
  const { data, error } = await supabase
    .from('outfit_generation_variations')
    .select('*')
    .eq('image_id', imageId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as OutfitGenerationVariation;
}

// ── Save-as-own ──────────────────────────────────────────────────────────────

/**
 * Deep-clone a variation into a fully independent outfit record.
 * 1. Creates a new outfit with items from the snapshot
 * 2. Sets the variation's generated image as the cover
 * 3. Creates an outfit_renders record
 * 4. Marks the variation as saved
 * Returns the new outfit ID, or null on failure.
 */
export async function saveVariationAsOutfit(
  variationId: string,
  userId: string
): Promise<string | null> {
  // 1. Fetch the variation
  const { data: variation, error: fetchError } = await supabase
    .from('outfit_generation_variations')
    .select('*')
    .eq('id', variationId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !variation) {
    console.warn('saveVariationAsOutfit: variation not found', fetchError);
    return null;
  }

  if (variation.is_saved) {
    // Already saved — return the existing outfit ID
    return variation.outfit_id;
  }

  const snapshot = variation.input_snapshot_json as OutfitVariationSnapshot;
  const imageId: string | null = variation.image_id;

  // 2. Create a new outfit record with items from the snapshot
  const outfitItems = (snapshot.items || []).map((item, index) => ({
    category_id: item.category_id,
    wardrobe_item_id: item.wardrobe_item_id,
    position: item.position ?? index,
  }));

  const { data: savedData, error: saveError } = await saveOutfit(
    userId,
    { title: 'Saved Generation', visibility: 'followers' },
    outfitItems
  );

  if (saveError || !savedData) {
    console.warn('saveVariationAsOutfit: saveOutfit failed', saveError);
    return null;
  }

  const newOutfitId = savedData.outfit.id;

  // 3. Set cover image
  if (imageId) {
    const { error: coverError } = await supabase
      .from('outfits')
      .update({ cover_image_id: imageId })
      .eq('id', newOutfitId);

    if (coverError) {
      console.warn('saveVariationAsOutfit: cover update failed', coverError);
    }

    // 4. Create an outfit_renders record
    await supabase.from('outfit_renders').insert({
      outfit_id: newOutfitId,
      image_id: imageId,
      settings: snapshot,
      status: 'succeeded',
    });
  }

  // 5. Mark the variation as saved
  await updateOutfitVariation(variationId, { is_saved: true });

  return newOutfitId;
}

// ── Image URL resolution (batch) ─────────────────────────────────────────────

/**
 * Resolve public URLs for a list of image IDs.
 * Returns a Map<imageId, publicUrl>.
 */
export async function resolveImageUrls(
  imageIds: string[]
): Promise<Map<string, string>> {
  if (imageIds.length === 0) return new Map();

  const { data: images } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', imageIds);

  const urlMap = new Map<string, string>();
  images?.forEach((image) => {
    const url = getPublicImageUrl(image);
    if (url) urlMap.set(image.id, url);
  });
  return urlMap;
}
