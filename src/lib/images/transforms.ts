import { supabase } from '@/lib/supabase';

export type ImageSizeClass = 'thumb' | 'card' | 'full';

const SIZE_CONFIG: Record<
  ImageSizeClass,
  { width: number; height: number; quality?: number } | null
> = {
  thumb: { width: 150, height: 150, quality: 70 },
  card: { width: 400, height: 400, quality: 80 },
  full: null,
};

/**
 * Get a public URL for a Supabase storage image with an optional size transform.
 * Falls back to untransformed URL when transform is not requested.
 */
export function getImageUrl(
  bucket: string,
  path: string,
  size: ImageSizeClass = 'full'
): string {
  const config = SIZE_CONFIG[size];

  if (!config) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: {
      width: config.width,
      height: config.height,
      quality: config.quality,
    },
  });

  return data.publicUrl;
}
