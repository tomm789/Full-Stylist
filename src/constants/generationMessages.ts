/**
 * Centralised generation/processing message strings.
 * Single source of truth for all user-facing text shown during AI generation flows.
 * Edit messages here to update them across the entire app.
 */

export const GENERATION_MESSAGES = {
  // ── Headshot generation (profile-images, headshot/new, headshot/[id]) ──
  headshot: {
    uploading: 'Uploading photo...',
    creatingJob: 'Creating headshot job...',
    generating: 'Generating professional headshot...\nThis may take 20-30 seconds.',
    regenerating: 'Regenerating headshot...\nThis may take 20-30 seconds.',
  },

  // ── Body shot / studio model generation ──
  bodyShot: {
    uploading: 'Uploading photo...',
    creatingJob: 'Creating studio model job...',
    generating: 'Generating studio model...\nThis may take 30-40 seconds.',
  },

  // ── Outfit generation (wardrobe page, edit page, view page) ──
  outfit: {
    saving: 'Saving outfit...',
    preparing: 'Preparing generation...',
    preparingItems: (count: number) => `Preparing ${count} items...`,
    preparingImages: (count: number) => `Preparing ${count} images...`,
    preparingAI: 'Preparing AI generation...',
    generating: 'Generating outfit image...',
    polling: 'AI is working on your outfit...',
    complete: 'Outfit generated successfully!',
    timeoutComplete: 'Outfit saved! Image generation in progress...',
    socialTimeEstimate: 'This may take 60-90 seconds',
  },

  // ── Wardrobe item add / product shot ──
  wardrobeItem: {
    preparing: 'Preparing item...',
    analyzing: 'Analyzing your image...',
    generatingShot: 'Generating product shot...',
    identifyingDetails: 'Identifying item details...',
    adding: 'Adding item to your wardrobe...',
    productShotComplete: 'Product shot and details generated successfully',
    productShotOnly: 'Product shot generated successfully',
    productShotPartial: 'Product shot generated (some tasks may have failed)',
    /** Ordered steps shown during generation overlay, equally spaced over MIN_DURATION_MS */
    progressSteps: [
      'Preparing item...',
      'Analyzing your image...',
      'Generating product shot...',
      'Identifying item details...',
      'Adding item to your wardrobe...',
    ] as readonly string[],
    /** Minimum time (ms) the overlay stays visible, messages spaced equally within */
    MIN_DURATION_MS: 15_000,
  },

  // ── Hair & makeup variation generation ──
  hairAndMakeup: {
    progressSteps: [
      'Ooo...',
      'You don\'t need any make up at all honey...',
      'But I love this look sister!',
      'Ready?',
    ] as readonly string[],
    MIN_DURATION_MS: 12_000,
  },

  // ── GenerationProgressModal phase titles & subtitles ──
  outfitModal: {
    itemsTitle: 'Checking your pieces',
    itemsSubtitle: 'Reviewing each item before building the full look.',
    analysisTitle: 'Stylist notes incoming',
    analysisSubtitle: "Here's where this outfit will shine the most.",
    finalizingTitle: 'Finalising your outfit',
    finalizingSubtitle: 'Polishing the render and preparing your reveal.',
    stylistLabel: 'Your stylist',
    finishingLabel: 'Finishing touches',
    pullingOverview: 'Pulling together your overview\u2026',
    reviewingPieces: 'Reviewing each piece\u2026',
    footer: 'Stay on this screen while we craft your look.',
  },
} as const;
