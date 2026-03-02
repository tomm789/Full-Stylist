/**
 * Standard expo-image prop sets by rendering context.
 * Import and spread onto <Image> components for consistency.
 */

export const GRID_IMAGE_PROPS = {
  cachePolicy: 'memory-disk' as const,
  contentFit: 'cover' as const,
  transition: 200,
};

export const DETAIL_IMAGE_PROPS = {
  contentFit: 'contain' as const,
  priority: 'high' as const,
};

export const AVATAR_IMAGE_PROPS = {
  cachePolicy: 'memory-disk' as const,
  contentFit: 'cover' as const,
  transition: 150,
};

export const FEED_IMAGE_PROPS = {
  cachePolicy: 'memory-disk' as const,
  contentFit: 'cover' as const,
  transition: 200,
};
