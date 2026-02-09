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
      {
        id: 'eyeshadow-colors',
        title: 'Colors',
        options: [
          {
            id: 'eyeshadow-warm-neutrals',
            title: 'Warm Neutrals',
            description: 'Soft browns, tans, and golden tones.',
          },
          {
            id: 'eyeshadow-cool-neutrals',
            title: 'Cool Neutrals',
            description: 'Taupes, greys, and muted mauves.',
          },
          {
            id: 'eyeshadow-warm-bronze',
            title: 'Bronze / Copper',
            description: 'Warm metallic bronze and copper shimmers.',
          },
          {
            id: 'eyeshadow-gold',
            title: 'Gold',
            description: 'Rich gold and champagne tones.',
          },
          {
            id: 'eyeshadow-rose-pink',
            title: 'Rose / Pink',
            description: 'Soft pinks, dusty roses, and blush tones.',
          },
          {
            id: 'eyeshadow-berry-plum',
            title: 'Berry / Plum',
            description: 'Deep berries, plums, and burgundy shades.',
          },
          {
            id: 'eyeshadow-smokey-black',
            title: 'Smokey Black',
            description: 'Deep black and charcoal tones.',
          },
          {
            id: 'eyeshadow-olive-green',
            title: 'Olive / Green',
            description: 'Earthy greens, olives, and khaki tones.',
          },
          {
            id: 'eyeshadow-blue-navy',
            title: 'Blue / Navy',
            description: 'Cool blues from navy to cobalt.',
          },
          {
            id: 'eyeshadow-purple',
            title: 'Purple / Violet',
            description: 'Vibrant purples and deep violets.',
          },
          {
            id: 'eyeshadow-orange-coral',
            title: 'Orange / Coral',
            description: 'Warm oranges, corals, and peach tones.',
          },
          {
            id: 'eyeshadow-silver',
            title: 'Silver',
            description: 'Cool metallic silver and pewter shimmers.',
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
      {
        id: 'eyeliner-colors',
        title: 'Colors',
        options: [
          {
            id: 'eyeliner-black',
            title: 'Black',
            description: 'Classic jet-black liner.',
          },
          {
            id: 'eyeliner-dark-brown',
            title: 'Dark Brown',
            description: 'A softer, warm alternative to black.',
          },
          {
            id: 'eyeliner-grey',
            title: 'Grey / Charcoal',
            description: 'Muted cool-toned liner.',
          },
          {
            id: 'eyeliner-navy',
            title: 'Navy',
            description: 'A deep blue-black with a subtle blue undertone.',
          },
          {
            id: 'eyeliner-forest-green',
            title: 'Forest Green',
            description: 'A deep, rich green.',
          },
          {
            id: 'eyeliner-plum',
            title: 'Plum / Burgundy',
            description: 'Deep wine-toned liner.',
          },
          {
            id: 'eyeliner-white',
            title: 'White / Nude',
            description:
              'Used on the waterline to brighten and open eyes.',
          },
          {
            id: 'eyeliner-metallic-gold',
            title: 'Metallic Gold',
            description: 'Warm, shimmery gold liner.',
          },
          {
            id: 'eyeliner-metallic-silver',
            title: 'Metallic Silver',
            description: 'Cool, shimmery silver liner.',
          },
          {
            id: 'eyeliner-bright-color',
            title: 'Bright / Electric',
            description:
              'Vivid colored liner (blue, teal, violet, etc.).',
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
      {
        id: 'blush-colors',
        title: 'Colors',
        options: [
          {
            id: 'blush-soft-pink',
            title: 'Soft Pink',
            description: 'A light, cool-toned pink.',
          },
          {
            id: 'blush-peach',
            title: 'Peach',
            description: 'A warm, orange-tinged pink.',
          },
          {
            id: 'blush-coral',
            title: 'Coral',
            description:
              'A vibrant warm pink with orange undertones.',
          },
          {
            id: 'blush-rose',
            title: 'Rose / Dusty Rose',
            description: 'A muted, mid-tone mauve-pink.',
          },
          {
            id: 'blush-berry',
            title: 'Berry',
            description: 'A deep, cool-toned reddish-purple.',
          },
          {
            id: 'blush-mauve',
            title: 'Mauve',
            description: 'A soft, muted purple-pink.',
          },
          {
            id: 'blush-warm-nude',
            title: 'Warm Nude / Bronze',
            description:
              'A subtle, skin-tone warmth (bronzy blush).',
          },
          {
            id: 'blush-apricot',
            title: 'Apricot',
            description: 'A warm, soft orange-peach.',
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
      {
        id: 'lip-colors',
        title: 'Colors',
        options: [
          {
            id: 'lip-classic-red',
            title: 'Classic Red',
            description: 'A true, balanced red.',
          },
          {
            id: 'lip-deep-red',
            title: 'Deep Red / Crimson',
            description: 'A darker, dramatic red.',
          },
          {
            id: 'lip-berry',
            title: 'Berry',
            description: 'A cool-toned, reddish-purple.',
          },
          {
            id: 'lip-wine',
            title: 'Wine / Burgundy',
            description: 'A deep, dark berry-red.',
          },
          {
            id: 'lip-mauve',
            title: 'Mauve',
            description: 'A muted, dusty pink-purple.',
          },
          {
            id: 'lip-nude-pink',
            title: 'Nude Pink',
            description: 'A natural pink close to skin tone.',
          },
          {
            id: 'lip-warm-nude',
            title: 'Warm Nude',
            description: 'A peachy or brown-toned nude.',
          },
          {
            id: 'lip-coral',
            title: 'Coral',
            description: 'A warm, orange-tinged pink.',
          },
          {
            id: 'lip-peach',
            title: 'Peach',
            description: 'A soft, warm light orange-pink.',
          },
          {
            id: 'lip-rose',
            title: 'Rose',
            description: 'A mid-tone, classic rosy pink.',
          },
          {
            id: 'lip-hot-pink',
            title: 'Hot Pink / Fuchsia',
            description: 'A bright, vibrant cool pink.',
          },
          {
            id: 'lip-plum',
            title: 'Plum',
            description: 'A dark, muted purple.',
          },
          {
            id: 'lip-brown',
            title: 'Brown / 90s Brown',
            description: 'A warm or cool-toned brown lip.',
          },
          {
            id: 'lip-orange',
            title: 'Orange',
            description: 'A bold, warm true orange.',
          },
          {
            id: 'lip-clear-gloss',
            title: 'Clear / No Tint',
            description:
              'Transparent gloss or balm with no color pigment.',
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
      {
        id: 'eyebrow-colors',
        title: 'Colors',
        options: [
          {
            id: 'brow-black',
            title: 'Black',
            description:
              'A strong, dark brow matching deep hair tones.',
          },
          {
            id: 'brow-dark-brown',
            title: 'Dark Brown',
            description: 'A rich brown for medium-to-dark hair.',
          },
          {
            id: 'brow-medium-brown',
            title: 'Medium Brown',
            description: 'A soft, neutral brown.',
          },
          {
            id: 'brow-taupe',
            title: 'Taupe',
            description:
              'A cool, ashy light brown for fair hair.',
          },
          {
            id: 'brow-blonde',
            title: 'Blonde',
            description: 'A light, warm tone for blonde hair.',
          },
          {
            id: 'brow-auburn',
            title: 'Auburn / Red',
            description:
              'A warm, reddish-brown for red hair.',
          },
          {
            id: 'brow-grey',
            title: 'Grey',
            description: 'A cool, silver-toned brow.',
          },
        ],
      },
    ],
  },
];
