import type { EntityAttribute } from '../attributes';

/**
 * Calculate similarity score between two sets of attributes
 * Uses attribute overlap scoring
 */
export function calculateSimilarityScore(
  sourceAttrs: EntityAttribute[],
  targetAttrs: EntityAttribute[]
): {
  score: number;
  matchingAttributes: Array<{
    key: string;
    value: string;
    confidence?: number;
  }>;
} {
  // Create maps of attributes by definition_id
  const sourceMap = new Map<string, EntityAttribute[]>();
  const targetMap = new Map<string, EntityAttribute[]>();

  for (const attr of sourceAttrs) {
    const key = attr.definition_id;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, []);
    }
    sourceMap.get(key)!.push(attr);
  }

  for (const attr of targetAttrs) {
    const key = attr.definition_id;
    if (!targetMap.has(key)) {
      targetMap.set(key, []);
    }
    targetMap.get(key)!.push(attr);
  }

  let matches = 0;
  let totalSource = sourceAttrs.length;
  let totalTarget = targetAttrs.length;

  const matchingAttributes: Array<{
    key: string;
    value: string;
    confidence?: number;
  }> = [];

  // Compare attributes
  for (const [defId, sourceAttrsList] of sourceMap.entries()) {
    const targetAttrsList = targetMap.get(defId);
    if (targetAttrsList) {
      // Check for value matches
      for (const sourceAttr of sourceAttrsList) {
        const sourceValue = sourceAttr.raw_value || (sourceAttr.value_id ? '' : '');
        for (const targetAttr of targetAttrsList) {
          const targetValue = targetAttr.raw_value || (targetAttr.value_id ? '' : '');
          
          // Compare normalized values if available, otherwise raw values
          if (
            sourceAttr.value_id === targetAttr.value_id ||
            sourceValue.toLowerCase().trim() === targetValue.toLowerCase().trim()
          ) {
            matches++;
            matchingAttributes.push({
              key: defId,
              value: sourceValue || targetValue,
              confidence: Math.max(
                sourceAttr.confidence || 0,
                targetAttr.confidence || 0
              ),
            });
            break; // Count each source attribute once
          }
        }
      }
    }
  }

  // Calculate score: matches / (average of source and target counts)
  // This gives a balanced score that accounts for both sets
  const avgCount = (totalSource + totalTarget) / 2;
  const score = avgCount > 0 ? (matches / avgCount) * 100 : 0;

  return { score, matchingAttributes };
}
