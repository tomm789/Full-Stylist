import type { PresetCategory } from './presetTypes';

export const hairPresets: PresetCategory[] = [
  {
    id: 'short-hairstyles',
    title: 'Short Hairstyles',
    sections: [
      {
        id: 'short-styles',
        title: 'Styles',
        options: [
          {
            id: 'pixie-cut',
            title: 'Pixie Cut',
            description:
              'A cropped cut that is short on the back and sides and slightly longer on top.',
          },
          {
            id: 'bixie',
            title: 'Bixie',
            description: 'A pixie-bob hybrid with short length and a softer silhouette.',
          },
          {
            id: 'long-pixie',
            title: 'Long Pixie',
            description: 'A longer pixie with more texture and length.',
          },
          {
            id: 'classic-bob',
            title: 'Classic Bob',
            description: 'Straight cut around the jawline.',
          },
          {
            id: 'french-bob',
            title: 'French Bob',
            description:
              'Chin-length, often paired with bangs and a natural, tousled texture.',
          },
          {
            id: 'blunt-bob',
            title: 'Blunt Bob',
            description: 'Sharp, straight-across cut with no layers.',
          },
          {
            id: 'inverted-bob',
            title: 'Inverted / A-Line Bob',
            description: 'Shorter in the back, angling longer toward the front.',
          },
          {
            id: 'buzz-cut',
            title: 'Buzz Cut',
            description: 'Hair shaved very close to the scalp (uniform or faded).',
          },
          {
            id: 'undercut',
            title: 'Undercut',
            description:
              'Shaved sides or back with significantly longer hair on top.',
          },
          {
            id: 'bowl-cut',
            title: 'Bowl Cut',
            description:
              'A rounded cut with a straight fringe (modern versions are often textured).',
          },
        ],
      },
    ],
  },
  {
    id: 'medium-hairstyles',
    title: 'Medium Hairstyles (Shoulder to Collarbone)',
    sections: [
      {
        id: 'medium-styles',
        title: 'Styles',
        options: [
          {
            id: 'lob',
            title: 'Lob (Long Bob)',
            description:
              'A bob that falls just above the shoulders or touches the collarbone.',
          },
          {
            id: 'shag-cut',
            title: 'Shag Cut',
            description:
              'Heavily layered with choppy ends and volume at the crown, often paired with curtain bangs.',
          },
          {
            id: 'wolf-cut',
            title: 'Wolf Cut',
            description:
              'A trendy hybrid of the shag and mullet; wild, voluminous layers with a taper.',
          },
          {
            id: 'mullet',
            title: 'Mullet',
            description:
              'Shorter at the front and sides, significantly longer in the back (modern versions are softer).',
          },
          {
            id: 'clavicut',
            title: 'Clavicut',
            description:
              'A blunt cut that hits exactly at the collarbone (clavicle), offering a versatile length.',
          },
        ],
      },
    ],
  },
  {
    id: 'long-hairstyles',
    title: 'Long Hairstyles',
    sections: [
      {
        id: 'long-styles',
        title: 'Styles',
        options: [
          {
            id: 'layered-cut',
            title: 'Layered Cut',
            description:
              'Hair is cut at different lengths to create movement and remove weight.',
          },
          {
            id: 'face-framing-layers',
            title: 'Face-Framing Layers',
            description: 'Layers that contour and soften the face shape.',
          },
          {
            id: 'waterfall-layers',
            title: 'Waterfall Layers',
            description: 'Long, cascading layers that create a flowing effect.',
          },
          {
            id: 'v-cut-u-cut',
            title: 'V-Cut / U-Cut',
            description:
              'The back perimeter is shaped into a V or U curve rather than cut straight across.',
          },
          {
            id: 'long-blunt-cut',
            title: 'Blunt Cut',
            description:
              'Long hair cut straight across at the bottom for a thick, healthy look.',
          },
          {
            id: 'hime-cut',
            title: 'Hime Cut',
            description:
              'A Japanese style featuring long straight hair with blunt, cheek-length sidelocks.',
          },
          {
            id: 'mermaid-waves',
            title: 'Mermaid Waves',
            description:
              'Very long, loose, uniform waves (often achieved with extensions or wafers).',
          },
        ],
      },
    ],
  },
  {
    id: 'braids-protective',
    title: 'Braids & Protective Styles',
    sections: [
      {
        id: 'braids-styles',
        title: 'Styles',
        options: [
          {
            id: 'box-braids',
            title: 'Box Braids',
            description:
              'Three-strand plaits divided into square-shaped sections (can be knotless).',
          },
          {
            id: 'cornrows',
            title: 'Cornrows',
            description:
              'Braids plaited flat against the scalp in straight lines or geometric designs.',
          },
          {
            id: 'french-braid',
            title: 'French Braid',
            description:
              'A three-strand braid that gathers hair as it moves down the head.',
          },
          {
            id: 'dutch-braid',
            title: 'Dutch Braid',
            description:
              'Similar to French, but strands are crossed under for a 3D effect.',
          },
          {
            id: 'fishtail-braid',
            title: 'Fishtail Braid',
            description:
              'An intricate braid using two sections of hair instead of three.',
          },
          {
            id: 'goddess-braids',
            title: 'Goddess Braids',
            description:
              'Thick, raised cornrows or braids, often with loose curls added for a bohemian look.',
          },
          {
            id: 'locs',
            title: 'Locs (Dreadlocks)',
            description: 'Hair that is matted or wrapped to form rope-like strands.',
          },
          {
            id: 'twists',
            title: 'Twists',
            description:
              'Two-strand twists (e.g., Passion Twists, Senegalese Twists).',
          },
        ],
      },
    ],
  },
  {
    id: 'updos-tied',
    title: 'Updos & Tied Styles',
    sections: [
      {
        id: 'updo-styles',
        title: 'Styles',
        options: [
          {
            id: 'messy-bun',
            title: 'Messy Bun',
            description: 'Relaxed, textured bun often worn high with loose strands.',
          },
          {
            id: 'chignon',
            title: 'Chignon',
            description: 'A low, elegant knot or bun pinned at the nape of the neck.',
          },
          {
            id: 'top-knot',
            title: 'Top Knot',
            description: 'A sleek or messy bun positioned at the crown of the head.',
          },
          {
            id: 'space-buns',
            title: 'Space Buns',
            description: 'Two buns worn on either side of the top of the head.',
          },
          {
            id: 'high-pony',
            title: 'High Pony',
            description: 'Secured at the crown for a lifted look.',
          },
          {
            id: 'bubble-ponytail',
            title: 'Bubble Ponytail',
            description:
              'Elastic bands placed at intervals down the ponytail to create bubbles.',
          },
          {
            id: 'french-twist',
            title: 'French Twist',
            description:
              'Hair is gathered and twisted inward against the back of the head, secured with pins.',
          },
          {
            id: 'half-up',
            title: 'Half-Up Half-Down',
            description:
              'The top section is tied back (bun or pony) while the bottom flows loose.',
          },
        ],
      },
    ],
  },
  {
    id: 'bangs-fringe',
    title: 'Bangs (Fringe) Styles',
    sections: [
      {
        id: 'bangs-styles',
        title: 'Styles',
        options: [
          {
            id: 'curtain-bangs',
            title: 'Curtain Bangs',
            description:
              'Parted down the middle to frame the face like curtains (70s style).',
          },
          {
            id: 'wispy-bangs',
            title: 'Wispy Bangs',
            description: 'Soft, feathery, and see-through; not heavy or blunt.',
          },
          {
            id: 'blunt-bangs',
            title: 'Blunt Bangs',
            description: 'Thick, straight-across fringe cut at the eyebrows.',
          },
          {
            id: 'side-swept-bangs',
            title: 'Side-Swept Bangs',
            description: 'Long bangs swept to one side of the forehead.',
          },
          {
            id: 'micro-bangs',
            title: 'Micro Bangs (Baby Bangs)',
            description: 'Very short fringe that sits high on the forehead.',
          },
        ],
      },
    ],
  },
  {
    id: 'hair-color',
    title: 'Hair Color',
    sections: [
      {
        id: 'natural-colors',
        title: 'Natural Colors',
        options: [
          {
            id: 'color-black',
            title: 'Black',
            description: 'Deep, true black hair with a natural sheen.',
          },
          {
            id: 'color-dark-brown',
            title: 'Dark Brown',
            description: 'A rich, deep brown that appears nearly black in low light.',
          },
          {
            id: 'color-medium-brown',
            title: 'Medium Brown',
            description: 'A warm, mid-tone brown with natural depth.',
          },
          {
            id: 'color-light-brown',
            title: 'Light Brown / Chestnut',
            description:
              'A lighter brown with warm, reddish-golden undertones.',
          },
          {
            id: 'color-dirty-blonde',
            title: 'Dirty Blonde',
            description:
              'A darker, muted blonde that sits between brown and golden tones.',
          },
          {
            id: 'color-golden-blonde',
            title: 'Golden Blonde',
            description: 'A warm, sun-kissed blonde with honey undertones.',
          },
          {
            id: 'color-platinum-blonde',
            title: 'Platinum Blonde',
            description:
              'A very light, cool-toned blonde that is almost white.',
          },
          {
            id: 'color-strawberry-blonde',
            title: 'Strawberry Blonde',
            description:
              'A blend of blonde and light red, giving a warm pinkish-golden hue.',
          },
          {
            id: 'color-auburn',
            title: 'Auburn',
            description: 'A reddish-brown color with warm copper undertones.',
          },
          {
            id: 'color-copper-red',
            title: 'Copper / Red',
            description:
              'A vibrant, warm red with strong orange-copper tones.',
          },
          {
            id: 'color-ginger',
            title: 'Ginger',
            description:
              'A natural orange-red tone, lighter and brighter than auburn.',
          },
          {
            id: 'color-silver-grey',
            title: 'Silver / Grey',
            description:
              'Naturally greyed or silver hair, ranging from salt-and-pepper to fully silver.',
          },
          {
            id: 'color-white',
            title: 'White',
            description: 'Completely white hair with no remaining pigment.',
          },
        ],
      },
      {
        id: 'dyed-colors',
        title: 'Dyed Colors',
        options: [
          {
            id: 'dyed-jet-black',
            title: 'Jet Black',
            description:
              'An intense blue-black dye that is darker and cooler than natural black.',
          },
          {
            id: 'dyed-burgundy',
            title: 'Burgundy / Wine',
            description: 'A deep, dark red with purple undertones.',
          },
          {
            id: 'dyed-cherry-red',
            title: 'Cherry Red',
            description: 'A bold, saturated true red.',
          },
          {
            id: 'dyed-bright-red',
            title: 'Bright Red',
            description:
              'A vivid, fiery red that is lighter and more intense than cherry.',
          },
          {
            id: 'dyed-rose-gold',
            title: 'Rose Gold',
            description: 'A soft, warm pink-gold metallic tone.',
          },
          {
            id: 'dyed-pastel-pink',
            title: 'Pastel Pink',
            description: 'A light, muted pink with a soft, dreamy quality.',
          },
          {
            id: 'dyed-hot-pink',
            title: 'Hot Pink / Magenta',
            description: 'A bold, saturated pink with blue undertones.',
          },
          {
            id: 'dyed-lavender',
            title: 'Lavender',
            description: 'A soft, pastel purple with cool, muted tones.',
          },
          {
            id: 'dyed-purple',
            title: 'Purple / Violet',
            description: 'A rich, deep purple ranging from plum to electric violet.',
          },
          {
            id: 'dyed-blue',
            title: 'Blue',
            description:
              'Dyed blue hair, from deep navy to bright electric blue.',
          },
          {
            id: 'dyed-teal-green',
            title: 'Teal / Green',
            description:
              'A cool-toned color ranging from blue-green teal to emerald or forest green.',
          },
          {
            id: 'dyed-peach',
            title: 'Peach / Apricot',
            description: 'A warm, soft orange-pink pastel tone.',
          },
          {
            id: 'dyed-silver',
            title: 'Silver (Metallic)',
            description:
              'A deliberately dyed, high-shine silver with a cool metallic finish.',
          },
          {
            id: 'dyed-ombre',
            title: 'Ombré',
            description:
              'A gradient effect with darker roots transitioning to lighter ends.',
          },
          {
            id: 'dyed-balayage',
            title: 'Balayage',
            description:
              'Hand-painted highlights that create a natural, sun-kissed gradient.',
          },
          {
            id: 'dyed-highlights',
            title: 'Highlights / Lowlights',
            description:
              'Lighter or darker streaks woven through the base color for dimension.',
          },
          {
            id: 'dyed-split',
            title: 'Split Dye',
            description:
              'Hair divided into two distinct colors, typically down the centre part.',
          },
        ],
      },
    ],
  },
  {
    id: 'hair-length',
    title: 'Hair Length',
    sections: [
      {
        id: 'hair-lengths',
        title: 'Lengths',
        options: [
          {
            id: 'length-buzz',
            title: 'Buzz / Shaved',
            description:
              'Less than an inch of length; hair is clipped very close to the scalp.',
          },
          {
            id: 'length-ear',
            title: 'Ear Length',
            description:
              'Hair reaches the tops of the ears, a short crop with some texture.',
          },
          {
            id: 'length-chin',
            title: 'Chin Length',
            description:
              'Hair falls to the jawline, typical of bobs and short styles.',
          },
          {
            id: 'length-shoulder',
            title: 'Shoulder Length',
            description:
              'Hair reaches the shoulders, a versatile medium length.',
          },
          {
            id: 'length-collarbone',
            title: 'Collarbone Length',
            description:
              'Hair falls to the collarbone, sitting between medium and long.',
          },
          {
            id: 'length-mid-back',
            title: 'Mid-Back Length',
            description:
              'Hair extends to the middle of the back, a classic long length.',
          },
          {
            id: 'length-waist',
            title: 'Waist Length',
            description:
              'Hair reaches the natural waistline, noticeably long.',
          },
          {
            id: 'length-hip',
            title: 'Hip Length & Beyond',
            description:
              'Very long hair that extends to the hips or further.',
          },
        ],
      },
    ],
  },
];
