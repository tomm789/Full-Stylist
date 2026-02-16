import React, { useMemo, useState } from 'react';
import { Alert, Animated, Easing, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileImages, useImageGeneration } from '@/hooks/profile';
import { hairPresets } from '@/lib/headshot/hairPresets';
import { makeupPresets } from '@/lib/headshot/makeupPresets';
import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';
import {
  createHeadshotGenerationSession,
  createHeadshotGenerationVariation,
  getLatestHeadshotGenerationSession,
  listHeadshotGenerationVariations,
  updateHeadshotGenerationSession,
  updateHeadshotGenerationVariation,
  type HeadshotGenerationVariation,
} from '@/lib/headshot/generation';
import { buildHairMakeupPrompt } from '@/lib/headshot/hairMakeupPrompt';
import { getPublicImageUrl } from '@/lib/images';
import { deleteImage } from '@/lib/utils/image-helpers';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import {
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
  triggerHeadshotGenerateWithPrompt,
} from '@/lib/ai-jobs';

export type TabId = 'hair' | 'makeup';
export type ViewMode = 'grid' | 'face' | TabId;
export type PreviewSource = 'none' | 'selfie' | 'headshot' | 'variation' | 'upload';

const CUSTOM_CATEGORY_ID = 'custom';
const DEFAULT_HAIR_CATEGORY_ID = 'long-hairstyles';

export function useHairAndMakeup() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const {
    allHeadshots,
    headshotImageUrl,
    refreshImages,
  } = useProfileImages({ userId: user?.id });
  const selfieUpload = useImageGeneration();
  const [activeView, setActiveView] = useState<ViewMode>('grid');
  const [lastPresetTab, setLastPresetTab] = useState<TabId>('hair');
  const [selectedHair, setSelectedHair] = useState<string[]>([]);
  const [selectedMakeup, setSelectedMakeup] = useState<string[]>([]);
  const [selectedHairCategory, setSelectedHairCategory] = useState<string | null>(
    DEFAULT_HAIR_CATEGORY_ID
  );
  const [selectedMakeupCategory, setSelectedMakeupCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variations, setVariations] = useState<HeadshotGenerationVariation[]>([]);
  const [variationUrls, setVariationUrls] = useState<Map<string, string | null>>(new Map());
  const [hiddenVariationIds, setHiddenVariationIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selfieImageId, setSelfieImageId] = useState<string | null>(null);
  const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);
  const [baseImageId, setBaseImageId] = useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVariationId, setPreviewVariationId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>('none');
  const [editorOpen, setEditorOpen] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [showFaceMenu, setShowFaceMenu] = useState(false);
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
  const showHeadshotGrid = activeView === 'grid';
  const showFacePreview = activeView === 'face';
  const isPresetView = activeView === 'hair' || activeView === 'makeup';
  const [baselineInput, setBaselineInput] = useState({
    hairPresetIds: [] as string[],
    makeupPresetIds: [] as string[],
    customDescription: '',
  });

  const activeTab: TabId = isPresetView ? activeView : lastPresetTab;
  const presets = useMemo<PresetCategory[]>(
    () => (activeTab === 'hair' ? hairPresets : makeupPresets),
    [activeTab]
  );

  const categoryPills = useMemo<PresetCategory[]>(() => {
    if (activeTab !== 'hair') return presets;
    const preferredOrder = [
      DEFAULT_HAIR_CATEGORY_ID,
      'medium-hairstyles',
      'short-hairstyles',
    ];
    const preferred = preferredOrder
      .map((id) => presets.find((category) => category.id === id))
      .filter((category): category is PresetCategory => Boolean(category));
    const remaining = presets.filter((category) => !preferredOrder.includes(category.id));
    return [...preferred, ...remaining];
  }, [activeTab, presets]);

  const activeCategoryId =
    activeTab === 'hair' ? selectedHairCategory : selectedMakeupCategory;
  const setActiveCategoryId =
    activeTab === 'hair' ? setSelectedHairCategory : setSelectedMakeupCategory;

  const activeCategory = useMemo(() => {
    if (presets.length === 0) return null;
    if (activeCategoryId === CUSTOM_CATEGORY_ID) return null;
    const found = presets.find((category) => category.id === activeCategoryId);
    return found || presets[0];
  }, [presets, activeCategoryId]);

  const selectedIds = activeTab === 'hair' ? selectedHair : selectedMakeup;
  const setSelectedIds = activeTab === 'hair' ? setSelectedHair : setSelectedMakeup;
  const isCustomCategory = activeCategoryId === CUSTOM_CATEGORY_ID;

  const formatCategoryLabel = (label: string) => {
    if (activeTab !== 'hair') return label;
    const cleaned = label.replace(/\bhairstyles?\b/gi, '').replace(/\s+/g, ' ').trim();
    return cleaned || label;
  };

  const customDescriptionCopy =
    activeTab === 'hair'
      ? 'Describe your hairstyle or combine it with a preset for additional refinements.'
      : 'Describe your makeup or combine it with a preset for additional refinements.';

  const customPlaceholder =
    activeTab === 'hair'
      ? 'e.g., long wavy hair with soft layers, curtain bangs'
      : 'e.g., soft glam with glossy lips, warm brown smoky eye';

  const toggleSelection = (optionId: string) => {
    setSelectedIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleInfoPress = (option: PresetOption) => {
    Alert.alert(option.title, option.description);
  };

  const loadVariations = async (currentSessionId: string | null) => {
    if (!currentSessionId) {
      setVariations([]);
      setVariationUrls(new Map());
      return;
    }
    const data = await listHeadshotGenerationVariations(currentSessionId);
    setVariations(data);

    const imageIds = data.map((item) => item.image_id).filter(Boolean) as string[];
    if (imageIds.length === 0) {
      setVariationUrls(new Map());
      return;
    }

    const { data: images } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .in('id', imageIds);

    const urlMap = new Map<string, string | null>();
    images?.forEach((image) => {
      urlMap.set(image.id, getPublicImageUrl(image));
    });
    setVariationUrls(urlMap);
  };

  const generatePulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!generating) {
      generatePulse.stopAnimation();
      generatePulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(generatePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(generatePulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [generating, generatePulse]);

  const resolveImageUrl = async (imageId: string | null): Promise<string | null> => {
    if (!imageId) return null;
    const { data: image } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .eq('id', imageId)
      .maybeSingle();
    return image ? getPublicImageUrl(image) : null;
  };

  const loadSelfie = async () => {
    if (!user?.id) return;
    const { data: settings } = await getUserSettings(user.id);
    const nextSelfieId = settings?.selfie_image_id ?? null;
    setSelfieImageId(nextSelfieId);
    const nextSelfieUrl = await resolveImageUrl(nextSelfieId);
    setSelfieImageUrl(nextSelfieUrl);

    if (previewSource === 'none' || previewSource === 'selfie') {
      setBaseImageId(nextSelfieId);
      setPreviewImageId(nextSelfieId);
      setPreviewImageUrl(nextSelfieUrl);
      setPreviewVariationId(null);
      setPreviewSource(nextSelfieId ? 'selfie' : 'none');
    }
  };

  const loadSession = async () => {
    if (!user?.id || !baseImageId) {
      setSessionId(null);
      setVariations([]);
      setVariationUrls(new Map());
      setSelectedHair([]);
      setSelectedMakeup([]);
      setCustomDescription('');
      setBaselineInput({
        hairPresetIds: [],
        makeupPresetIds: [],
        customDescription: '',
      });
      return;
    }
    const session = await getLatestHeadshotGenerationSession(user.id, baseImageId);
    if (session) {
      setSessionId(session.id);
      const input = session.input_json || {};
      const hairPresetIds = input.hairPresetIds || [];
      const makeupPresetIds = input.makeupPresetIds || [];
      const custom = input.customDescription || '';
      setSelectedHair(hairPresetIds);
      setSelectedMakeup(makeupPresetIds);
      setCustomDescription(custom);
      setBaselineInput({
        hairPresetIds,
        makeupPresetIds,
        customDescription: custom,
      });
      await loadVariations(session.id);
    } else {
      setSessionId(null);
      setSelectedHair([]);
      setSelectedMakeup([]);
      setCustomDescription('');
      setBaselineInput({
        hairPresetIds: [],
        makeupPresetIds: [],
        customDescription: '',
      });
      setVariations([]);
      setVariationUrls(new Map());
    }
  };

  React.useEffect(() => {
    loadSession();
  }, [user?.id, baseImageId]);

  React.useEffect(() => {
    loadSelfie();
  }, [user?.id]);

  React.useEffect(() => {
    if (!selfieUpload.uploadedUri) return;
    setPreviewImageId(null);
    setPreviewImageUrl(selfieUpload.uploadedUri);
    setPreviewVariationId(null);
    setPreviewSource('upload');
    setEditorOpen(false);
    setBaseImageId(null);
  }, [selfieUpload.uploadedUri]);

  React.useEffect(() => {
    if (!previewVariationId || previewSource !== 'variation') return;
    const variation = variations.find((item) => item.id === previewVariationId);
    if (!variation?.image_id) return;
    const nextUrl = variationUrls.get(variation.image_id) || null;
    if (nextUrl) {
      setPreviewImageUrl(nextUrl);
    }
  }, [previewVariationId, previewSource, variationUrls, variations]);

  React.useEffect(() => {
    setPreviewVariationId(null);
    setHiddenVariationIds([]);
  }, [baseImageId]);

  const handleGenerateVariation = async () => {
    if (!user?.id) return;
    let activeBaseImageId = baseImageId;

    if (previewSource === 'upload') {
      const { imageId, errorMessage } = await selfieUpload.saveUploadedImage(user.id, 'selfie');
      if (!imageId) {
        Alert.alert('Error', errorMessage || 'Failed to save selfie.');
        return;
      }
      await updateUserSettings(user.id, { selfie_image_id: imageId });
      const resolvedUrl = await resolveImageUrl(imageId);
      const nextUrl = resolvedUrl || previewImageUrl || null;
      setSelfieImageId(imageId);
      setSelfieImageUrl(resolvedUrl);
      setBaseImageId(imageId);
      setPreviewImageId(imageId);
      setPreviewImageUrl(nextUrl);
      setPreviewVariationId(null);
      setPreviewSource('selfie');
      selfieUpload.clearImage();
      activeBaseImageId = imageId;
    }

    if (!activeBaseImageId) {
      Alert.alert('Photo Required', 'Select a selfie or headshot before generating variations.');
      return;
    }

    const inputSnapshot = {
      hairPresetIds: selectedHair,
      makeupPresetIds: selectedMakeup,
      customDescription,
    };
    const promptText = buildHairMakeupPrompt(inputSnapshot);

    if (!promptText.trim()) {
      Alert.alert('Add Details', 'Select a preset or add a custom description.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const session = await createHeadshotGenerationSession(
          user.id,
          activeBaseImageId,
          inputSnapshot
        );
        if (!session) {
          throw new Error('Failed to create session');
        }
        activeSessionId = session.id;
        setSessionId(session.id);
      } else {
        await updateHeadshotGenerationSession(activeSessionId, inputSnapshot);
      }

      const variation = await createHeadshotGenerationVariation({
        session_id: activeSessionId,
        user_id: user.id,
        status: 'pending',
        prompt_text: promptText,
        input_snapshot_json: inputSnapshot,
      });

      if (!variation) {
        throw new Error('Failed to create variation');
      }

      setVariations((prev) => [variation, ...prev]);

      const { data: job, error: jobError } = await triggerHeadshotGenerateWithPrompt(
        user.id,
        activeBaseImageId,
        promptText,
        { outputFolder: 'hair_makeup_variations', skipUserSettingsUpdate: true }
      );

      if (!job || jobError) {
        await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
        throw jobError || new Error('Failed to create headshot job');
      }

      await updateHeadshotGenerationVariation(variation.id, { ai_job_id: job.id });
      await triggerAIJobExecution(job.id);

      const { data: completedJob } = await waitForAIJobCompletion(
        job.id,
        30,
        2000,
        '[HairMakeup]'
      );

      if (!completedJob || completedJob.status === 'failed') {
        const failureMessage = completedJob?.error || 'Generation failed';
        if (isGeminiPolicyBlockError(failureMessage)) {
          setPolicyMessage(
            'Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.'
          );
          setPolicyModalVisible(true);
          await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
          await loadVariations(activeSessionId);
          return;
        }
        await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
        throw new Error(failureMessage);
      }

      const generatedImageId =
        completedJob.result?.image_id || completedJob.result?.generated_image_id;

      await updateHeadshotGenerationVariation(variation.id, {
        status: 'complete',
        image_id: generatedImageId || null,
        is_saved: true,
      });

      const generatedImageUrl = await resolveImageUrl(generatedImageId || null);

      if (generatedImageId && generatedImageUrl) {
        setVariationUrls((prev) => {
          const next = new Map(prev);
          if (!next.has(generatedImageId)) {
            next.set(generatedImageId, generatedImageUrl);
          }
          return next;
        });
      }

      setPreviewImageId(generatedImageId || null);
      setPreviewImageUrl(generatedImageUrl || previewImageUrl || null);
      setPreviewVariationId(variation.id);
      setPreviewSource('variation');

      await loadVariations(activeSessionId);
      await refreshImages();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate variation');
    } finally {
      setGenerating(false);
    }
  };

  const setPreviewFromVariation = async (
    variation: HeadshotGenerationVariation
  ) => {
    const imageId = variation.image_id;
    if (!imageId) return;
    let imageUrl = variationUrls.get(imageId) || null;
    if (!imageUrl) {
      imageUrl = await resolveImageUrl(imageId);
      if (imageUrl) {
        setVariationUrls((prev) => {
          const next = new Map(prev);
          next.set(imageId, imageUrl);
          return next;
        });
      }
    }
    if (!imageUrl) return;
    setPreviewImageId(imageId);
    setPreviewImageUrl(imageUrl);
    setPreviewVariationId(variation.id);
    setPreviewSource('variation');
  };

  const isDirty = useMemo(() => {
    const sortIds = (ids: string[]) => [...ids].sort().join(',');
    return (
      sortIds(selectedHair) !== sortIds(baselineInput.hairPresetIds) ||
      sortIds(selectedMakeup) !== sortIds(baselineInput.makeupPresetIds) ||
      (customDescription || '') !== (baselineInput.customDescription || '')
    );
  }, [selectedHair, selectedMakeup, customDescription, baselineInput]);

  const previewHasImage = Boolean(previewImageUrl);
  const previewIsGenerated =
    (previewSource === 'variation' || previewSource === 'headshot') && previewHasImage;
  const completedVariations = useMemo(
    () =>
      variations.filter((variation) => {
        if (variation.status !== 'complete' || !variation.image_id) return false;
        if (hiddenVariationIds.includes(variation.id)) return false;
        if (selfieImageId && variation.image_id === selfieImageId) return false;
        return true;
      }),
    [variations, hiddenVariationIds, selfieImageId]
  );
  const previewGenerationIndex = useMemo(() => {
    if (!previewVariationId) return -1;
    return completedVariations.findIndex((variation) => variation.id === previewVariationId);
  }, [completedVariations, previewVariationId]);
  const showGenerationNav = completedVariations.length > 0;
  const canNavigateBack =
    previewGenerationIndex === -1
      ? completedVariations.length > 0
      : previewGenerationIndex < completedVariations.length - 1;
  const canNavigateForward = previewGenerationIndex > 0;
  const canShare = previewIsGenerated && previewHasImage;
  const previewVariation = previewVariationId
    ? variations.find((variation) => variation.id === previewVariationId) || null
    : null;
  const previewIsSaved = !!previewVariation?.is_saved;
  const previewIsSavedImage =
    (previewSource === 'variation' && previewIsSaved) || previewSource === 'headshot';
  const previewIsDeletable = !!previewImageId && previewImageId !== selfieImageId;
  const showDeletePreview =
    !editorOpen && previewHasImage && previewIsSavedImage && previewIsDeletable;
  const showUploadButton = !previewIsGenerated;
  const isStyleDisabled = selfieUpload.generating || generating;
  const isGenerateDisabled = !isDirty || generating;
  const generateOverlayOpacity = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.22],
  });
  const generateIconScale = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const generateIconOpacity = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });

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
      setSelfieImageId(imageId);
      setSelfieImageUrl(resolvedUrl);
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

  const getShareableUri = async (remoteUrl: string): Promise<string> => {
    if (Platform.OS === 'web') {
      return remoteUrl;
    }
    if (remoteUrl.startsWith('file://')) {
      return remoteUrl;
    }
    const extension = remoteUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const targetDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!targetDirectory) {
      return remoteUrl;
    }
    const targetUri = `${targetDirectory}hair-makeup-share-${Date.now()}.${extension}`;
    const download = await FileSystem.downloadAsync(remoteUrl, targetUri);
    return download?.uri || remoteUrl;
  };

  const handleSharePreview = async () => {
    if (!canShare || !previewImageUrl) return;
    try {
      const shareUri = await getShareableUri(previewImageUrl);
      await Share.share({
        url: shareUri,
        message: shareUri,
      });
    } catch (shareError) {
      console.error('Share error:', shareError);
    }
  };

  const handleDeletePreviewImage = () => {
    if (!user?.id || !previewImageId) return;
    Alert.alert(
      'Delete image?',
      'This will permanently delete the image.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const imageId = previewImageId;
            const variationId = previewVariationId;
            const { error: deleteError } = await deleteImage(imageId, user.id);
            if (deleteError) {
              Alert.alert('Error', deleteError.message || 'Failed to delete image.');
              return;
            }
            if (variationId) {
              await updateHeadshotGenerationVariation(variationId, {
                image_id: null,
                is_saved: false,
              });
              setHiddenVariationIds((prev) =>
                prev.includes(variationId) ? prev : [...prev, variationId]
              );
            }
            setVariationUrls((prev) => {
              const next = new Map(prev);
              next.delete(imageId);
              return next;
            });
            setPreviewVariationId(null);
            setPreviewImageId(selfieImageId);
            setPreviewImageUrl(selfieImageUrl);
            setPreviewSource(selfieImageId ? 'selfie' : 'none');
            if (sessionId) {
              await loadVariations(sessionId);
            }
            await refreshImages();
          },
        },
      ],
      { cancelable: true }
    );
  };

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

  /** Lightweight index change for swipe gestures — only updates the visual
   *  preview without resetting variation/editor/selfie-upload state. */
  const handleSwipeIndexChange = React.useCallback(
    (item: { id: string; url: string | null }) => {
      setPreviewImageId(item.id);
      setPreviewImageUrl(item.url || null);
    },
    [],
  );

  const handleNavigateGeneration = (direction: 'back' | 'forward') => {
    if (completedVariations.length === 0) return;
    if (previewGenerationIndex === -1) {
      if (direction === 'back') {
        void setPreviewFromVariation(completedVariations[0]);
      }
      return;
    }
    const nextIndex =
      direction === 'back' ? previewGenerationIndex + 1 : previewGenerationIndex - 1;
    const nextVariation = completedVariations[nextIndex];
    if (nextVariation) {
      void setPreviewFromVariation(nextVariation);
    }
  };

  return {
    // Navigation
    navigation,
    // View state
    activeView,
    setActiveView,
    lastPresetTab,
    setLastPresetTab,
    showHeadshotGrid,
    showFacePreview,
    isPresetView,
    // Tabs & categories
    activeTab,
    presets,
    categoryPills,
    activeCategory,
    activeCategoryId,
    setActiveCategoryId,
    selectedIds,
    isCustomCategory,
    formatCategoryLabel,
    customDescriptionCopy,
    customPlaceholder,
    customDescription,
    setCustomDescription,
    toggleSelection,
    handleInfoPress,
    // Data
    allHeadshots,
    headshotImageUrl,
    profileInitials,
    selfieUpload,
    selfieImageId,
    selfieImageUrl,
    // Preview
    previewImageUrl,
    previewImageId,
    previewHasImage,
    previewIsGenerated,
    previewSource,
    showUploadButton,
    showDeletePreview,
    // Generation
    generating,
    isDirty,
    isStyleDisabled,
    isGenerateDisabled,
    generateOverlayOpacity,
    generateIconScale,
    generateIconOpacity,
    handleGenerateVariation,
    // Variation navigation
    completedVariations,
    previewGenerationIndex,
    showGenerationNav,
    canNavigateBack,
    canNavigateForward,
    canShare,
    handleNavigateGeneration,
    // Actions
    handlePickCamera,
    handlePickLibrary,
    handleUndo,
    handleStylePress,
    handleRestoreSelfie,
    handleSharePreview,
    handleDeletePreviewImage,
    handlePreviewPress,
    handleHeadshotSelect,
    handleSwipeIndexChange,
    // Modals
    policyModalVisible,
    policyMessage,
    setPolicyModalVisible,
    error,
    setError,
    infoModalVisible,
    setInfoModalVisible,
    lightboxVisible,
    setLightboxVisible,
    lightboxUrl,
    showFaceMenu,
    setShowFaceMenu,
  };
}
