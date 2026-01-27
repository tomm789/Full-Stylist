import { getLikeCount, getCommentCount, getSaveCount } from '../engagement';

/**
 * Rating calculation weights
 * These weights determine how much each engagement type contributes to the rating
 */
const RATING_WEIGHTS = {
  likes: 1,
  comments: 2,
  saves: 3,
};

/**
 * Calculate rating for an outfit based on engagement metrics
 */
export async function calculateOutfitRating(outfitId: string): Promise<number> {
  const [likes, comments, saves] = await Promise.all([
    getLikeCount('outfit', outfitId),
    getCommentCount('outfit', outfitId),
    getSaveCount('outfit', outfitId),
  ]);

  const rating =
    likes * RATING_WEIGHTS.likes +
    comments * RATING_WEIGHTS.comments +
    saves * RATING_WEIGHTS.saves;

  return rating;
}

/**
 * Calculate ratings for multiple outfits in parallel
 */
export async function calculateOutfitRatings(outfitIds: string[]): Promise<Map<string, number>> {
  const ratingMap = new Map<string, number>();
  
  // Calculate all ratings in parallel
  const ratingPromises = outfitIds.map(async (id) => {
    const rating = await calculateOutfitRating(id);
    return { id, rating };
  });
  
  const results = await Promise.all(ratingPromises);
  results.forEach(({ id, rating }) => {
    ratingMap.set(id, rating);
  });
  
  return ratingMap;
}

/**
 * Get engagement metrics for an outfit
 */
export async function getOutfitEngagement(outfitId: string): Promise<{
  likes: number;
  comments: number;
  saves: number;
  rating: number;
}> {
  const [likes, comments, saves] = await Promise.all([
    getLikeCount('outfit', outfitId),
    getCommentCount('outfit', outfitId),
    getSaveCount('outfit', outfitId),
  ]);

  const rating =
    likes * RATING_WEIGHTS.likes +
    comments * RATING_WEIGHTS.comments +
    saves * RATING_WEIGHTS.saves;

  return { likes, comments, saves, rating };
}

/**
 * Get top rated outfits for a user
 */
export async function getTopRatedOutfits(
  outfitIds: string[],
  limit: number = 10
): Promise<Array<{ id: string; rating: number }>> {
  const ratingMap = await calculateOutfitRatings(outfitIds);
  
  const outfitsWithRatings = outfitIds
    .map(id => ({ id, rating: ratingMap.get(id) || 0 }))
    .filter(item => item.rating > 0);

  outfitsWithRatings.sort((a, b) => b.rating - a.rating);

  return outfitsWithRatings.slice(0, limit);
}
