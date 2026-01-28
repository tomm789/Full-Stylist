/**
 * useProfileImageGeneration Hook
 * Handles headshot and body shot generation with form state
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useImageGeneration } from './useImageGeneration';

interface UseProfileImageGenerationReturn {
  // Headshot
  headshotHairStyle: string;
  headshotMakeupStyle: string;
  setHeadshotHairStyle: (style: string) => void;
  setHeadshotMakeupStyle: (style: string) => void;
  headshotGeneration: ReturnType<typeof useImageGeneration>;
  handleUploadSelfie: () => Promise<void>;
  handleGenerateHeadshot: (
    userId: string,
    onSuccess: () => Promise<void>
  ) => Promise<void>;

  // Body shot
  bodyShotGeneration: ReturnType<typeof useImageGeneration>;
  handleUploadBodyPhoto: (
    hasActiveHeadshot: boolean
  ) => Promise<void>;
  handleGenerateBodyShot: (
    userId: string,
    activeHeadshotId: string,
    onSuccess: () => Promise<void>
  ) => Promise<void>;

  // Loading
  isLoading: boolean;
  loadingMessage: string;
}

export function useProfileImageGeneration(): UseProfileImageGenerationReturn {
  // Form state
  const [headshotHairStyle, setHeadshotHairStyle] = useState('');
  const [headshotMakeupStyle, setHeadshotMakeupStyle] = useState('');

  // Image generation hooks
  const headshotGeneration = useImageGeneration();
  const bodyShotGeneration = useImageGeneration();

  const handleUploadSelfie = useCallback(async () => {
    await headshotGeneration.pickImage(false);
  }, [headshotGeneration]);

  const handleGenerateHeadshot = useCallback(
    async (userId: string, onSuccess: () => Promise<void>) => {
      if (!headshotGeneration.uploadedBlob) {
        Alert.alert('Error', 'Please upload a photo first');
        return;
      }

      const imageId = await headshotGeneration.generateHeadshot(
        userId,
        headshotHairStyle || undefined,
        headshotMakeupStyle || undefined
      );

      if (imageId) {
        Alert.alert('Success', 'Headshot generated successfully!');
        setHeadshotHairStyle('');
        setHeadshotMakeupStyle('');
        headshotGeneration.clearImage();
        await onSuccess();
      }
    },
    [headshotGeneration, headshotHairStyle, headshotMakeupStyle]
  );

  const handleUploadBodyPhoto = useCallback(
    async (hasActiveHeadshot: boolean) => {
      if (!hasActiveHeadshot) {
        Alert.alert(
          'Headshot Required',
          'Please generate your professional headshot first before uploading a body photo.'
        );
        return;
      }

      await bodyShotGeneration.pickImage(false);
    },
    [bodyShotGeneration]
  );

  const handleGenerateBodyShot = useCallback(
    async (
      userId: string,
      activeHeadshotId: string,
      onSuccess: () => Promise<void>
    ) => {
      if (!bodyShotGeneration.uploadedBlob) {
        Alert.alert('Error', 'Please upload a body photo first');
        return;
      }

      const imageId = await bodyShotGeneration.generateBodyShot(
        userId,
        activeHeadshotId
      );

      if (imageId) {
        Alert.alert('Success', 'Studio model generated successfully!');
        bodyShotGeneration.clearImage();
        await onSuccess();
      }
    },
    [bodyShotGeneration]
  );

  const isLoading =
    headshotGeneration.generating || bodyShotGeneration.generating;
  const loadingMessage =
    headshotGeneration.loadingMessage || bodyShotGeneration.loadingMessage;

  return {
    // Headshot
    headshotHairStyle,
    headshotMakeupStyle,
    setHeadshotHairStyle,
    setHeadshotMakeupStyle,
    headshotGeneration,
    handleUploadSelfie,
    handleGenerateHeadshot,

    // Body shot
    bodyShotGeneration,
    handleUploadBodyPhoto,
    handleGenerateBodyShot,

    // Loading
    isLoading,
    loadingMessage,
  };
}
