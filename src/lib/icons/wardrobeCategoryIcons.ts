import {
  AccessoriesIcon,
  ActivewearIcon,
  BagsIcon,
  BottomsIcon,
  DressesIcon,
  IntimatesIcon,
  JewelleryIcon,
  JumpsuitsRompersIcon,
  KnitwearIcon,
  OuterwearIcon,
  ShoesIcon,
  SleepwearLoungewearIcon,
  SwimwearIcon,
  TopsIcon,
} from '@/components/icons/wardrobe';

export type WardrobeCategoryIconSource = 'phosphor' | 'lucide-lab';

export type WardrobeCategoryIcon = {
  category: string;
  iconName: string;
  source: WardrobeCategoryIconSource;
  file: string;
};

export const wardrobeCategoryIconMap: Record<string, WardrobeCategoryIcon> = {
  'Tops': {
    category: 'Tops',
    iconName: 'shirt-folded',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/tops.svg',
  },
  'Bottoms': {
    category: 'Bottoms',
    iconName: 'pants',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/bottoms.svg',
  },
  'Dresses': {
    category: 'Dresses',
    iconName: 'dress',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/dress-stylish-svgrepo-com.svg',
  },
  'Jumpsuits & Rompers': {
    category: 'Jumpsuits & Rompers',
    iconName: 'person-simple',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/jumpsuits-rompers.svg',
  },
  'Outerwear': {
    category: 'Outerwear',
    iconName: 'hoodie',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/jacket-coat-svgrepo-com.svg',
  },
  'Knitwear': {
    category: 'Knitwear',
    iconName: 'sweater',
    source: 'lucide-lab',
    file: 'assets/icons/wardrobe/sweater-svgrepo-com.svg',
  },
  'Activewear': {
    category: 'Activewear',
    iconName: 'person-simple-run',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/activewear.svg',
  },
  'Sleepwear & Loungewear': {
    category: 'Sleepwear & Loungewear',
    iconName: 'bed',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/sleepwear-loungewear.svg',
  },
  'Swimwear': {
    category: 'Swimwear',
    iconName: 'swimming-pool',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/swimwear.svg',
  },
  'Shoes': {
    category: 'Shoes',
    iconName: 'boot',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/shoes.svg',
  },
  'Bags': {
    category: 'Bags',
    iconName: 'handbag-simple',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/bags.svg',
  },
  'Accessories': {
    category: 'Accessories',
    iconName: 'belt',
    source: 'lucide-lab',
    file: 'assets/icons/wardrobe/accessories.svg',
  },
  'Jewellery': {
    category: 'Jewellery',
    iconName: 'diamond',
    source: 'phosphor',
    file: 'assets/icons/wardrobe/jewellery.svg',
  },
  'Intimates': {
    category: 'Intimates',
    iconName: 'lingerie',
    source: 'lucide-lab',
    file: 'assets/icons/wardrobe/intimates.svg',
  },
};

export type WardrobeCategoryIconComponent = React.ComponentType<import('react-native-svg').SvgProps>;

export const wardrobeCategoryIconComponents: Record<string, WardrobeCategoryIconComponent> = {
  'Tops': TopsIcon,
  'Bottoms': BottomsIcon,
  'Dresses': DressesIcon,
  'Jumpsuits & Rompers': JumpsuitsRompersIcon,
  'Outerwear': OuterwearIcon,
  'Knitwear': KnitwearIcon,
  'Activewear': ActivewearIcon,
  'Sleepwear & Loungewear': SleepwearLoungewearIcon,
  'Swimwear': SwimwearIcon,
  'Shoes': ShoesIcon,
  'Bags': BagsIcon,
  'Accessories': AccessoriesIcon,
  'Jewellery': JewelleryIcon,
  'Intimates': IntimatesIcon,
};

export const wardrobeCategoryIconList = Object.values(wardrobeCategoryIconMap);
