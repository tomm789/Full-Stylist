/**
 * useHairAndMakeup
 * Top-level composition hook for the Hair & Make-Up screen.
 * Composes: usePresetSelection, useHeadshotSessionData, useHeadshotGeneration,
 *           useVariationNavigation, useHeadshotImageActions, useActiveHeadshotActions,
 *           usePresetDisplay, useGenerationAnimation.
 * Owns: tab state, preview state, modal state, and remaining action handlers.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileImages, useImageGeneration } from '@/hooks/profile';
// createHeadshotPost removed — headshots now auto-post via saveHeadshotVariationWithPost
import type { HeadshotDrawingCanvasRef } from '@/components/headshots/HeadshotDrawingCanvas';
import { getDrawColour } from '@/lib/headshot/drawingColors';
import { updateUserSettings } from '@/lib/settings';
import {
  EMPTY_ADVANCED,
  type PageTab,
  type PreviewSource,
  type TabId,
  type EditTab,
} from '@/lib/headshot/hairAndMakeupTypes';
import { usePresetSelection } from './usePresetSelection';
import { useHeadshotSessionData, clearHairMakeupSessionVisited } from './useHeadshotSessionData';
import { useHeadshotGeneration } from './useHeadshotGeneration';
import { useVariationNavigation } from './useVariationNavigation';
import { useHeadshotImageActions } from './useHeadshotImageActions';
import { useActiveHeadshotActions } from './useActiveHeadshotActions';
import { usePresetDisplay } from './usePresetDisplay';
import { useGenerationAnimation } from './useGenerationAnimation';
import { saveHeadshotVariationWithPost, type HeadshotGenerationVariation } from '@/lib/headshot/generation';

// Re-export so AuthContext can import from this module (unchanged public API).
export { clearHairMakeupSessionVisited };

// Re-export types/constants that other modules still import from here.
// The canonical source is now @/lib/headshot/hairAndMakeupTypes.
export type {
  TabId,
  EditTab,
  PreviewSource,
  PageTab,
  ExpandableSubcategory,
  ViewMode,
  LegacyViewMode,
} from '@/lib/headshot/hairAndMakeupTypes';
export {
  ACCESSORY_SUBCATEGORIES,
  JEWELLERY_SUBCATEGORIES,
  HAIR_COLOR_TABS,
  ADVANCED_FIELDS,
  DEFAULT_HAIR_CATEGORY_ID,
} from '@/lib/headshot/hairAndMakeupTypes';

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

  // ── Tab / view state ─────────────────────────────────────────────────────────

  const [pageTab, setPageTab] = useState<PageTab>('mirror');
  const [editTab, setEditTab] = useState<EditTab>('quick');
  const [selectedHairCategory, setSelectedHairCategory] = useState<string | null>('long-hairstyles');
  const [selectedMakeupCategory, setSelectedMakeupCategory] = useState<string | null>(null);

  const activeTab: TabId = editTab === 'hair' || editTab === 'makeup' ? editTab : 'hair';
  const activeCategoryId =
    editTab === 'hair' ? selectedHairCategory : editTab === 'makeup' ? selectedMakeupCategory : null;
  const setActiveCategoryId =
    editTab === 'hair' ? setSelectedHairCategory : setSelectedMakeupCategory;

  // ── Preview / image state ────────────────────────────────────────────────────

  const [baseImageId, setBaseImageId] = useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVariationId, setPreviewVariationId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>('none');

  // ── Modal / UI state ─────────────────────────────────────────────────────────

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

  // ── Session lifecycle state ────────────────────────────────────────────────
  const [sessionActiveThisVisit, setSessionActiveThisVisit] = useState(false);
  const [autoSelectNext, setAutoSelectNext] = useState(false);

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

  // ── Sub-hooks ────────────────────────────────────────────────────────────────

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
    ensureSession: sessionData.ensureSession,
    onGenerationComplete: () => {
      setAutoSelectNext(true);
      setSessionActiveThisVisit(true);
    },
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

  const previewVariation = useMemo(
    () => (previewVariationId ? variations.find((v) => v.id === previewVariationId) ?? null : null),
    [variations, previewVariationId]
  );

  const varNav = useVariationNavigation({
    variations,
    hiddenVariationIds,
    selfieImageId,
    selfieImageUrl,
    previewVariationId,
    variationUrls,
    setVariationUrls,
    setPreviewImageId,
    setPreviewImageUrl,
    setPreviewVariationId,
    setPreviewSource,
    resolveImageUrl,
  });

  const canShare =
    (previewSource === 'variation' || previewSource === 'headshot') && Boolean(previewImageUrl);

  const imageActions = useHeadshotImageActions({
    userId: user?.id ?? null,
    previewImageId,
    previewVariationId,
    previewImageUrl,
    canShare,
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

  const { handleSetAsActiveHeadshot } = useActiveHeadshotActions({
    userId: user?.id ?? null,
    previewImageId,
  });

  const presetDisplay = usePresetDisplay({ editTab, activeTab, activeCategoryId });

  const animation = useGenerationAnimation({ generating: generation.generating });

  // ── Derived preview flags ────────────────────────────────────────────────────

  const previewHasImage = Boolean(previewImageUrl);
  const previewIsGenerated =
    (previewSource === 'variation' || previewSource === 'headshot') && previewHasImage;
  const previewIsSaved = !!previewVariation?.is_saved;
  const previewIsSavedImage =
    (previewSource === 'variation' && previewIsSaved) || previewSource === 'headshot';
  const previewIsDeletable = !!previewImageId && previewImageId !== selfieImageId;
  const showDeletePreview =
    !editorOpen && previewHasImage && previewIsSavedImage && previewIsDeletable;
  const showUploadButton = !previewIsGenerated;
  const isStyleDisabled = selfieUpload.generating || generation.generating;
  const isGenerateDisabled = !preset.isDirty || generation.generating;
  const showHeadshotGrid = pageTab === 'grid';
  const showFacePreview = pageTab === 'mirror';

  // ── Action handlers ──────────────────────────────────────────────────────────

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
        showErrorToast(errorMessage || 'Failed to save selfie.');
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
      showErrorToast('Take or upload a selfie to start styling.');
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

  /** @deprecated Headshots now auto-post on save. This is kept for API compat. */
  const handleShareToFeed = React.useCallback(
    async () => {
      showSuccessToast('Headshots are now automatically posted when saved.');
    },
    []
  );

  const {
    setSelectedHair,
    setSelectedMakeup,
    setCustomDescription,
    setAccessorySubcategory,
    setJewellerySubcategory,
    setAdvancedFields,
  } = preset;

  const applySnapshot = React.useCallback(
    (snapshot: {
      hairPresetIds?: string[];
      makeupPresetIds?: string[];
      customDescription?: string;
      accessorySubcategory?: string | null;
      jewellerySubcategory?: string | null;
      advancedFields?: Record<string, string>;
    }) => {
      setSelectedHair(snapshot.hairPresetIds ?? []);
      setSelectedMakeup(snapshot.makeupPresetIds ?? []);
      setCustomDescription(snapshot.customDescription ?? '');
      setAccessorySubcategory(snapshot.accessorySubcategory ?? null);
      setJewellerySubcategory(snapshot.jewellerySubcategory ?? null);
      if (snapshot.advancedFields) {
        setAdvancedFields({ ...EMPTY_ADVANCED, ...snapshot.advancedFields });
      }
    },
    [setSelectedHair, setSelectedMakeup, setCustomDescription, setAccessorySubcategory, setJewellerySubcategory, setAdvancedFields]
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

  // ── Session lifecycle effects ────────────────────────────────────────────────

  React.useEffect(() => {
    if (autoSelectNext && varNav.completedVariations.length > 0) {
      varNav.selectLatest();
      setAutoSelectNext(false);
    }
  }, [autoSelectNext, varNav.completedVariations.length, varNav.selectLatest]);

  const handleDoneSession = React.useCallback(() => {
    sessionData.endSession();
    varNav.clearPreview();
    setSessionActiveThisVisit(false);
    setAutoSelectNext(false);
  }, [sessionData.endSession, varNav.clearPreview]);

  const handleSaveVariation = React.useCallback(async (variationId: string) => {
    if (variationId === '__selfie_ref__') return;
    await saveHeadshotVariationWithPost(variationId, user?.id ?? '');
    await sessionData.refreshVariations();
  }, [sessionData.refreshVariations, user?.id]);

  // ── Return ───────────────────────────────────────────────────────────────────

  return {
    // ── Navigation ──────────────────────────────────────────────────────────
    navigation,

    // ── Page / tab state ─────────────────────────────────────────────────────
    pageTab,
    setPageTab,
    showHeadshotGrid,
    showFacePreview,
    editTab,
    setEditTab,
    activeTab,
    activeCategoryId,
    setActiveCategoryId,
    setSelectedHairCategory,
    setSelectedMakeupCategory,

    // ── Preset display (usePresetDisplay) ────────────────────────────────────
    ...presetDisplay,

    // ── Preset selection (usePresetSelection) ────────────────────────────────
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

    // ── Identity / session ───────────────────────────────────────────────────
    userId: user?.id ?? null,
    selfieImageId,
    selfieImageUrl,

    // ── Preview / image state ────────────────────────────────────────────────
    baseImageId,
    activeImageVariation,
    previewImageUrl,
    previewImageId,
    previewHasImage,
    previewIsGenerated,
    previewSource,
    showUploadButton,
    showDeletePreview,

    // ── Generation (useHeadshotGeneration + useGenerationAnimation) ──────────
    generating: generation.generating,
    isStyleDisabled,
    isGenerateDisabled,
    ...animation,
    handleGenerateVariation: generation.handleGenerateVariation,

    // ── Variation navigation (useVariationNavigation) ────────────────────────
    completedVariations: varNav.completedVariations,
    previewGenerationIndex: varNav.previewGenerationIndex,
    showGenerationNav: varNav.showGenerationNav,
    canNavigateBack: varNav.canNavigateBack,
    canNavigateForward: varNav.canNavigateForward,
    canShare,
    handleNavigateGeneration: varNav.handleNavigateGeneration,
    setPreviewFromVariation: varNav.setPreviewFromVariation,
    variationUrls,

    // ── Session lifecycle ────────────────────────────────────────────────────
    sessionActiveThisVisit,
    handleDoneSession,
    handleSaveVariation,

    // ── Action handlers ──────────────────────────────────────────────────────
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
    handleSwipeIndexChange: varNav.handleSwipeIndexChange,
    handleApplyTemplateSelections,
    handleShareToFeed,
    applySnapshot,

    // ── Modals ───────────────────────────────────────────────────────────────
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

    // ── Draw mode ────────────────────────────────────────────────────────────
    isDrawModeOpen,
    setIsDrawModeOpen,
    drawingCanvasRef,
    currentDrawColor,

    // ── Supplemental ─────────────────────────────────────────────────────────
    allHeadshots,
    headshotImageUrl,
    profileInitials,
    selfieUpload,
  };
}
