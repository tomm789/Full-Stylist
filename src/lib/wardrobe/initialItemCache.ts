/**
 * Client-only cache for passing wardrobe item render result (base64 image + text) from generation to view
 * so the image and description can be shown immediately without waiting for storage/CDN.
 */

export interface CachedItem {
  dataUri: string;
  title?: string;
  description?: string;
  jobSucceededAt: number;
  /** Job that produced this item (for matching navigation context). */
  jobId: string;
  /** Optional trace ID for matching navigation context. */
  traceId?: string;
}

// Cache key format: `${wardrobeItemId}:${jobId}` or `${wardrobeItemId}:${traceId}`
const cache = new Map<string, CachedItem>();

// Optional TTL: evict entries older than 5 minutes
const TTL_MS = 5 * 60 * 1000;

function evictStaleEntries() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.jobSucceededAt > TTL_MS) {
      cache.delete(key);
    }
  }
}

export function setInitialItemData(
  wardrobeItemId: string,
  jobId: string,
  dataUri: string,
  jobSucceededAt: number = Date.now(),
  traceId?: string,
  title?: string,
  description?: string
): void {
  // Use composite key: itemId:jobId (or itemId:traceId if no jobId)
  const cacheKey = traceId ? `${wardrobeItemId}:${traceId}` : `${wardrobeItemId}:${jobId}`;
  
  cache.set(cacheKey, {
    dataUri,
    title,
    description,
    jobSucceededAt,
    jobId,
    traceId,
  });
  
  // Evict stale entries periodically
  evictStaleEntries();
  
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[wardrobe_item_render_timing] setInitialItemData called', {
      wardrobeItemId,
      jobId,
      traceId,
      jobSucceededAt,
      cacheKey,
    });
  }
}

export function getInitialItemData(
  wardrobeItemId: string,
  jobId?: string,
  traceId?: string
): CachedItem | null {
  // Try to match by jobId first, then traceId, then any entry for this itemId
  let cacheKey: string | null = null;
  
  if (jobId) {
    cacheKey = `${wardrobeItemId}:${jobId}`;
  } else if (traceId) {
    cacheKey = `${wardrobeItemId}:${traceId}`;
  } else {
    // Fallback: find any entry for this itemId (first match)
    for (const [key, entry] of cache.entries()) {
      if (key.startsWith(`${wardrobeItemId}:`)) {
        cacheKey = key;
        break;
      }
    }
  }
  
  if (!cacheKey) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[wardrobe_item_render_timing] cache_miss', { wardrobeItemId, jobId, traceId });
    }
    return null;
  }
  
  const entry = cache.get(cacheKey);
  if (!entry) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[wardrobe_item_render_timing] cache_miss', { wardrobeItemId, jobId, traceId, cacheKey });
    }
    return null;
  }
  
  // Check if entry matches navigation context (same jobId or traceId)
  if (jobId && entry.jobId !== jobId) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[wardrobe_item_render_timing] cache_mismatch (jobId)', {
        wardrobeItemId,
        requestedJobId: jobId,
        cachedJobId: entry.jobId,
      });
    }
    return null;
  }
  
  if (traceId && entry.traceId && entry.traceId !== traceId) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[wardrobe_item_render_timing] cache_mismatch (traceId)', {
        wardrobeItemId,
        requestedTraceId: traceId,
        cachedTraceId: entry.traceId,
      });
    }
    return null;
  }
  
  // Consume-on-read: remove entry after retrieval
  cache.delete(cacheKey);
  
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[wardrobe_item_render_timing] cache_hit_at', {
      wardrobeItemId,
      jobId: entry.jobId,
      traceId: entry.traceId,
      cacheKey,
      jobSucceededAt: entry.jobSucceededAt,
    });
  }
  
  return entry;
}
