import { supabase } from '@/lib/supabase';

export type HeadshotDrawingTemplate = {
  id: string;
  user_id: string;
  base_image_id: string | null;
  mask_storage_path: string;
  mask_storage_bucket: string;
  prompt_snapshot_json: Record<string, any>;
  colour_map_json: Record<string, string>;
  name: string | null;
  created_at: string;
  updated_at: string;
};

type SaveDrawingTemplateParams = {
  userId: string;
  baseImageId: string;
  maskStoragePath: string;
  maskStorageBucket: string;
  promptSnapshot: Record<string, any>;
  colourMap: Record<string, string>;
  name?: string;
};

export async function saveDrawingTemplate(
  params: SaveDrawingTemplateParams
): Promise<{ data: HeadshotDrawingTemplate | null; error: any }> {
  const { data, error } = await supabase
    .from('headshot_drawing_templates')
    .insert({
      user_id: params.userId,
      base_image_id: params.baseImageId,
      mask_storage_path: params.maskStoragePath,
      mask_storage_bucket: params.maskStorageBucket,
      prompt_snapshot_json: params.promptSnapshot,
      colour_map_json: params.colourMap,
      name: params.name ?? null,
    })
    .select()
    .single();

  return { data: data ?? null, error };
}

export async function listDrawingTemplates(
  userId: string,
  baseImageId: string
): Promise<HeadshotDrawingTemplate[]> {
  const { data } = await supabase
    .from('headshot_drawing_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('base_image_id', baseImageId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function deleteDrawingTemplate(
  templateId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('headshot_drawing_templates')
    .delete()
    .eq('id', templateId);

  return { error };
}
