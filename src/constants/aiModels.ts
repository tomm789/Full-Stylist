import type { AIModelSettingKey, AIModelLockKey } from '@/hooks/profile';

export interface ModelInfo {
  id: string;
  name: string;
  family: string;
  summary: string;
  price: string;
  description: string;
}

export interface GenerationSetting {
  key: AIModelSettingKey;
  lockKey: AIModelLockKey;
  label: string;
  description: string;
  defaultModel: string;
}

export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
export const DEFAULT_BODY_MODEL = 'gemini-3-pro-image-preview';

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana / Standard',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Conversational image generation and editing.',
    price: 'Price: $0.039 per image',
    description:
      'A fast, cost-efficient multimodal model for conversational image generation, edits, and character consistency.',
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Nano Banana Pro / Stable',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Stable pro-quality multimodal imaging.',
    price: 'Price: $0.134 per image',
    description:
      'Stable, high-quality multimodal image model with strong composition and consistency.',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Latest Experimental',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Experimental features and newest capabilities.',
    price: 'Price: $0.100 per image (Discounted for testing)',
    description:
      'Preview model with the latest experimental features. Best for testing new capabilities.',
  },
  {
    id: 'gemini-3-pro-image-001',
    name: 'Versioned Snapshot',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Fixed versioned snapshot.',
    price: 'Price: $0.134 per image',
    description:
      'Versioned snapshot for reproducible outputs. Use for stable production behavior.',
  },
  {
    id: 'imagen-4.0-fast',
    name: 'Imagen 4 Fast',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Optimized for speed and lower cost.',
    price: 'Price: $0.03 per image',
    description:
      'High-fidelity text-to-image diffusion model optimized for speed and cost.',
  },
  {
    id: 'imagen-4.0-generate',
    name: 'Imagen 4 Standard',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Standard high-quality production model.',
    price: 'Price: $0.05 per image',
    description:
      'Balanced quality and speed for production-grade text-to-image generation.',
  },
  {
    id: 'imagen-4.0-ultra',
    name: 'Imagen 4 Ultra',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Highest resolution and photorealism.',
    price: 'Price: $0.06 per image',
    description:
      'Maximum fidelity and photorealism for premium outputs.',
  },
  {
    id: 'imagen-4.0-edit-001',
    name: 'Imagen 4 Edit',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Mask-based inpainting/outpainting.',
    price: 'Price: $0.03 per edit (Inpainting/Outpainting)',
    description:
      'Specialized for inpainting/outpainting and mask-based edits.',
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash (Vision)',
    family: 'Gemini Vision Family (Analysis)',
    summary: 'Fast, low-cost vision/OCR.',
    price: 'Input: $0.30 / Output: $2.50 per 1M tokens',
    description:
      'Optimized for fast image analysis, OCR, and attribute extraction.',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro (Vision)',
    family: 'Gemini Vision Family (Analysis)',
    summary: 'High-reasoning multimodal analysis.',
    price: 'Input: $1.25 / Output: $10.00 per 1M tokens',
    description:
      'Higher reasoning for complex image analysis and extraction tasks.',
  },
  {
    id: 'veo-3.1-generate-001',
    name: 'Veo 3.1 Standard',
    family: 'Video Generation Family',
    summary: 'Standard video generation.',
    price: 'Price: $0.30 per 5-second clip (1080p)',
    description:
      'Generates motion and cinematic video clips from prompts.',
  },
  {
    id: 'veo-3.1-pro-001',
    name: 'Veo 3.1 Pro',
    family: 'Video Generation Family',
    summary: 'Extended duration and higher fidelity.',
    price: 'Price: $0.80 per 5-second clip (4K)',
    description:
      'Higher fidelity, longer duration video generation.',
  },
];

export const MODEL_KEYS: AIModelSettingKey[] = [
  'ai_model_outfit_render',
  'ai_model_outfit_mannequin',
  'ai_model_wardrobe_item_generate',
  'ai_model_wardrobe_item_render',
  'ai_model_product_shot',
  'ai_model_headshot_generate',
  'ai_model_body_shot_generate',
  'ai_model_auto_tag',
  'ai_model_style_advice',
];

export const GENERATION_SETTINGS: GenerationSetting[] = [
  {
    key: 'ai_model_outfit_render',
    lockKey: 'ai_model_lock_outfit_render',
    label: 'Outfit Render',
    description: 'Final outfit render on your body.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_outfit_mannequin',
    lockKey: 'ai_model_lock_outfit_mannequin',
    label: 'Outfit Mannequin',
    description: 'Intermediate mannequin render for larger outfits.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_wardrobe_item_generate',
    lockKey: 'ai_model_lock_wardrobe_item_generate',
    label: 'Wardrobe Item Generate',
    description: 'Generate product shots for wardrobe items.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_wardrobe_item_render',
    lockKey: 'ai_model_lock_wardrobe_item_render',
    label: 'Wardrobe Item Render',
    description: 'Render product shots from item images.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_product_shot',
    lockKey: 'ai_model_lock_product_shot',
    label: 'Product Shot',
    description: 'Product photography outputs for items.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_headshot_generate',
    lockKey: 'ai_model_lock_headshot_generate',
    label: 'Headshot Generate',
    description: 'Headshot creation from selfie.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_body_shot_generate',
    lockKey: 'ai_model_lock_body_shot_generate',
    label: 'Body Shot Generate',
    description: 'Studio body shot compositing.',
    defaultModel: DEFAULT_BODY_MODEL,
  },
  {
    key: 'ai_model_auto_tag',
    lockKey: 'ai_model_lock_auto_tag',
    label: 'Auto Tag / Analysis',
    description: 'Analyze items for attributes and tags.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_style_advice',
    lockKey: 'ai_model_lock_style_advice',
    label: 'Style Advice',
    description: 'Text-based styling advice and suggestions.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
];
