/**
 * Client-only cache for passing outfit render result (base64) from generation to view
 * so the image can be shown immediately without waiting for storage/CDN.
 */

export interface CachedCover {
  dataUri: string;
  jobSucceededAt: number;
  /** Job that produced this cover (for feedback overlay). */
  jobId?: string;
  /** If set, feedback was already submitted for this job. */
  feedbackAt?: string | null;
}

const cache = new Map<string, CachedCover>();

export function setInitialCoverDataUri(
  outfitId: string,
  dataUri: string,
  jobSucceededAt: number = Date.now(),
  jobId?: string,
  feedbackAt?: string | null
): void {
  cache.set(outfitId, { dataUri, jobSucceededAt, jobId, feedbackAt });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[outfit_render_timing] setInitialCoverDataUri called', { outfitId, jobSucceededAt, jobId });
  }
}

export function getInitialCoverDataUri(outfitId: string): CachedCover | null {
  const entry = cache.get(outfitId);
  if (!entry) return null;
  cache.delete(outfitId);
  return entry;
}
