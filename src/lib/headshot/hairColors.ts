/**
 * hairColors
 * Domain data for hair-colour swatches and the luminance utility used by ColorPresetTile.
 * Moved out of hairAndMakeupStyles.ts so the style factory carries no domain data.
 */

/** Approximate fill colors for hair-color preset pills. */
export const HAIR_COLOR_SWATCHES: Record<string, string | string[]> = {
  // Natural
  'color-black':            '#1a1a1a',
  'color-dark-brown':       '#3b2213',
  'color-medium-brown':     '#6b3a2a',
  'color-light-brown':      '#8b5e3c',
  'color-dirty-blonde':     '#b59a6e',
  'color-golden-blonde':    '#d4a84b',
  'color-platinum-blonde':  '#e8dcc8',
  'color-strawberry-blonde':'#c8836a',
  'color-auburn':           '#7b3019',
  'color-copper-red':       '#b7452a',
  'color-ginger':           '#d46a38',
  'color-silver-grey':      '#a8a8a8',
  'color-white':            '#f0ede8',
  // Dyed
  'dyed-jet-black':         '#0a0a0a',
  'dyed-burgundy':          '#6b1c3a',
  'dyed-cherry-red':        '#9b1b30',
  'dyed-bright-red':        '#d62020',
  'dyed-rose-gold':         '#c9908a',
  'dyed-pastel-pink':       '#f2b5c8',
  'dyed-hot-pink':          '#e0308a',
  'dyed-lavender':          '#b19cd9',
  'dyed-purple':            '#7b2d8e',
  'dyed-blue':              '#2a5fcc',
  'dyed-teal-green':        '#2a9d8f',
  'dyed-peach':             '#f4a87d',
  'dyed-silver':            '#c0c0c0',
  'dyed-ombre':             ['#3b2213', '#d4a84b'],
  'dyed-balayage':          ['#6b3a2a', '#c8a96e'],
  'dyed-highlights':        ['#6b3a2a', '#e8dcc8'],
  'dyed-split':             ['#1a1a1a', '#e8dcc8'],
};

/** Returns true when white text is needed on a given hex background. */
export function needsLightTextOnColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
}
