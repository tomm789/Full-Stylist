/**
 * Semantic colour map for the Draw Mode canvas.
 * Each makeup/hair category maps to a distinct, AI-interpretable colour
 * that the backend prompt uses to route localised makeup application.
 */

export type DrawColourEntry = {
  label: string;
  colour: string;
};

export const DRAW_COLOUR_MAP: Record<string, DrawColourEntry> = {
  'lip-styles':       { label: 'Lips',       colour: '#FF3333' },
  'eyeliner-styles':  { label: 'Eyeliner',   colour: '#3355FF' },
  'eyeshadow-styles': { label: 'Eyeshadow',  colour: '#9933FF' },
  'blush-placements': { label: 'Blush',      colour: '#FF8800' },
  'foundation-base':  { label: 'Foundation', colour: '#FFDD00' },
  'eyebrow-styles':   { label: 'Brows',      colour: '#33AA00' },
  'major-aesthetics': { label: 'Overall',    colour: '#FF00FF' },
  'hair':             { label: 'Hair',       colour: '#00CCFF' },
};

/** Ordered list for the pill row in DrawModeModal. */
export const DRAW_COLOUR_ORDER: string[] = [
  'lip-styles',
  'eyeliner-styles',
  'eyeshadow-styles',
  'blush-placements',
  'foundation-base',
  'eyebrow-styles',
  'major-aesthetics',
  'hair',
];

export function getDrawColour(categoryId: string): string {
  return DRAW_COLOUR_MAP[categoryId]?.colour ?? '#FF00FF';
}

export function getDrawLabel(categoryId: string): string {
  return DRAW_COLOUR_MAP[categoryId]?.label ?? categoryId;
}
