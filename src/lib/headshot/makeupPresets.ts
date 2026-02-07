import type { PresetCategory } from './presetTypes';

export const makeupPresets: PresetCategory[] = [
  {
    id: 'major-aesthetics',
    title: 'Major Makeup Aesthetics',
    sections: [
      {
        id: 'overall-styles',
        title: 'Overall Styles',
        options: [
          {
            id: 'no-makeup-makeup',
            title: 'No-Makeup Makeup (Clean Girl)',
            description:
              'Focuses on skin prep, groomed brows, and enhancing natural features undetectably.',
          },
          {
            id: 'soft-glam',
            title: 'Soft Glam',
            description:
              'Polished and defined but free of harsh lines. Uses neutral tones, blended eyeshadows, and satin skin finishes.',
          },
          {
            id: 'full-glam',
            title: 'Full Glam / Insta-Glam',
            description:
              'High coverage, sharp contour, cut-crease eyeshadow, baking, and heavy false lashes.',
          },
          {
            id: 'matte-90s',
            title: 'Matte / 90s Supermodel',
            description:
              'Velvety skin, cool-toned brown lips, thin arched brows, and matte eyeshadows.',
          },
          {
            id: 'dewy-glass-skin',
            title: 'Dewy / Glass Skin',
            description:
              'Extreme hydration, liquid highlighters, and cream products for a wet, reflective skin finish.',
          },
          {
            id: 'grunge',
            title: 'Grunge / Rocker Chic',
            description:
              'Smudged eyeliner, dark or messy eyeshadow, and effortless or lived-in matte lips.',
          },
          {
            id: 'editorial',
            title: 'Editorial / Avant-Garde',
            description:
              'Artistic and experimental with graphic liners, bold colors, bleached brows, or floating creases.',
          },
          {
            id: 'vintage-pinup',
            title: 'Vintage / Pin-Up',
            description:
              'Sharp winged liner, red matte lip, and pale, matte skin.',
          },
          {
            id: 'k-beauty',
            title: 'K-Beauty (Korean Style)',
            description:
              'Straight brows, gradient bitten lips, puppy eyeliner, and glittery peach-toned eyeshadows.',
          },
          {
            id: 'latte',
            title: 'Latte / Monochromatic',
            description:
              'Shades of brown, bronze, and tan across eyes, cheeks, and lips for a warm, sun-kissed look.',
          },
          {
            id: 'coquette-cold-girl',
            title: 'Coquette / Cold Girl',
            description:
              'Heavy blush on the nose and cheeks, doll-like lashes, and glossy lips.',
          },
        ],
      },
    ],
  },
  {
    id: 'foundation-base',
    title: 'Foundation & Base',
    sections: [
      {
        id: 'finishes',
        title: 'Finishes',
        options: [
          {
            id: 'matte-finish',
            title: 'Matte',
            description:
              'Flat, velvety finish with no shine. Best for oily skin or long-wear.',
          },
          {
            id: 'dewy-finish',
            title: 'Dewy / Radiant',
            description: 'Wet-look, reflective finish. Best for dry skin.',
          },
          {
            id: 'satin-finish',
            title: 'Satin / Natural',
            description:
              'A balance between matte and dewy; mimics real skin texture.',
          },
          {
            id: 'sheer-finish',
            title: 'Sheer',
            description:
              'Translucent coverage that lets freckles show through (e.g., skin tints).',
          },
        ],
      },
      {
        id: 'techniques',
        title: 'Techniques',
        options: [
          {
            id: 'full-coverage',
            title: 'Full Coverage',
            description: 'Completely covers blemishes and uneven tone.',
          },
          {
            id: 'spot-conceal',
            title: 'Spot Concealing',
            description:
              'Using foundation/concealer only on specific blemishes, leaving the rest of the skin bare.',
          },
          {
            id: 'tantouring',
            title: 'Tantouring',
            description:
              'Using self-tanner to semi-permanently contour the face base.',
          },
        ],
      },
    ],
  },
  {
    id: 'eyeshadow-styles',
    title: 'Eyeshadow Styles',
    sections: [
      {
        id: 'eyeshadow-techniques',
        title: 'Techniques',
        options: [
          {
            id: 'wash-of-color',
            title: 'Wash of Color',
            description: 'A single shade applied all over the lid for a simple look.',
          },
          {
            id: 'smokey-eye',
            title: 'Smokey Eye',
            description:
              'Darkest at the lash line and fades upwards; usually black, gray, or bronze.',
          },
          {
            id: 'cut-crease',
            title: 'Cut Crease',
            description:
              'A sharp line of concealer is used to cut the eyeshadow crease for dramatic contrast.',
          },
          {
            id: 'halo-eye',
            title: 'Halo Eye (Spotlight)',
            description:
              'Dark shadow on the inner and outer corners with a bright shimmer in the center.',
          },
          {
            id: 'gradient-eyeshadow',
            title: 'Gradient',
            description:
              'Color fades horizontally from light (inner corner) to dark (outer corner).',
          },
          {
            id: 'fox-eye',
            title: 'Fox Eye',
            description:
              'Shadow is pulled outwards and upwards toward the temples to elongate the eye shape.',
          },
        ],
      },
    ],
  },
  {
    id: 'eyeliner-styles',
    title: 'Eyeliner Styles',
    sections: [
      {
        id: 'eyeliner-techniques',
        title: 'Techniques',
        options: [
          {
            id: 'classic-wing',
            title: 'Classic Wing',
            description: 'A sharp flick extending outward from the upper lash line.',
          },
          {
            id: 'cat-eye',
            title: 'Cat Eye',
            description:
              'A thick wing that connects the top and bottom lash lines.',
          },
          {
            id: 'puppy-eyeliner',
            title: 'Puppy Eyeliner',
            description:
              'The wing is directed slightly downward to make eyes look rounder.',
          },
          {
            id: 'tightlining',
            title: 'Tightlining (Invisible Liner)',
            description:
              'Liner inside the upper waterline to thicken lashes without a visible line.',
          },
          {
            id: 'smudged-liner',
            title: 'Smudged / Blown Out',
            description:
              'Pencil liner is applied and buffed out for a soft, hazy edge.',
          },
          {
            id: 'graphic-liner',
            title: 'Graphic / Floating Liner',
            description:
              'Lines drawn in the crease or above the brow bone, often unconnected to the lash line.',
          },
          {
            id: 'reverse-cat-eye',
            title: 'Reverse Cat Eye',
            description:
              'Wing is created on the lower lash line rather than the top.',
          },
        ],
      },
    ],
  },
  {
    id: 'blush-placements',
    title: 'Blush Placements',
    sections: [
      {
        id: 'blush-techniques',
        title: 'Placements',
        options: [
          {
            id: 'apple-cheeks',
            title: 'Apple of the Cheeks',
            description:
              'Applied to the roundest part of the cheek for a youthful look.',
          },
          {
            id: 'lifted-draping',
            title: 'Lifted / Draping',
            description:
              'Applied high on the cheekbones and blended into the temples.',
          },
          {
            id: 'sunburn-w',
            title: 'Sunburn / W Shape',
            description:
              'Swept across the cheeks and over the bridge of the nose.',
          },
          {
            id: 'igari',
            title: 'Igari (Hangover Makeup)',
            description:
              'Blush applied under the eyes and high on the upper cheeks.',
          },
          {
            id: 'contour-blush',
            title: 'Contour Blush',
            description:
              'Neutral or brown-toned blush in the hollows instead of bronzer.',
          },
        ],
      },
    ],
  },
  {
    id: 'lip-styles',
    title: 'Lip Styles',
    sections: [
      {
        id: 'lip-finishes',
        title: 'Finishes',
        options: [
          {
            id: 'full-matte',
            title: 'Full Matte',
            description:
              'Sharply defined edges with a dry, long-lasting finish.',
          },
          {
            id: 'ombre-gradient',
            title: 'Ombré / Gradient',
            description:
              'Darker in the center and fading out (or vice versa).',
          },
          {
            id: 'overlined',
            title: 'Overlined',
            description:
              'Liner drawn slightly outside the natural border for fuller lips.',
          },
          {
            id: 'blotted-stained',
            title: 'Blotted / Stained',
            description:
              'Lipstick applied and patted off for a sheer, just-bitten effect.',
          },
          {
            id: 'glossy-vinyl',
            title: 'Glossy / Vinyl',
            description: 'High-shine, wet-look finish.',
          },
          {
            id: 'blurred-edge',
            title: 'Blurred Edge',
            description:
              'No sharp lip line; pigment is buffed out for a soft, romantic look.',
          },
        ],
      },
    ],
  },
  {
    id: 'eyebrow-styles',
    title: 'Eyebrow Styles',
    sections: [
      {
        id: 'brow-techniques',
        title: 'Styles',
        options: [
          {
            id: 'soap-brows',
            title: 'Soap Brows / Laminated',
            description:
              'Hairs brushed vertically and set for a feathery, fluffy look.',
          },
          {
            id: 'instagram-brow',
            title: 'Instagram Brow (2016 Style)',
            description:
              'Defined ombre effect with a carved-out shape using concealer.',
          },
          {
            id: 'straight-brow',
            title: 'Straight Brow',
            description:
              'Minimal arch, running straight across for a youthful look.',
          },
          {
            id: 'skinny-brow',
            title: 'Skinny Brow',
            description:
              'Thin, highly arched brows reminiscent of the 90s/Y2K.',
          },
          {
            id: 'natural-groomed',
            title: 'Natural / Groomed',
            description:
              'Lightly filled following the natural shape, set with gel.',
          },
          {
            id: 'bleached-brows',
            title: 'Bleached',
            description:
              'Lightened to match the skin tone for an editorial look.',
          },
        ],
      },
    ],
  },
];
