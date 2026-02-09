import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileImages } from '@/hooks/profile';
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
import { supabase } from '@/lib/supabase';
import {
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
  triggerHeadshotGenerateWithPrompt,
} from '@/lib/ai-jobs';

export type TabId = 'hair' | 'makeup';
export type ScreenMode = 'library' | 'detail' | 'editor';

export function useHairAndMakeup() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    headshotImageUrl,
    activeHeadshotId,
    allHeadshots,
  } = useProfileImages({ userId: user?.id });

  // Tab & preset selection state
  const [activeTab, setActiveTab] = useState<TabId>('hair');
  const [selectedHair, setSelectedHair] = useState<string[]>([]);
  const [selectedMakeup, setSelectedMakeup] = useState<string[]>([]);
  const [selectedHairCategory, setSelectedHairCategory] = useState<string | null>(null);
  const [selectedMakeupCategory, setSelectedMakeupCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');

  // Session & generation state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variations, setVariations] = useState<HeadshotGenerationVariation[]>([]);
  const [variationUrls, setVariationUrls] = useState<Map<string, string | null>>(new Map());
  const [selectedVariationIds, setSelectedVariationIds] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);

  // UI state
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>('library');
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(null);
  const [selectedHeadshotUrl, setSelectedHeadshotUrl] = useState<string | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [baselineInput, setBaselineInput] = useState({
    hairPresetIds: [] as string[],
    makeupPresetIds: [] as string[],
    customDescription: '',
  });

  // Derived state
  const presets = useMemo<PresetCategory[]>(
    () => (activeTab === 'hair' ? hairPresets : makeupPresets),
    [activeTab]
  );

  const activeCategoryId =
    activeTab === 'hair' ? selectedHairCategory : selectedMakeupCategory;
  const setActiveCategoryId =
    activeTab === 'hair' ? setSelectedHairCategory : setSelectedMakeupCategory;

  const activeCategory = useMemo(() => {
    if (presets.length === 0) return null;
    const found = presets.find((category) => category.id === activeCategoryId);
    return found || presets[0];
  }, [presets, activeCategoryId]);

  const selectedIds = activeTab === 'hair' ? selectedHair : selectedMakeup;
  const setSelectedIds = activeTab === 'hair' ? setSelectedHair : setSelectedMakeup;

  const baseHeadshotId = selectedHeadshotId || activeHeadshotId || null;
  const baseHeadshotUrl = selectedHeadshotUrl || headshotImageUrl || null;

  const isDirty = useMemo(() => {
    const sortIds = (ids: string[]) => [...ids].sort().join(',');
    return (
      sortIds(selectedHair) !== sortIds(baselineInput.hairPresetIds) ||
      sortIds(selectedMakeup) !== sortIds(baselineInput.makeupPresetIds) ||
      (customDescription || '') !== (baselineInput.customDescription || '')
    );
  }, [selectedHair, selectedMakeup, customDescription, baselineInput]);

  // Handlers
  const toggleSelection = useCallback((optionId: string) => {
    setSelectedIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  }, [setSelectedIds]);

  const handleInfoPress = useCallback((option: PresetOption) => {
    Alert.alert(option.title, option.description);
  }, []);

  const loadVariations = useCallback(async (currentSessionId: string | null) => {
    if (!currentSessionId) {
      setVariations([]);
      setVariationUrls(new Map());
      return;
    }
    setLoadingHistory(true);
    try {
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
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadSession = useCallback(async () => {
    if (!user?.id || !baseHeadshotId) {
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
      setSelectedVariationIds([]);
      return;
    }
    const session = await getLatestHeadshotGenerationSession(user.id, baseHeadshotId);
    if (session) {
      setSessionId(session.id);
      setSelectedVariationIds([]);
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
      setSelectedVariationIds([]);
    }
  }, [user?.id, baseHeadshotId, loadVariations]);

  useEffect(() => {
    loadSession();
  }, [user?.id, baseHeadshotId]);

  const handleGenerateVariation = useCallback(async () => {
    if (!user?.id) return;
    if (!baseHeadshotId) {
      Alert.alert('Headshot Required', 'Generate a headshot before creating variations.');
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
          baseHeadshotId,
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
        baseHeadshotId,
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
      });

      await loadVariations(activeSessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate variation');
    } finally {
      setGenerating(false);
    }
  }, [user?.id, baseHeadshotId, selectedHair, selectedMakeup, customDescription, sessionId, loadVariations]);

  const toggleVariationSelection = useCallback((variationId: string) => {
    setSelectedVariationIds((prev) =>
      prev.includes(variationId)
        ? prev.filter((id) => id !== variationId)
        : [...prev, variationId]
    );
  }, []);

  const handleSaveSelected = useCallback(async () => {
    if (selectedVariationIds.length === 0) return;
    try {
      await Promise.all(
        selectedVariationIds.map((id) =>
          updateHeadshotGenerationVariation(id, { is_saved: true })
        )
      );
      await loadVariations(sessionId);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save selected variations');
    } finally {
      setSelectedVariationIds([]);
    }
  }, [selectedVariationIds, sessionId, loadVariations]);

  const handleOpenHeadshotDetail = useCallback((id: string, url: string | null) => {
    setSelectedHeadshotId(id);
    setSelectedHeadshotUrl(url);
    setScreenMode('detail');
  }, []);

  const handleEditHeadshot = useCallback(() => {
    if (!selectedHeadshotId) return;
    setScreenMode('editor');
  }, [selectedHeadshotId]);

  return {
    // Navigation
    router,
    screenMode,
    setScreenMode,

    // User & headshots
    allHeadshots,
    selectedHeadshotId,
    selectedHeadshotUrl,
    baseHeadshotUrl,

    // Tab & preset selection
    activeTab,
    setActiveTab,
    presets,
    activeCategory,
    activeCategoryId,
    setActiveCategoryId,
    selectedIds,
    customDescription,
    setCustomDescription,
    toggleSelection,
    handleInfoPress,

    // Session & generation
    variations,
    variationUrls,
    selectedVariationIds,
    loadingHistory,
    generating,
    isDirty,

    // Handlers
    handleGenerateVariation,
    toggleVariationSelection,
    handleSaveSelected,
    handleOpenHeadshotDetail,
    handleEditHeadshot,

    // Modal state
    policyModalVisible,
    policyMessage,
    setPolicyModalVisible,
    error,
    setError,
    infoModalVisible,
    setInfoModalVisible,
  };
}
