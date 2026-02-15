export function normalizeLabel(value: string): string {
  if (typeof value !== 'string') return '';
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  const lower = collapsed.toLowerCase();
  return lower.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function normalizeLabelKey(value: string): string {
  const normalized = normalizeLabel(value);
  return normalized ? normalized.toLowerCase() : '';
}

export function normalizeLabelList(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const label = normalizeLabel(value);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }

  return normalized;
}
