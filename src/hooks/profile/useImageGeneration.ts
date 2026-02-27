/**
 * useImageGeneration Hook
 * Handle headshot and body shot generation
 */

import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { uploadAndCreateImage } from '@/lib/utils/image-helpers';
import { supabase } from '@/lib/supabase';
import { updateUserProfile } from '@/lib/user';
import {
  triggerHeadshotGenerate,
  triggerBodyShotGenerate,
  triggerBodyShotGenerateFromSelfies,
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
} from '@/lib/ai-jobs';
import { useImagePicker } from './useImagePicker';

interface UseImageGenerationReturn {
  generating: boolean;
  loadingMessage: string;
  uploadedUri: string | null;
  uploadedBlob: Blob | null;
  policyModalVisible: boolean;
  policyMessage: string;
  error: string | null;
  clearError: () => void;
  pickImage: (
    useCamera?: boolean,
    options?: {
      cameraType?: 'front' | 'back';
      allowsEditing?: boolean;
      aspect?: [number, number];
    }
  ) => Promise<void>;
  pickHeadshotCameraImage: () => Promise<void>;
  pickHeadshotLibraryImage: () => Promise<void>;
  pickBodyShotCameraImage: () => Promise<void>;
  clearImage: () => void;
  generateHeadshot: (
    userId: string,
    hairStyle?: string,
    makeupStyle?: string
  ) => Promise<string | null>;
  generateBodyShot: (
    userId: string,
    headshotId: string
  ) => Promise<string | null>;
  generateBodyShotFromSelfies: (
    userId: string,
    selfieImageId: string,
    mirrorSelfieImageId: string
  ) => Promise<{
    imageId: string | null;
    errorMessage?: string;
    policyMessage?: string;
    policyBlocked?: boolean;
  }>;
  saveUploadedImage: (
    userId: string,
    filePrefix?: string
  ) => Promise<{ imageId: string | null; errorMessage?: string }>;
  closePolicyModal: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    uploadedUri,
    uploadedBlob,
    pickImage,
    pickHeadshotCameraImage,
    pickHeadshotLibraryImage,
    pickBodyShotCameraImage,
    clearImage,
  } = useImagePicker();

  const clearError = () => setError(null);

  const saveUploadedImage = async (
    userId: string,
    filePrefix: string = 'upload'
  ): Promise<{ imageId: string | null; errorMessage?: string }> => {
    if (!uploadedBlob && !uploadedUri) {
      Alert.alert('Error', 'Please take or upload a photo first');
      return { imageId: null, errorMessage: 'Please take or upload a photo first' };
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uploadSource =
        Platform.OS === 'web'
          ? (uploadedBlob as Blob)
          : { uri: uploadedUri as string, mimeType: 'image/jpeg' };

      const { data, error } = await uploadAndCreateImage(
        userId,
        uploadSource,
        `${filePrefix}-${stamp}.jpg`,
        'upload'
      );

      if (error || !data) {
        throw error || new Error('Failed to upload photo');
      }

      return { imageId: data.imageId };
    } catch (error: any) {
      const message = error.message || 'Failed to upload photo';
      setError(message);
      return { imageId: null, errorMessage: message };
    } finally {
      setGenerating(false);
      setLoadingMessage('');
    }
  };

  const generateHeadshot = async (
    userId: string,
    hairStyle?: string,
    makeupStyle?: string
  ): Promise<string | null> => {
    console.log('=== HEADSHOT GENERATION START ===');
    console.log('userId:', userId);
    console.log('uploadedBlob exists:', !!uploadedBlob);

    if (!uploadedBlob && !uploadedUri) {
      console.log('ERROR: No blob');
      Alert.alert('Error', 'Please take or upload a photo first');
      return null;
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');

    try {
      console.log('-> Uploading...');
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const uploadSource =
        Platform.OS === 'web'
          ? uploadedBlob
          : { uri: uploadedUri as string, mimeType: 'image/jpeg' };
      const { data: uploadedImage, error: uploadError } = await uploadAndCreateImage(
        userId,
        uploadSource,
        `selfie-${stamp}.jpg`,
        'upload'
      );
      console.log('Upload done, error:', !!uploadError);
      if (uploadError || !uploadedImage) {
        throw uploadError || new Error('Failed to upload selfie');
      }

      setLoadingMessage('Creating headshot job...');

      console.log('-> Creating job...');
      const { data: job, error: jobError } = await triggerHeadshotGenerate(
        userId,
        uploadedImage.imageId,
        hairStyle,
        makeupStyle
      );

      console.log('Job created, error:', !!jobError, 'jobId:', job?.id);

      if (!job || jobError) {
        throw jobError || new Error('Failed to create headshot job');
      }

      console.log('-> Executing job...');
      await triggerAIJobExecution(job.id);
      console.log('Execution triggered');

      setLoadingMessage('Generating professional headshot...\nThis may take 20-30 seconds.');

      console.log('-> Waiting for completion...');
      const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
        job.id,
        30,
        2000,
        '[Headshot]'
      );

      console.log('Wait done, status:', completedJob?.status);

      if (pollError || !completedJob) {
        throw new Error('Headshot generation timed out or failed');
      }

      if (completedJob.status === 'failed') {
        const failureMessage = completedJob.error || 'Unknown error';
        console.log('Job failed:', failureMessage);

        if (isGeminiPolicyBlockError(failureMessage)) {
          setPolicyMessage(
            'Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.'
          );
          setPolicyModalVisible(true);
          return null;
        }
        throw new Error('Generation failed: ' + failureMessage);
      }

      const generatedImageId =
        completedJob.result?.image_id || completedJob.result?.generated_image_id;

      console.log('=== SUCCESS! Image ID:', generatedImageId);

      if (generatedImageId) {
        try {
          const { data: userProfile } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('id', userId)
            .single();

          if (!userProfile?.avatar_url) {
            const { data: imageData } = await supabase
              .from('images')
              .select('storage_bucket, storage_key')
              .eq('id', generatedImageId)
              .single();

            if (imageData?.storage_key) {
              const { data: urlData } = supabase.storage
                .from(imageData.storage_bucket || 'media')
                .getPublicUrl(imageData.storage_key);

              if (urlData?.publicUrl) {
                await updateUserProfile(userId, { avatar_url: urlData.publicUrl });
              }
            }
          }
        } catch (avatarError) {
          console.warn('[Headshot] Failed to auto-set avatar:', avatarError);
        }
      }

      return generatedImageId || null;
    } catch (error: any) {
      console.error('=== ERROR:', error.message);
      const message = error.message || 'Failed to generate headshot';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage(
          'Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.'
        );
        setPolicyModalVisible(true);
        return null;
      }
      setError(message);
      return null;
    } finally {
      console.log('-> Cleanup');
      setGenerating(false);
      setLoadingMessage('');
    }
  };

  const generateBodyShot = async (
    userId: string,
    headshotId: string
  ): Promise<string | null> => {
    if (!uploadedBlob && !uploadedUri) {
      Alert.alert('Error', 'Please take or upload a photo first');
      return null;
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const uploadSource =
        Platform.OS === 'web'
          ? uploadedBlob
          : { uri: uploadedUri as string, mimeType: 'image/jpeg' };
      const { data: uploadedImage, error: uploadError } = await uploadAndCreateImage(
        userId,
        uploadSource,
        `body-${stamp}.jpg`,
        'upload'
      );
      if (uploadError || !uploadedImage) {
        throw uploadError || new Error('Failed to upload body photo');
      }

      setLoadingMessage('Creating studio model job...');

      const { data: job, error: jobError } = await triggerBodyShotGenerate(
        userId,
        uploadedImage.imageId,
        headshotId
      );

      if (!job || jobError) {
        throw jobError || new Error('Failed to create body shot job');
      }

      await triggerAIJobExecution(job.id);
      setLoadingMessage('Generating studio model...\nThis may take 30-40 seconds.');

      const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
        job.id,
        60,
        2000,
        '[BodyShot]'
      );

      if (pollError || !completedJob) {
        throw new Error(
          'Studio model generation timed out. You can check your profile later to see if it completed.'
        );
      }

      if (completedJob.status === 'failed') {
        const failureMessage = completedJob.error || 'Unknown error';
        if (isGeminiPolicyBlockError(failureMessage)) {
          setPolicyMessage(
            'Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.'
          );
          setPolicyModalVisible(true);
          return null;
        }
        throw new Error('Generation failed: ' + failureMessage);
      }

      const generatedImageId =
        completedJob.result?.image_id || completedJob.result?.generated_image_id;

      return generatedImageId || null;
    } catch (error: any) {
      const message = error.message || 'Failed to generate studio model';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage(
          'Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.'
        );
        setPolicyModalVisible(true);
        return null;
      }
      setError(message);
      return null;
    } finally {
      setGenerating(false);
      setLoadingMessage('');
    }
  };

  const generateBodyShotFromSelfies = async (
    userId: string,
    selfieImageId: string,
    mirrorSelfieImageId: string
  ): Promise<{
    imageId: string | null;
    errorMessage?: string;
    policyMessage?: string;
    policyBlocked?: boolean;
  }> => {
    if (!selfieImageId || !mirrorSelfieImageId) {
      Alert.alert('Error', 'Both selfie images are required');
      return { imageId: null, errorMessage: 'Both selfie images are required' };
    }

    setGenerating(true);
    setLoadingMessage('Creating studio model job...');

    try {
      const { data: job, error: jobError } = await triggerBodyShotGenerateFromSelfies(
        userId,
        selfieImageId,
        mirrorSelfieImageId
      );

      if (!job || jobError) {
        throw jobError || new Error('Failed to create body shot job');
      }

      await triggerAIJobExecution(job.id);
      setLoadingMessage('Generating studio model...\nThis may take 30-40 seconds.');

      const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
        job.id,
        60,
        2000,
        '[BodyShot]'
      );

      if (pollError || !completedJob) {
        throw new Error(
          'Studio model generation timed out. You can check your profile later to see if it completed.'
        );
      }

      if (completedJob.status === 'failed') {
        const failureMessage = completedJob.error || 'Unknown error';
        if (isGeminiPolicyBlockError(failureMessage)) {
          setPolicyMessage(
            'Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.'
          );
          setPolicyModalVisible(true);
          return {
            imageId: null,
            policyBlocked: true,
            policyMessage:
              'Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.',
          };
        }
        throw new Error('Generation failed: ' + failureMessage);
      }

      const generatedImageId =
        completedJob.result?.image_id || completedJob.result?.generated_image_id;

      return { imageId: generatedImageId || null };
    } catch (error: any) {
      const message = error.message || 'Failed to generate studio model';
      if (isGeminiPolicyBlockError(message)) {
        setPolicyMessage(
          'Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.'
        );
        setPolicyModalVisible(true);
        return {
          imageId: null,
          policyBlocked: true,
          policyMessage:
            'Gemini could not generate this studio model because it conflicts with safety policy. No credits were charged.',
        };
      }
      setError(message);
      return { imageId: null, errorMessage: message };
    } finally {
      setGenerating(false);
      setLoadingMessage('');
    }
  };

  const closePolicyModal = () => {
    setPolicyModalVisible(false);
    setPolicyMessage('');
  };

  return {
    generating,
    loadingMessage,
    uploadedUri,
    uploadedBlob,
    policyModalVisible,
    policyMessage,
    error,
    clearError,
    pickImage,
    pickHeadshotCameraImage,
    pickHeadshotLibraryImage,
    pickBodyShotCameraImage,
    clearImage,
    generateHeadshot,
    generateBodyShot,
    generateBodyShotFromSelfies,
    saveUploadedImage,
    closePolicyModal,
  };
}
