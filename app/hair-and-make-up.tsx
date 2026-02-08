/**
 * Hair & Make-Up Presets Screen
 * Single-page flow with preview, inline editor, and lightbox.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Share,
  Platform,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import {
  PillButton,
  HeaderIconButton,
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileImages, useImageGeneration } from '@/hooks/profile';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';
import { createCommonStyles } from '@/styles/commonStyles';
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
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography, shadows } = theme;

type TabId = 'hair' | 'makeup';
type ViewMode = 'grid' | 'face' | TabId;
type PreviewSource = 'none' | 'selfie' | 'headshot' | 'variation' | 'upload';
const CUSTOM_CATEGORY_ID = 'custom';
const DEFAULT_HAIR_CATEGORY_ID = 'long-hairstyles';
const INFO_ICON_SIZE = 16;

export default function HairAndMakeUpScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const commonStyles = createCommonStyles(colors);
  const { user } = useAuth();
  const navigation = useNavigation();
  const {
    allHeadshots,
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
    selfieUpload.pickImage(true);
  };

  const handlePickLibrary = () => {
    if (selfieUpload.generating) return;
    selfieUpload.pickImage(false);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightButtons}>
          <HeaderIconButton
            icon="sparkles-outline"
            onPress={handleGenerateVariation}
            disabled={isGenerateDisabled || !previewHasImage}
            accessibilityLabel="Generate"
          />
          <HeaderIconButton
            icon="camera-outline"
            onPress={handlePickCamera}
            disabled={isStyleDisabled}
            accessibilityLabel="Open camera"
          />
        </View>
      ),
    });
  }, [
    navigation,
    styles.headerRightButtons,
    isGenerateDisabled,
    previewHasImage,
    isStyleDisabled,
    handleGenerateVariation,
    handlePickCamera,
  ]);

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

  const renderHeadshotGridItem = ({ item }: { item: { id: string; url: string | null } }) => (
    <TouchableOpacity
      style={postGridStyles.gridItem}
      onPress={() => handleHeadshotSelect(item)}
      activeOpacity={0.85}
    >
      {item.url ? (
        <ExpoImage
          source={{ uri: item.url }}
          style={postGridStyles.gridImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.headshotGridPlaceholder}>
          <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={commonStyles.sectionTopPadding}>
          <View style={styles.pillRowStack}>
            <View style={styles.tabPills}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tabPillsRow}>
                  <PillButton
                    label=""
                    icon="grid-outline"
                    selected={showHeadshotGrid}
                    onPress={() => setActiveView('grid')}
                    size="medium"
                    variant="default"
                  />
                  <PillButton
                    label="Hair"
                    icon="cut-outline"
                    selected={activeView === 'hair'}
                    onPress={() => {
                      setLastPresetTab('hair');
                      setActiveView('hair');
                    }}
                    size="medium"
                    variant="default"
                  />
                  <PillButton
                    label="Make-Up"
                    icon="color-palette-outline"
                    selected={activeView === 'makeup'}
                    onPress={() => {
                      setLastPresetTab('makeup');
                      setActiveView('makeup');
                    }}
                    size="medium"
                    variant="default"
                  />
                  <PillButton
                    label="Face"
                    icon="person-circle-outline"
                    selected={activeView === 'face'}
                    onPress={() => setActiveView('face')}
                    size="medium"
                    variant="default"
                  />
                </View>
              </ScrollView>
            </View>

            {isPresetView && presets.length > 0 && (
              <View style={styles.categoryPills}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryPillsRow}>
                    <PillButton
                      label="Custom"
                      selected={isCustomCategory}
                      onPress={() => setActiveCategoryId(CUSTOM_CATEGORY_ID)}
                      size="medium"
                      variant="default"
                    />
                    {categoryPills.map((category) => (
                      <PillButton
                        key={category.id}
                        label={formatCategoryLabel(category.title)}
                        selected={activeCategory?.id === category.id}
                        onPress={() => setActiveCategoryId(category.id)}
                        size="medium"
                        variant="default"
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {showFacePreview && (
          <View
            style={[
              styles.facePreviewSection,
              commonStyles.sectionHorizontalPadding,
              commonStyles.sectionTopPadding,
            ]}
          >
            <View style={styles.imagePreviewContainer}>
              {previewHasImage ? (
                <TouchableOpacity
                  style={styles.previewImageButton}
                  onPress={handlePreviewPress}
                  activeOpacity={0.9}
                >
                  <ExpoImage
                    source={{ uri: previewImageUrl || undefined }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.placeholder}
                  onPress={handlePickCamera}
                  disabled={isStyleDisabled}
                >
                  <Ionicons name="camera-outline" size={42} color={colors.textSecondary} />
                  <Text style={styles.placeholderText}>Tap to open camera</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.faceMenuButton,
                  !previewHasImage && styles.faceMenuButtonDisabled,
                ]}
                onPress={() => setShowFaceMenu(true)}
                disabled={!previewHasImage}
                accessibilityLabel="Open menu"
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textLight} />
              </TouchableOpacity>

              {generating && previewHasImage && (
                <Animated.View
                  style={[styles.generateOverlay, { opacity: generateOverlayOpacity }]}
                  pointerEvents="none"
                />
              )}

              {previewIsGenerated && (
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={handleRestoreSelfie}
                  disabled={isStyleDisabled}
                  accessibilityLabel="Restore selfie"
                >
                  <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {showHeadshotGrid && (
          <PostGrid
            data={allHeadshots}
            keyExtractor={(item) => item.id}
            renderItem={renderHeadshotGridItem}
            scrollEnabled={false}
          />
        )}

        {isPresetView && (
          <>
            {(isCustomCategory || activeCategory) && (
              <View
                style={[
                  styles.categoryCard,
                  commonStyles.sectionHorizontalPadding,
                  commonStyles.sectionTopPadding,
                ]}
              >
                {isCustomCategory ? (
                  <>
                    <View style={styles.customHeader}>
                      <Text style={styles.customHint}>{customDescriptionCopy}</Text>
                      <TouchableOpacity
                        style={styles.infoIconButton}
                        onPress={() => setInfoModalVisible(true)}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.customInput}
                      placeholder={customPlaceholder}
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      value={customDescription}
                      onChangeText={setCustomDescription}
                    />
                  </>
                ) : (
                  activeCategory?.sections.map((section) => (
                    <View key={section.id} style={styles.sectionBlock}>
                      {activeCategory.sections.length > 1 && (
                        <Text style={styles.sectionLabel}>{section.title}</Text>
                      )}
                      <View style={styles.pillRow}>
                        {section.options.map((option) => {
                          const isSelected = selectedIds.includes(option.id);
                          return (
                            <TouchableOpacity
                              key={option.id}
                              style={[styles.pill, isSelected && styles.pillSelected]}
                              onPress={() => toggleSelection(option.id)}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.pillText,
                                  isSelected && styles.pillTextSelected,
                                ]}
                              >
                                {option.title}
                              </Text>
                              <TouchableOpacity
                                style={styles.infoButton}
                                onPress={(event) => {
                                  event.stopPropagation?.();
                                  handleInfoPress(option);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={INFO_ICON_SIZE}
                                  color={isSelected ? colors.textLight : colors.textSecondary}
                                />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <DropdownMenuModal
        visible={showFaceMenu}
        onClose={() => setShowFaceMenu(false)}
        topOffset={120}
        align="right"
      >
        <DropdownMenuItem
          label="Share"
          icon="share-outline"
          onPress={() => {
            setShowFaceMenu(false);
            handleSharePreview();
          }}
          disabled={!canShare}
        />
        <View style={dropdownMenuStyles.menuDivider} />
        <DropdownMenuItem
          label="Delete"
          icon="trash-outline"
          onPress={() => {
            setShowFaceMenu(false);
            handleDeletePreviewImage();
          }}
          danger
          disabled={!showDeletePreview}
        />
      </DropdownMenuModal>

      <PolicyBlockModal
        visible={policyModalVisible}
        message={policyMessage}
        onClose={() => setPolicyModalVisible(false)}
      />

      <ErrorModal
        visible={!!error && !generating}
        message={error || undefined}
        onClose={() => setError(null)}
      />

      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>How It Works</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoModalText}>
              Choose presets below to build your hair and make-up direction.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxCloseButton}
            onPress={() => setLightboxVisible(false)}
          >
            <Ionicons name="close" size={22} color={colors.textLight} />
          </TouchableOpacity>
          {lightboxUrl && (
            <ExpoImage
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    paddingBottom: spacing.massive,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  facePreviewSection: {
    width: '100%',
    gap: spacing.md,
  },
  previewSection: {
    alignSelf: 'center',
    width: '100%',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  previewNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  previewNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewNavButtonDisabled: {
    opacity: 0.4,
  },
  previewRailRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  previewCore: {
    flex: 1,
    minWidth: 0,
  },
  railColumnLeft: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  railStack: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  railColumnRight: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  railSlot: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageButton: {
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  generateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.gray200,
  },
  railButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  placeholderText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mediaButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  restoreButton: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  faceMenuButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  faceMenuButtonDisabled: {
    opacity: 0.5,
  },
  generateButton: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  infoIconButton: {
    padding: spacing.xs,
  },
  tabPills: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  pillRowStack: {
    gap: 0,
  },
  tabPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryPills: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 0,
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs * 2 + INFO_ICON_SIZE,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  infoButton: {
    position: 'absolute',
    right: spacing.xs,
    top: '50%',
    transform: [{ translateY: -INFO_ICON_SIZE / 2 }],
  },
  headshotGridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  customInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  infoModalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  infoModalText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  historySection: {
    gap: spacing.md,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyLoadingText: {
    color: colors.textSecondary,
  },
  variationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  variationCard: {
    width: 86,
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  variationCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  variationImage: {
    width: '100%',
    height: '100%',
  },
  variationPending: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  variationStatusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  savedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  savedBadgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  variationMenuTrigger: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  variationMenuOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  variationMenuCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  variationMenuTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  variationMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  variationMenuButtonDestructive: {
    backgroundColor: colors.backgroundSecondary,
  },
  variationMenuButtonCancel: {
    justifyContent: 'center',
  },
  variationMenuButtonDisabled: {
    opacity: 0.5,
  },
  variationMenuButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.black,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
});
