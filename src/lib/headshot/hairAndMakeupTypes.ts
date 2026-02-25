/**
 * Shared types and constants for the Hair & Make-Up feature.
 * Imported by the hook, sub-hooks, and components alike.
 * Kept here (lib/) so nothing in hooks/ or components/ creates a circular dependency.
 */

export type TabId = 'hair' | 'makeup';
export type EditTab = 'quick' | TabId | 'accessories' | 'jewellery' | 'advanced';

export type ExpandableSubcategory = { id: string; name: string };

export const ACCESSORY_SUBCATEGORIES: ExpandableSubcategory[] = [
  { id: 'hair-accessories', name: 'Hair Accessories' },
  { id: 'hats-caps', name: 'Hats & Caps' },
  { id: 'sunglasses', name: 'Sunglasses' },
  { id: 'scarves', name: 'Scarves' },
];

export const JEWELLERY_SUBCATEGORIES: ExpandableSubcategory[] = [
  { id: 'earrings', name: 'Earrings' },
  { id: 'necklaces', name: 'Necklaces' },
];

export const ADVANCED_FIELDS = [
  { id: 'hairstyle-length', label: 'Hairstyle & Length', placeholder: 'e.g., long wavy layers with side part' },
  { id: 'hair-color', label: 'Hair Color', placeholder: 'e.g., warm caramel balayage' },
  { id: 'foundation-base', label: 'Foundation & Base', placeholder: 'e.g., dewy finish, light coverage' },
  { id: 'eyeshadow', label: 'Eyeshadow Styles', placeholder: 'e.g., warm brown smoky eye' },
  { id: 'eyeliner', label: 'Eyeliner Styles', placeholder: 'e.g., thin winged liner' },
  { id: 'blush', label: 'Blush Placements', placeholder: 'e.g., soft draping on cheekbones' },
  { id: 'lip-styles', label: 'Lip Styles', placeholder: 'e.g., glossy nude lip' },
  { id: 'eyebrows', label: 'Eyebrow Styles', placeholder: 'e.g., fluffy brushed-up brows' },
  { id: 'fake-tan', label: 'Fake Tan', placeholder: 'e.g., subtle golden glow' },
  { id: 'lip-filler', label: 'Lip Filler', placeholder: 'e.g., natural-looking subtle enhancement' },
  { id: 'botox', label: 'Botox', placeholder: 'e.g., smooth forehead, natural expression' },
] as const;

export const EMPTY_ADVANCED = Object.fromEntries(ADVANCED_FIELDS.map((f) => [f.id, '']));

export type ViewMode = 'grid' | 'face';
/** @deprecated Use ViewMode and EditTab separately */
export type LegacyViewMode = 'grid' | 'face' | TabId;
export type PreviewSource = 'none' | 'selfie' | 'headshot' | 'variation' | 'upload';
export type PageTab = 'grid' | 'mirror' | 'following' | 'inspiration';

export const DEFAULT_HAIR_CATEGORY_ID = 'long-hairstyles';
