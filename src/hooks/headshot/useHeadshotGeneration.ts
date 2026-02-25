/**
 * useHeadshotGeneration
 * Handles the async AI generation flow for hair/makeup variations.
 * Owns: generating, policyModalVisible, policyMessage, error state.
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import {
  createHeadshotGenerationSession,
  createHeadshotGenerationVariation,
  updateHeadshotGenerationSession,
  updateHeadshotGenerationVariation,
  type HeadshotGenerationVariation,
} from '@/lib/headshot/generation';
import { buildHairMakeupPrompt } from '@/lib/headshot/hairMakeupPrompt';
import { uploadBase64ImageToStorage } from '@/lib/utils/image-helpers';
import {
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
  triggerHeadshotGenerateWithPrompt,
} from '@/lib/ai-jobs';
import type { PreviewSource } from './useHairAndMakeup';

type DrawnColorEntry = { hex: string; label: string };

export type UseHeadshotGenerationParams = {
  userId: string | null;
  baseImageId: string | null;
  previewSource: PreviewSource;
  previewImageUrl: string | null;
  selectedHair: string[];
  selectedMakeup: string[];
  customDescription: string;
  accessorySubcategory: string | null;
  jewellerySubcategory: string | null;
  advancedFields: Record<string, string>;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  setVariations: React.Dispatch<React.SetStateAction<HeadshotGenerationVariation[]>>;
  setPreviewImageId: (id: string | null) => void;
  setPreviewImageUrl: (url: string | null) => void;
  setPreviewVariationId: (id: string | null) => void;
  setPreviewSource: (source: PreviewSource) => void;
  setSelfieImageId: (id: string | null) => void;
  setSelfieImageUrl: (url: string | null) => void;
  setBaseImageId: (id: string | null) => void;
  setPreviewSource_selfie: () => void;
  saveUploadedImage: (userId: string, type: 'selfie') => Promise<{ imageId: string | null; errorMessage?: string | null }>;
  clearSelfieUploadImage: () => void;
  updateUserSettings: (userId: string, data: Record<string, unknown>) => Promise<unknown>;
  resolveImageUrl: (id: string | null) => Promise<string | null>;
  loadVariations: (sessionId: string | null) => Promise<void>;
  refreshImages: () => Promise<void>;
};

export function useHeadshotGeneration({
  userId,
  baseImageId,
  previewSource,
  previewImageUrl,
  selectedHair,
  selectedMakeup,
  customDescription,
  accessorySubcategory,
  jewellerySubcategory,
  advancedFields,
  sessionId,
  setSessionId,
  setVariations,
  setPreviewImageId,
  setPreviewImageUrl,
  setPreviewVariationId,
  setPreviewSource,
  setSelfieImageId,
  setSelfieImageUrl,
  setBaseImageId,
  setPreviewSource_selfie,
  saveUploadedImage,
  clearSelfieUploadImage,
  updateUserSettings,
  resolveImageUrl,
  loadVariations,
  refreshImages,
}: UseHeadshotGenerationParams) {
  const [generating, setGenerating] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVariation = async (
    maskBase64?: string | null,
    maskColorMap?: Array<DrawnColorEntry>
  ) => {
    if (!userId) return;
    let activeBaseImageId = baseImageId;

    if (previewSource === 'upload') {
      const { imageId, errorMessage } = await saveUploadedImage(userId, 'selfie');
      if (!imageId) {
        Alert.alert('Error', errorMessage || 'Failed to save selfie.');
        return;
      }
      await updateUserSettings(userId, { selfie_image_id: imageId });
      const resolvedUrl = await resolveImageUrl(imageId);
      const nextUrl = resolvedUrl || previewImageUrl || null;
      setSelfieImageId(imageId);
      setSelfieImageUrl(resolvedUrl);
      setBaseImageId(imageId);
      setPreviewImageId(imageId);
      setPreviewImageUrl(nextUrl);
      setPreviewVariationId(null);
      setPreviewSource_selfie();
      clearSelfieUploadImage();
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
      accessorySubcategory,
      jewellerySubcategory,
      advancedFields,
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
        const session = await createHeadshotGenerationSession(userId, activeBaseImageId, inputSnapshot);
        if (!session) throw new Error('Failed to create session');
        activeSessionId = session.id;
        setSessionId(session.id);
      } else {
        await updateHeadshotGenerationSession(activeSessionId, inputSnapshot);
      }

      const variation = await createHeadshotGenerationVariation({
        session_id: activeSessionId,
        user_id: userId,
        status: 'pending',
        prompt_text: promptText,
        input_snapshot_json: inputSnapshot,
      });

      if (!variation) throw new Error('Failed to create variation');

      setVariations((prev) => [variation, ...prev]);

      // Upload pre-captured mask if provided by draw mode
      let maskStoragePath: string | undefined;
      let maskStorageBucket: string | undefined;
      if (maskBase64) {
        const maskBucket = 'user-images';
        const maskPath = `${userId}/masks/mask-${Date.now()}.png`;
        const { data: maskUpload, error: maskError } = await uploadBase64ImageToStorage(
          maskBucket, maskPath, maskBase64, 'image/png'
        );
        if (maskUpload?.path) {
          maskStoragePath = maskUpload.path;
          maskStorageBucket = maskBucket;
        } else {
          console.warn('[HairMakeup] Mask upload failed — continuing without mask. Error:', maskError);
        }
      }

      const { data: job, error: jobError } = await triggerHeadshotGenerateWithPrompt(
        userId,
        activeBaseImageId,
        promptText,
        {
          outputFolder: 'hair_makeup_variations',
          skipUserSettingsUpdate: true,
          maskStoragePath,
          maskStorageBucket,
          maskColorMap: maskStoragePath ? maskColorMap : undefined,
        }
      );

      if (!job || jobError) {
        await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
        throw jobError || new Error('Failed to create headshot job');
      }

      await updateHeadshotGenerationVariation(variation.id, { ai_job_id: job.id });
      await triggerAIJobExecution(job.id);

      const { data: completedJob } = await waitForAIJobCompletion(job.id, 30, 2000, '[HairMakeup]');

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

  return {
    generating,
    policyModalVisible,
    setPolicyModalVisible,
    policyMessage,
    error,
    setError,
    handleGenerateVariation,
  };
}
