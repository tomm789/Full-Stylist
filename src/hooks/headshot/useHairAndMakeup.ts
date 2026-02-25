/**
 * useHairAndMakeup
 * Top-level hook for the Hair & Make-Up screen.
 * Composes usePresetSelection, useHeadshotSessionData, useHeadshotGeneration,
 *   useVariationNavigation, useHeadshotImageActions, and useActiveHeadshotActions.
 * Owns: tab state, preview state, modal state, animations, and remaining action handlers.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileImages, useImageGeneration } from '@/hooks/profile';
import { hairPresets } from '@/lib/headshot/hairPresets';
import { makeupPresets } from '@/lib/headshot/makeupPresets';
import type { PresetCategory } from '@/lib/headshot/presetTypes';
import type { PresetOption } from '@/lib/headshot/presetTypes';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import { createHeadshotPost } from '@/lib/posts';
import type { HeadshotDrawingCanvasRef } from '@/components/headshots/HeadshotDrawingCanvas';
import { getDrawColour } from '@/lib/headshot/drawingColors';
import { updateUserSettings } from '@/lib/settings';
import { usePresetSelection } from './usePresetSelection';
import { useHeadshotSessionData, clearHairMakeupSessionVisited } from './useHeadshotSessionData';
import { useHeadshotGeneration } from './useHeadshotGeneration';
import { useVariationNavigation } from './useVariationNavigation';
import { useHeadshotImageActions } from './useHeadshotImageActions';
import { useActiveHeadshotActions } from './useActiveHeadshotActions';
import type { SelectionPill } from '@/components/headshots/HeadshotCreatorContainer';

// Re-export so AuthContext can import from this module (unchanged public API).
export { clearHairMakeupSessionVisited };

// ── Exported types and constants ───────────────────────────────────────────────
// Kept here because usePresetSelection, the screen, and other modules import them.

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

export type ViewMode = 'grid' | 'face';
/** @deprecated Use ViewMode and EditTab separately */
export type LegacyViewMode = 'grid' | 'face' | TabId;
export type PreviewSource = 'none' | 'selfie' | 'headshot' | 'variation' | 'upload';
export type PageTab = 'grid' | 'mirror' | 'following' | 'inspiration';

const DEFAULT_HAIR_CATEGORY_ID = 'long-hairstyles';

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useHairAndMakeup() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const {
    allHeadshots,
    headshotImageUrl,
    refreshImages,
  } = useProfileImages({ userId: user?.id });
  const selfieUpload = useImageGeneration();

  // ── Tab / view state ────────────────────────────────────────────────────────
  const [pageTab, setPageTab] = useState<PageTab>('mirror');
  const [editTab, setEditTab] = useState<EditTab>('quick');
  const [selectedHairCategory, setSelectedHairCategory] = useState<string | null>(
    DEFAULT_HAIR_CATEGORY_ID
  );
  const [selectedMakeupCategory, setSelectedMakeupCategory] = useState<string | null>(null);

  const activeTab: TabId = editTab === 'hair' || editTab === 'makeup' ? editTab : 'hair';
  const activeCategoryId =
    editTab === 'hair' ? selectedHairCategory : editTab === 'makeup' ? selectedMakeupCategory : null;
  const setActiveCategoryId =
    editTab === 'hair' ? setSelectedHairCategory : setSelectedMakeupCategory;

  // ── Preview / image state ───────────────────────────────────────────────────
  const [baseImageId, setBaseImageId] = useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVariationId, setPreviewVariationId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>('none');

  // ── Modal / UI state ────────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [showFaceMenu, setShowFaceMenu] = useState(false);
  const [activeImageVariation, setActiveImageVariation] =
    useState<HeadshotGenerationVariation | null>(null);
  const [isDrawModeOpen, setIsDrawModeOpen] = useState(false);
  const drawingCanvasRef = useRef<HeadshotDrawingCanvasRef>(null);

  const currentDrawColor = getDrawColour('lip-styles');

  const profileInitials = useMemo(() => {
    const raw =
      (user?.user_metadata as { full_name?: string })?.full_name ||
      user?.email ||
      '';
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }, [user]);

  // ── Sub-hooks ───────────────────────────────────────────────────────────────

  const preset = usePresetSelection({ editTab, activeTab, activeCategoryId });

  const sessionData = useHeadshotSessionData({
    userId: user?.id ?? null,
    baseImageId,
    previewSource,
    previewVariationId,
    previewImageId,
    selfieUploadedUri: selfieUpload.uploadedUri,
    setBaseImageId,
    setPreviewImageId,
    setPreviewImageUrl,
    setPreviewVariationId,
    setPreviewSource,
    setEditorOpen,
    setActiveImageVariation,
    clearSelfieUploadImage: selfieUpload.clearImage,
    onSessionRestored: (data) => {
      preset.setSelectedHair(data.hairPresetIds);
      preset.setSelectedMakeup(data.makeupPresetIds);
      preset.setCustomDescription(data.customDescription);
      preset.setBaselineInput({
        hairPresetIds: data.hairPresetIds,
        makeupPresetIds: data.makeupPresetIds,
        customDescription: data.customDescription,
      });
    },
  });

  const generation = useHeadshotGeneration({
    userId: user?.id ?? null,
    baseImageId,
    previewSource,
    previewImageUrl,
    selectedHair: preset.selectedHair,
    selectedMakeup: preset.selectedMakeup,
    customDescription: preset.customDescription,
    accessorySubcategory: preset.accessorySubcategory,
    jewellerySubcategory: preset.jewellerySubcategory,
    advancedFields: preset.advancedFields,
    sessionId: sessionData.sessionId,
    setSessionId: sessionData.setSessionId,
    setVariations: sessionData.setVariations,
    setPreviewImageId,
    setPreviewImageUrl,
    setPreviewVariationId,
    setPreviewSource,
    setSelfieImageId: sessionData.setSelfieImageId,
    setSelfieImageUrl: sessionData.setSelfieImageUrl,
    setBaseImageId,
    setPreviewSource_selfie: () => setPreviewSource('selfie'),
    saveUploadedImage: selfieUpload.saveUploadedImage,
    clearSelfieUploadImage: selfieUpload.clearImage,
    updateUserSettings,
    resolveImageUrl: sessionData.resolveImageUrl,
    loadVariations: sessionData.loadVariations,
    refreshImages,
  });

  // ── Variation navigation ────────────────────────────────────────────────────

  const {
    sessionId,
    variations,
    variationUrls,
    hiddenVariationIds,
    setHiddenVariationIds,
    selfieImageId,
    selfieImageUrl,
    resolveImageUrl,
    loadVariations,
    setVariationUrls,
  } = sessionData;

  const previewVariation = previewVariationId
    ? variations.find((v) => v.id === previewVariationId) || null
    : null;

  const varNav = useVariationNavigation({
    variations,
    hiddenVariationIds,
    selfieImageId,
    previewVariationId,
    variationUrls,
    setVariationUrls,
    setPreviewImageId,
    setPreviewImageUrl,
    setPreviewVariationId,
    setPreviewSource,
    resolveImageUrl,
  });

  // ── Image actions ───────────────────────────────────────────────────────────

  const imageActions = useHeadshotImageActions({
    userId: user?.id ?? null,
    previewImageId,
    previewVariationId,
    previewImageUrl,
    canShare: false, // derived below — passed after canShare is computed
    selfieImageId,
    selfieImageUrl,
    sessionId,
    loadVariations,
    refreshImages,
    setPreviewVariationId,
    setPreviewImageId,
    setPreviewImageUrl,
    setPreviewSource,
    setHiddenVariationIds,
    setVariationUrls,
  });

  // ── Active headshot ─────────────────────────────────────────────────────────

  const { handleSetAsActiveHeadshot } = useActiveHeadshotActions({
    userId: user?.id ?? null,
    previewImageId,
  });

  // ── Preset category / display derived values ────────────────────────────────

  const presets = useMemo<PresetCategory[]>(
    () => (activeTab === 'hair' ? hairPresets : makeupPresets),
    [activeTab]
  );

  const categoryPills = useMemo<PresetCategory[]>(() => {
    if (editTab !== 'hair' && editTab !== 'makeup') return [];
    const excludeIds =
      editTab === 'hair' ? ['hair-length', 'hair-color'] : ['major-aesthetics'];
    const filtered = presets.filter((c) => !excludeIds.includes(c.id));

    if (editTab !== 'hair') return filtered;
    const preferredOrder = [DEFAULT_HAIR_CATEGORY_ID, 'medium-hairstyles', 'short-hairstyles'];
    const preferred = preferredOrder
      .map((id) => filtered.find((c) => c.id === id))
      .filter((c): c is PresetCategory => Boolean(c));
    const remaining = filtered.filter((c) => !preferredOrder.includes(c.id));
    return [...preferred, ...remaining];
  }, [editTab, presets]);

  const quickTabHairPresets = useMemo<PresetCategory | null>(
    () => hairPresets.find((c) => c.id === 'hair-length') || null,
    []
  );

  const quickTabMakeupPresets = useMemo<PresetCategory | null>(
    () => makeupPresets.find((c) => c.id === 'major-aesthetics') || null,
    []
  );

  const quickTabPresets = useMemo<PresetCategory | null>(() => {
    if (editTab !== 'quick') {
      const targetId = editTab === 'hair' ? 'hair-length' : 'major-aesthetics';
      return presets.find((c) => c.id === targetId) || null;
    }
    return null;
  }, [editTab, presets]);

  const hairColorCategory = useMemo<PresetCategory | null>(() => {
    if (editTab !== 'quick' && editTab !== 'hair') return null;
    return hairPresets.find((c) => c.id === 'hair-color') || null;
  }, [editTab]);

  const activeCategory = useMemo(() => {
    if (editTab !== 'hair' && editTab !== 'makeup') return null;
    if (presets.length === 0) return null;
    if (activeCategoryId === 'custom') return null;
    const found = presets.find((c) => c.id === activeCategoryId);
    return found || presets[0];
  }, [editTab, presets, activeCategoryId]);

  const handleInfoPress = (option: PresetOption) => {
    Alert.alert(option.title, option.description);
  };

  // ── Generation animation ────────────────────────────────────────────────────

  const generatePulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!generation.generating) {
      generatePulse.stopAnimation();
      generatePulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(generatePulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(generatePulse, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [generation.generating, generatePulse]);

  // ── Derived preview flags ───────────────────────────────────────────────────

  const previewHasImage = Boolean(previewImageUrl);
  const previewIsGenerated =
    (previewSource === 'variation' || previewSource === 'headshot') && previewHasImage;
  const canShare = previewIsGenerated && previewHasImage;
  const previewIsSaved = !!previewVariation?.is_saved;
  const previewIsSavedImage =
    (previewSource === 'variation' && previewIsSaved) || previewSource === 'headshot';
  const previewIsDeletable = !!previewImageId && previewImageId !== selfieImageId;
  const showDeletePreview =
    !editorOpen && previewHasImage && previewIsSavedImage && previewIsDeletable;
  const showUploadButton = !previewIsGenerated;
  const isStyleDisabled = selfieUpload.generating || generation.generating;
  const isGenerateDisabled = !preset.isDirty || generation.generating;

  const generateOverlayOpacity = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.65],
  });
  const generateIconScale = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const generateIconOpacity = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });

  const showHeadshotGrid = pageTab === 'grid';
  const showFacePreview = pageTab === 'mirror';

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handlePickCamera = () => {
    if (selfieUpload.generating) return;
    selfieUpload.pickHeadshotCameraImage();
  };

  const handlePickLibrary = () => {
    if (selfieUpload.generating) return;
    selfieUpload.pickHeadshotLibraryImage();
  };

  const handleUndo = () => {
    selfieUpload.clearImage();
    setPreviewImageUrl(null);
    setPreviewImageId(null);
    setPreviewVariationId(null);
    setPreviewSource('none');
    setEditorOpen(false);
    setBaseImageId(null);
  };

  const handleStylePress = async () => {
    if (!user?.id) return;

    if (previewSource === 'upload') {
      const { imageId, errorMessage } = await selfieUpload.saveUploadedImage(user.id, 'selfie');
      if (!imageId) {
        Alert.alert('Error', errorMessage || 'Failed to save selfie.');
        return;
      }
      await updateUserSettings(user.id, { selfie_image_id: imageId });
      const resolvedUrl = await resolveImageUrl(imageId);
      const nextUrl = resolvedUrl || previewImageUrl || null;
      sessionData.setSelfieImageId(imageId);
      sessionData.setSelfieImageUrl(resolvedUrl);
      setBaseImageId(imageId);
      setPreviewImageId(imageId);
      setPreviewImageUrl(nextUrl);
      setPreviewVariationId(null);
      setPreviewSource('selfie');
      selfieUpload.clearImage();
    }

    if (!baseImageId && !previewImageId) {
      Alert.alert('Add a Selfie', 'Take or upload a selfie to start styling.');
      return;
    }

    if (!baseImageId && previewImageId) {
      setBaseImageId(previewImageId);
    }

    setEditorOpen(true);
  };

  const handleRestoreSelfie = () => {
    if (!selfieImageId && !selfieImageUrl) return;
    selfieUpload.clearImage();
    setPreviewImageId(selfieImageId);
    setPreviewImageUrl(selfieImageUrl);
    setPreviewVariationId(null);
    setPreviewSource(selfieImageId ? 'selfie' : 'none');
  };

  const handleApplyTemplateSelections = (snapshot: {
    hairPresetIds: string[];
    makeupPresetIds: string[];
    customDescription?: string;
  }) => {
    preset.setSelectedHair(snapshot.hairPresetIds ?? []);
    preset.setSelectedMakeup(snapshot.makeupPresetIds ?? []);
    if (snapshot.customDescription !== undefined) {
      preset.setCustomDescription(snapshot.customDescription);
    }
  };

  const handleShareToFeed = React.useCallback(
    async (
      caption?: string,
      visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit' = 'public'
    ) => {
      if (!user?.id) {
        Alert.alert('Error', 'You must be signed in to share.');
        return;
      }
      const imageId = previewVariation?.image_id ?? previewImageId;
      if (!imageId) {
        Alert.alert('Error', 'No headshot is selected to share.');
        return;
      }
      const { error } = await createHeadshotPost(user.id, imageId, caption, visibility);
      if (error) {
        Alert.alert('Error', 'Failed to share headshot');
        return;
      }
      Alert.alert('Shared!', 'Your headshot has been posted to your feed.');
    },
    [previewVariation, previewImageId, user?.id]
  );

  const emptyAdvanced = Object.fromEntries(ADVANCED_FIELDS.map((f) => [f.id, '']));

  const applySnapshot = React.useCallback(
    (snapshot: {
      hairPresetIds?: string[];
      makeupPresetIds?: string[];
      customDescription?: string;
      accessorySubcategory?: string | null;
      jewellerySubcategory?: string | null;
      advancedFields?: Record<string, string>;
    }) => {
      preset.setSelectedHair(snapshot.hairPresetIds ?? []);
      preset.setSelectedMakeup(snapshot.makeupPresetIds ?? []);
      preset.setCustomDescription(snapshot.customDescription ?? '');
      preset.setAccessorySubcategory(snapshot.accessorySubcategory ?? null);
      preset.setJewellerySubcategory(snapshot.jewellerySubcategory ?? null);
      if (snapshot.advancedFields) {
        preset.setAdvancedFields({ ...emptyAdvanced, ...snapshot.advancedFields });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handlePreviewPress = () => {
    if (previewImageUrl) {
      setLightboxUrl(previewImageUrl);
      setLightboxVisible(true);
      return;
    }
    handlePickCamera();
  };

  const handleHeadshotSelect = (item: { id: string; url: string | null }) => {
    selfieUpload.clearImage();
    setBaseImageId(item.id);
    setPreviewImageId(item.id);
    setPreviewImageUrl(item.url || null);
    setPreviewVariationId(null);
    setPreviewSource('headshot');
    setEditorOpen(false);
  };

  const handleSwipeIndexChange = React.useCallback(
    (item: { id: string; url: string | null }) => {
      setPreviewImageId(item.id);
      setPreviewImageUrl(item.url || null);
      if (selfieImageId && item.id === selfieImageId) {
        setPreviewVariationId(null);
        setPreviewSource('selfie');
        return;
      }
      const matchedVariation =
        variations.find((v) => v.image_id === item.id && v.status === 'complete') || null;
      if (matchedVariation) {
        setPreviewVariationId(matchedVariation.id);
        setPreviewSource('variation');
        return;
      }
      setPreviewVariationId(null);
      setPreviewSource('headshot');
    },
    [selfieImageId, variations]
  );

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    // Navigation
    navigation,
    // Page-level tabs
    pageTab,
    setPageTab,
    showHeadshotGrid,
    showFacePreview,
    // Edit tabs
    editTab,
    setEditTab,
    activeTab,
    // Category selectors
    activeCategoryId,
    setActiveCategoryId,
    setSelectedHairCategory,
    setSelectedMakeupCategory,
    presets,
    categoryPills,
    quickTabPresets,
    quickTabHairPresets,
    quickTabMakeupPresets,
    hairColorCategory,
    activeCategory,
    // Preset selection (spread from sub-hook)
    selectedHair: preset.selectedHair,
    selectedMakeup: preset.selectedMakeup,
    customDescription: preset.customDescription,
    setCustomDescription: preset.setCustomDescription,
    accessorySubcategory: preset.accessorySubcategory,
    setAccessorySubcategory: preset.setAccessorySubcategory,
    jewellerySubcategory: preset.jewellerySubcategory,
    setJewellerySubcategory: preset.setJewellerySubcategory,
    advancedFields: preset.advancedFields,
    setAdvancedField: preset.setAdvancedField,
    selectedIds: preset.selectedIds,
    isCustomCategory: preset.isCustomCategory,
    hasSelections: preset.hasSelections,
    creatorSelections: preset.creatorSelections,
    toggleSelection: preset.toggleSelection,
    handleRemoveCreatorSelection: preset.handleRemoveCreatorSelection,
    formatCategoryLabel: preset.formatCategoryLabel,
    customDescriptionCopy: preset.customDescriptionCopy,
    customPlaceholder: preset.customPlaceholder,
    isDirty: preset.isDirty,
    // Session / data (from sub-hook)
    selfieImageId,
    selfieImageUrl,
    // Identity
    userId: user?.id ?? null,
    baseImageId,
    // Preview
    activeImageVariation,
    previewImageUrl,
    previewImageId,
    previewHasImage,
    previewIsGenerated,
    previewSource,
    showUploadButton,
    showDeletePreview,
    // Generation (from sub-hook)
    generating: generation.generating,
    isStyleDisabled,
    isGenerateDisabled,
    generateOverlayOpacity,
    generateIconScale,
    generateIconOpacity,
    handleGenerateVariation: generation.handleGenerateVariation,
    // Variation navigation (from sub-hook)
    completedVariations: varNav.completedVariations,
    previewGenerationIndex: varNav.previewGenerationIndex,
    showGenerationNav: varNav.showGenerationNav,
    canNavigateBack: varNav.canNavigateBack,
    canNavigateForward: varNav.canNavigateForward,
    canShare,
    handleNavigateGeneration: varNav.handleNavigateGeneration,
    // Handlers
    handlePickCamera,
    handlePickLibrary,
    handleUndo,
    handleStylePress,
    handleRestoreSelfie,
    handleSharePreview: imageActions.handleSharePreview,
    handleDeletePreviewImage: imageActions.handleDeletePreviewImage,
    handleSetAsActiveHeadshot,
    handlePreviewPress,
    handleHeadshotSelect,
    handleSwipeIndexChange,
    handleInfoPress,
    // Modals
    policyModalVisible: generation.policyModalVisible,
    policyMessage: generation.policyMessage,
    setPolicyModalVisible: generation.setPolicyModalVisible,
    error: generation.error,
    setError: generation.setError,
    infoModalVisible,
    setInfoModalVisible,
    lightboxVisible,
    setLightboxVisible,
    lightboxUrl,
    showFaceMenu,
    setShowFaceMenu,
    // Draw mode
    isDrawModeOpen,
    setIsDrawModeOpen,
    drawingCanvasRef,
    currentDrawColor,
    // Supplemental
    allHeadshots,
    headshotImageUrl,
    profileInitials,
    selfieUpload,
    handleApplyTemplateSelections,
    handleShareToFeed,
    applySnapshot,
  };
}
