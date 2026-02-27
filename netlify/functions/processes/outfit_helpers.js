"use strict";

function normalizeLabel(value) {
  if (typeof value !== 'string') return '';
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  const lower = collapsed.toLowerCase();
  return lower.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function normalizeLabelList(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const normalized = [];

  for (const value of values) {
    const label = normalizeLabel(value);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }

  return normalized;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizeTrimBounds(rawBounds) {
  const left = clamp(Number(rawBounds?.left ?? 0), 0, 1);
  const top = clamp(Number(rawBounds?.top ?? 0), 0, 1);
  const right = clamp(Number(rawBounds?.right ?? 1), left + 0.001, 1);
  const bottom = clamp(Number(rawBounds?.bottom ?? 1), top + 0.001, 1);
  return { left, top, right, bottom };
}

module.exports = {
  normalizeLabel,
  normalizeLabelList,
  clamp,
  normalizeTrimBounds,
};
