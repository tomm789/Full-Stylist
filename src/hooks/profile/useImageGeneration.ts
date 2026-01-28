/**
 * useImageGeneration Hook
 * Handle headshot and body shot generation
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToStorage, uriToBlob } from '@/lib/utils/image-helpers';
import { supabase } from '@/lib/supabase';
import {
  triggerHeadshotGenerate,
  triggerBodyShotGenerate,
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
} from '@/lib/ai-jobs';

interface UseImageGenerationReturn {
  generating: boolean;
  loadingMessage: string;
  uploadedUri: string | null;
  uploadedBlob: Blob | null;
  policyModalVisible: boolean;
  policyMessage: string;
  pickImage: (useCamera?: boolean) => Promise<void>;
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
  closePolicyModal: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');

  const pickImage = async (useCamera = false) => {
    console.log('[pickImage] Starting, useCamera:', useCamera);
    
    const permissionFn = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permissionFn();
    if (status !== 'granted') {
      console.log('[pickImage] Permission denied');
      Alert.alert(
        'Permission Required',
        'Please grant ' + (useCamera ? 'camera' : 'camera roll') + ' permissions'
      );
      return;
    }

    console.log('[pickImage] Permission granted');
    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';
    const launchFn = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    console.log('[pickImage] Launching picker...');
    const result = await launchFn({
      mediaTypes,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    console.log('[pickImage] Picker result:', {
      canceled: result.canceled,
      hasAssets: !!(result.assets && result.assets[0])
    });

    if (result.canceled || !result.assets[0]) {
      console.log('[pickImage] User canceled or no assets');
      return;
    }

    console.log('[pickImage] Converting to blob...');
    const blob = await uriToBlob(result.assets[0].uri, 'image/jpeg');
    console.log('[pickImage] Blob created, size:', blob.size);

    setUploadedUri(result.assets[0].uri);
    setUploadedBlob(blob);
    console.log('[pickImage] Done!');
  };

  const clearImage = () => {
    setUploadedUri(null);
    setUploadedBlob(null);
  };

  const generateHeadshot = async (
    userId: string,
    hairStyle?: string,
    makeupStyle?: string
  ): Promise<string | null> => {
    console.log('=== HEADSHOT GENERATION START ===');
    console.log('userId:', userId);
    console.log('uploadedBlob exists:', !!uploadedBlob);

    if (!uploadedBlob) {
      console.log('ERROR: No blob');
      Alert.alert('Error', 'Please take or upload a photo first');
      return null;
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');

    try {
      console.log('-> Uploading...');
      const uploadResult = await uploadImageToStorage(
        userId,
        uploadedBlob,
        'selfie-' + Date.now() + '.jpg'
      );
      console.log('Upload done, error:', !!uploadResult.error);
      
      if (uploadResult.error) throw uploadResult.error;

      setLoadingMessage('Creating headshot job...');

      console.log('-> Creating image record...');
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: userId,
          storage_bucket: 'media',
          storage_key: uploadResult.data.path,
          mime_type: 'image/jpeg',
          source: 'upload',
        })
        .select()
        .single();

      console.log('Image record done, error:', !!imageError);

      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create image record');
      }

      console.log('-> Creating job...');
      const { data: job, error: jobError } = await triggerHeadshotGenerate(
        userId,
        imageRecord.id,
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
      Alert.alert('Error', message);
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
    if (!uploadedBlob) {
      Alert.alert('Error', 'Please take or upload a photo first');
      return null;
    }

    setGenerating(true);
    setLoadingMessage('Uploading photo...');

    try {
      const uploadResult = await uploadImageToStorage(
        userId,
        uploadedBlob,
        'body-' + Date.now() + '.jpg'
      );
      if (uploadResult.error) throw uploadResult.error;

      setLoadingMessage('Creating studio model job...');

      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: userId,
          storage_bucket: 'media',
          storage_key: uploadResult.data.path,
          mime_type: 'image/jpeg',
          source: 'upload',
        })
        .select()
        .single();

      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create image record');
      }

      const { data: job, error: jobError } = await triggerBodyShotGenerate(
        userId,
        imageRecord.id,
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
      Alert.alert('Error', message);
      return null;
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
    pickImage,
    clearImage,
    generateHeadshot,
    generateBodyShot,
    closePolicyModal,
  };
}
