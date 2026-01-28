/**
 * useHeadshotDetailActions Hook
 * Actions and form state for headshot detail screen
 * Uses useImageEdit internally for load/duplicate/delete/set-as-active
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useImageEdit } from './useImageEdit';
import { useImageGeneration } from './useImageGeneration';
import {
  triggerHeadshotGenerate,
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
} from '@/lib/ai-jobs';

interface UseHeadshotDetailActionsProps {
  headshotId: string | undefined;
  userId: string | undefined;
}

interface UseHeadshotDetailActionsReturn {
  // Image data (from useImageEdit)
  headshot: {
    id: string;
    url: string;
    originalSelfieId: string | null;
    originalHairStyle: string;
    originalMakeupStyle: string;
  } | null;
  loading: boolean;
  duplicating: boolean;
  deleting: boolean;
  refresh: () => Promise<void>;

  // Form state
  hairStyle: string;
  makeupStyle: string;
  setHairStyle: (style: string) => void;
  setMakeupStyle: (style: string) => void;

  // Actions
  regenerating: boolean;
  loadingMessage: string;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  handleRegenerate: () => Promise<void>;
  handleDuplicate: () => Promise<void>;
  handleDelete: () => Promise<void>;
  setAsActive: () => Promise<boolean>;

  // Policy blocking
  policyModalVisible: boolean;
  policyMessage: string;
  localPolicyVisible: boolean;
  localPolicyMessage: string;
  closePolicyModal: () => void;
  setLocalPolicyVisible: (visible: boolean) => void;
}

export function useHeadshotDetailActions({
  headshotId,
  userId,
}: UseHeadshotDetailActionsProps): UseHeadshotDetailActionsReturn {
  const router = useRouter();
  const { user } = useAuth();
  
  // Use userId from props, fallback to user?.id
  const effectiveUserId = userId || user?.id;

  // Use useImageEdit internally (as required by plan)
  const {
    image: headshot,
    loading,
    duplicating,
    deleting,
    refresh,
    duplicate: duplicateImage,
    deleteImage: deleteHeadshotImage,
    setAsActive,
  } = useImageEdit({
    imageId: headshotId,
    userId: effectiveUserId,
    imageType: 'headshot',
  });

  // Form state
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');

  // Regenerate state
  const [regenerating, setRegenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Policy blocking (from useImageGeneration)
  const { policyModalVisible, policyMessage, closePolicyModal } = useImageGeneration();
  const [localPolicyVisible, setLocalPolicyVisible] = useState(false);
  const [localPolicyMessage, setLocalPolicyMessage] = useState('');

  // Sync form state when headshot loads
  useEffect(() => {
    if (headshot) {
      setHairStyle(headshot.originalHairStyle);
      setMakeupStyle(headshot.originalMakeupStyle);
    }
  }, [headshot]);

  const handleRegenerate = useCallback(async () => {
    if (!user || !headshot?.originalSelfieId) {
      Alert.alert('Error', 'Cannot regenerate without original selfie');
      return;
    }

    setRegenerating(true);
    setLoadingMessage('Creating headshot job...');

    try {
      const { data: job, error: jobError } = await triggerHeadshotGenerate(
        user.id,
        headshot.originalSelfieId,
        hairStyle || undefined,
        makeupStyle || undefined
      );

      if (!job || jobError) {
        throw jobError || new Error('Failed to create headshot job');
      }

      await triggerAIJobExecution(job.id);
      setLoadingMessage('Regenerating headshot...\nThis may take 20-30 seconds.');

      const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
        job.id,
        30,
        2000,
        '[Headshot]'
      );

      if (pollError || !completedJob) {
        throw new Error('Headshot generation timed out');
      }

      if (completedJob.status === 'failed') {
        const failureMessage = completedJob.error || 'Unknown error';
        if (isGeminiPolicyBlockError(failureMessage)) {
          setLocalPolicyMessage(
            'Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.'
          );
          setLocalPolicyVisible(true);
          return;
        }
        throw new Error(`Generation failed: ${failureMessage}`);
      }

      const generatedImageId =
        completedJob.result?.image_id || completedJob.result?.generated_image_id;

      if (generatedImageId) {
        router.replace(`/headshot/${generatedImageId}` as any);
      } else {
        await refresh();
      }
    } catch (error: any) {
      const message = error.message || 'Failed to generate headshot';
      if (isGeminiPolicyBlockError(message)) {
        setLocalPolicyMessage(
          'Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.'
        );
        setLocalPolicyVisible(true);
        return;
      }
      Alert.alert('Error', message);
    } finally {
      setRegenerating(false);
      setLoadingMessage('');
    }
  }, [effectiveUserId, headshot, hairStyle, makeupStyle, refresh, router]);

  const handleDuplicate = useCallback(async () => {
    const newId = await duplicateImage();
    if (newId) {
      router.replace(`/headshot/${newId}` as any);
    }
  }, [duplicateImage, router]);

  const handleDelete = useCallback(async () => {
    const success = await deleteHeadshotImage();
    if (success) {
      setShowDeleteConfirm(false);
      router.back();
    }
  }, [deleteHeadshotImage, router]);

  return {
    // Image data
    headshot,
    loading,
    duplicating,
    deleting,
    refresh,

    // Form state
    hairStyle,
    makeupStyle,
    setHairStyle,
    setMakeupStyle,

    // Actions
    regenerating,
    loadingMessage,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleRegenerate,
    handleDuplicate,
    handleDelete,
    setAsActive,

    // Policy blocking
    policyModalVisible,
    policyMessage,
    localPolicyVisible,
    localPolicyMessage,
    closePolicyModal,
    setLocalPolicyVisible,
  };
}
