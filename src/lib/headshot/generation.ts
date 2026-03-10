import { supabase } from '@/lib/supabase';

export type HeadshotGenerationSession = {
  id: string;
  user_id: string;
  base_image_id: string | null;
  input_json: Record<string, any>;
  is_onboarding: boolean;
  created_at: string;
};

export type HeadshotGenerationVariation = {
  id: string;
  session_id: string;
  user_id: string;
  ai_job_id: string | null;
  image_id: string | null;
  status: string;
  prompt_text: string | null;
  input_snapshot_json: Record<string, any>;
  is_saved: boolean;
  created_at: string;
};

export async function getLatestHeadshotGenerationSession(
  userId: string,
  baseImageId: string
): Promise<HeadshotGenerationSession | null> {
  const { data, error } = await supabase
    .from('headshot_generation_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('base_image_id', baseImageId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as HeadshotGenerationSession;
}

export async function createHeadshotGenerationSession(
  userId: string,
  baseImageId: string,
  inputJson: Record<string, any>,
  options?: { isOnboarding?: boolean }
): Promise<HeadshotGenerationSession | null> {
  const insertData: Record<string, any> = {
    user_id: userId,
    base_image_id: baseImageId,
    input_json: inputJson,
  };
  // Only include is_onboarding when true (column may not exist before migration)
  if (options?.isOnboarding) {
    insertData.is_onboarding = true;
  }
  const { data, error } = await supabase
    .from('headshot_generation_sessions')
    .insert(insertData)
    .select('*')
    .single();

  if (error || !data) {
        if (__DEV__) console.warn('createHeadshotGenerationSession failed', error);
    return null;
  }

  return data as HeadshotGenerationSession;
}

export async function updateHeadshotGenerationSession(
  sessionId: string,
  inputJson: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('headshot_generation_sessions')
    .update({ input_json: inputJson })
    .eq('id', sessionId);

  if (error) {
        if (__DEV__) console.warn('updateHeadshotGenerationSession failed', error);
  }
}

export async function listHeadshotGenerationVariations(
  sessionId: string
): Promise<HeadshotGenerationVariation[]> {
  const { data, error } = await supabase
    .from('headshot_generation_variations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as HeadshotGenerationVariation[];
}

export async function createHeadshotGenerationVariation(
  variation: Omit<
    HeadshotGenerationVariation,
    'id' | 'created_at' | 'ai_job_id' | 'image_id' | 'is_saved'
  > & {
    ai_job_id?: string | null;
    image_id?: string | null;
    is_saved?: boolean;
  }
): Promise<HeadshotGenerationVariation | null> {
  const { data, error } = await supabase
    .from('headshot_generation_variations')
    .insert({
      session_id: variation.session_id,
      user_id: variation.user_id,
      ai_job_id: variation.ai_job_id || null,
      image_id: variation.image_id || null,
      status: variation.status,
      prompt_text: variation.prompt_text,
      input_snapshot_json: variation.input_snapshot_json,
      is_saved: variation.is_saved ?? false,
    })
    .select('*')
    .single();

  if (error || !data) {
        if (__DEV__) console.warn('createHeadshotGenerationVariation failed', error);
    return null;
  }

  return data as HeadshotGenerationVariation;
}

export async function getVariationByImageId(
  imageId: string
): Promise<HeadshotGenerationVariation | null> {
  const { data, error } = await supabase
    .from('headshot_generation_variations')
    .select('*')
    .eq('image_id', imageId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as HeadshotGenerationVariation;
}

export async function updateHeadshotGenerationVariation(
  variationId: string,
  updates: Partial<Pick<
    HeadshotGenerationVariation,
    'ai_job_id' | 'image_id' | 'status' | 'prompt_text' | 'input_snapshot_json' | 'is_saved'
  >>
): Promise<void> {
  const { error } = await supabase
    .from('headshot_generation_variations')
    .update(updates)
    .eq('id', variationId);

  if (error) {
        if (__DEV__) console.warn('updateHeadshotGenerationVariation failed', error);
  }
}

/**
 * Save a headshot variation and auto-post to feed (unless onboarding session).
 * Combines the variation save + post upsert into a single call.
 */
export async function saveHeadshotVariationWithPost(
  variationId: string,
  userId: string
): Promise<{ posted: boolean; error: any; isFirstPost: boolean }> {
  try {
    // Mark variation as saved
    await updateHeadshotGenerationVariation(variationId, { is_saved: true });

    // Get variation to find image_id and session_id
    const { data: variation } = await supabase
      .from('headshot_generation_variations')
      .select('image_id, session_id')
      .eq('id', variationId)
      .single();

    if (!variation?.image_id) {
      return { posted: false, error: null, isFirstPost: false };
    }

    // Check if this is an onboarding session
    const { data: session } = await supabase
      .from('headshot_generation_sessions')
      .select('is_onboarding')
      .eq('id', variation.session_id)
      .single();

    if (session?.is_onboarding) {
      return { posted: false, error: null, isFirstPost: false };
    }

    // Auto-post with resolved visibility
    const { getUserSettings } = await import('../settings');
    const { upsertEntityPost, resolveVisibility } = await import('../posts');

    const { data: settings } = await getUserSettings(userId);
    const visibility = resolveVisibility(undefined, settings, 'headshot');
    const postResult = await upsertEntityPost(userId, 'headshot', variation.image_id, visibility);

    return { posted: true, error: null, isFirstPost: postResult.isFirstPost };
  } catch (error: any) {
    if (__DEV__) console.warn('saveHeadshotVariationWithPost failed', error);
    return { posted: false, error, isFirstPost: false };
  }
}

export async function setActiveHeadshot(
  userId: string,
  headshotImageId: string
): Promise<{ error: unknown | null }> {
  const { error } = await supabase
    .from('user_settings')
    .update({
      headshot_image_id: headshotImageId,
    })
    .eq('user_id', userId)
    .single();
  return { error };
}
