import { supabase } from '@/lib/supabase';

export type HeadshotGenerationSession = {
  id: string;
  user_id: string;
  base_image_id: string | null;
  input_json: Record<string, any>;
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
  inputJson: Record<string, any>
): Promise<HeadshotGenerationSession | null> {
  const { data, error } = await supabase
    .from('headshot_generation_sessions')
    .insert({
      user_id: userId,
      base_image_id: baseImageId,
      input_json: inputJson,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.warn('createHeadshotGenerationSession failed', error);
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
    console.warn('updateHeadshotGenerationSession failed', error);
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
    console.warn('createHeadshotGenerationVariation failed', error);
    return null;
  }

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
    console.warn('updateHeadshotGenerationVariation failed', error);
  }
}
