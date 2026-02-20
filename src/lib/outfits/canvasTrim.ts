import { supabase } from '@/lib/supabase';
import { resolveNetlifyBaseUrl } from '@/lib/netlify';
import type { OutfitCanvasTrimMap } from '@/lib/outfits/canvasLayout';

type TrimRequestItem = {
  itemId: string;
  storageKey: string;
};

export async function fetchCanvasTrimMetadata(
  items: TrimRequestItem[]
): Promise<OutfitCanvasTrimMap> {
  if (items.length === 0) return {};

  const { baseUrl } = resolveNetlifyBaseUrl();
  const safeBaseUrl = (baseUrl || '').replace(/\/$/, '');
  if (!safeBaseUrl) {
    throw new Error('Unable to determine Netlify URL');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('Missing auth session');
  }

  const response = await fetch(`${safeBaseUrl}/.netlify/functions/canvas-trim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Trim request failed (${response.status})`);
  }

  const payload = await response.json();
  return payload?.trims ?? {};
}

