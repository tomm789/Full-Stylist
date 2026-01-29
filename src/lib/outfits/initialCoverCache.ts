/**
 * Client-only cache for passing outfit render result (base64) from generation to view
 * so the image can be shown immediately without waiting for storage/CDN.
 */

interface CachedCover {
  dataUri: string;
  jobSucceededAt: number;
}

const cache = new Map<string, CachedCover>();

export function setInitialCoverDataUri(
  outfitId: string,
  dataUri: string,
  jobSucceededAt: number = Date.now()
): void {
  cache.set(outfitId, { dataUri, jobSucceededAt });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[outfit_render_timing] setInitialCoverDataUri called', { outfitId, jobSucceededAt });
  }
}

export function getInitialCoverDataUri(outfitId: string): CachedCover | null {
  const entry = cache.get(outfitId);
  if (!entry) return null;
  cache.delete(outfitId);
  return entry;
}
