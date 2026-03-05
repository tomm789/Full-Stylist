/**
 * Onboarding Screen (Refactored)
 * Multi-step onboarding flow for new users
 */

import React, { useState } from 'react';
import {
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/profile';
import {
  OnboardingAccountStep,
  OnboardingHeadshotStep,
  OnboardingBodyShotStep,
} from '@/components/profile';
import { useImageGeneration } from '@/hooks/profile';
import { supabase } from '@/lib/supabase';
import { updateUserSettings } from '@/lib/settings';
import ErrorModal from '@/components/shared/modals/ErrorModal';
import PolicyBlockModal from '@/components/shared/modals/PolicyBlockModal';
import { LoadingOverlay } from '@/components/shared';

export default function OnboardingScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Onboarding state
  const {
    currentStep,
    handle,
    displayName,
    accountPrivacy,
    searchVisibility,
    loading,
    setHandle,
    setDisplayName,
    setAccountPrivacy,
    setSearchVisibility,
    completeAccount,
    goToStep,
  } = useOnboarding({ userId: user?.id });

  const [selfieImageId, setSelfieImageId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Image upload/generation hooks
  const selfieUpload = useImageGeneration();
  const mirrorUpload = useImageGeneration();

  const handleSelfieAccept = async () => {
    if (!user) return;

    const saveResult = await selfieUpload.saveUploadedImage(user.id, 'selfie');
    const imageId = saveResult.imageId;
    if (!imageId) {
      setLocalError(
        saveResult.errorMessage || 'Failed to save your selfie. Please try again.'
      );
      return;
    }

    const { error } = await updateUserSettings(user.id, {
      selfie_image_id: imageId,
    });

    if (error) {
      setLocalError(error.message || 'Failed to save your selfie. Please try again.');
      return;
    }

    setSelfieImageId(imageId);
    selfieUpload.clearImage();
    goToStep('mirror');
  };

  const handleSelfieSkip = () => {
    Alert.alert(
      'Skip Selfie?',
      'You can add this later from your profile, but you won\'t be able to generate a studio model for outfit rendering.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            setTimeout(() => {
              router.replace('/(tabs)/wardrobe');
            }, 100);
          },
        },
      ]
    );
  };

  const handleBodyShotComplete = () => {
    router.replace('/(tabs)/wardrobe');
  };

  const handleMirrorAccept = async () => {
    if (!user) return;

    const saveResult = await mirrorUpload.saveUploadedImage(
      user.id,
      'mirror-selfie'
    );
    const imageId = saveResult.imageId;
    if (!imageId) {
      setLocalError(
        saveResult.errorMessage ||
          'Failed to save your mirror selfie. Please try again.'
      );
      return;
    }

    const { error } = await updateUserSettings(user.id, {
      mirror_selfie_image_id: imageId,
    });

    if (error) {
      setLocalError(error.message || 'Failed to save your mirror selfie. Please try again.');
      return;
    }

    let finalSelfieId = selfieImageId;
    if (!finalSelfieId) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('selfie_image_id')
        .eq('user_id', user.id)
        .single();
      finalSelfieId = settings?.selfie_image_id || null;
    }

    if (!finalSelfieId) {
      setLocalError('A selfie is required to generate your studio model.');
      return;
    }

    const generationResult = await mirrorUpload.generateBodyShotFromSelfies(
      user.id,
      finalSelfieId,
      imageId
    );
    const generatedBodyId = generationResult.imageId;
    if (generatedBodyId) {
      handleBodyShotComplete();
    } else {
      setLocalError(
        generationResult.policyMessage ||
          generationResult.errorMessage ||
          mirrorUpload.policyMessage ||
          mirrorUpload.error ||
          'Failed to generate your studio model. Please try again.'
      );
    }
  };

  const handleBodyShotSkip = () => {
    Alert.alert(
      'Skip Mirror Selfie?',
      'You can add this later from your profile. Without a studio model, you won\'t be able to render outfits on yourself.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            setTimeout(() => {
              router.replace('/(tabs)/wardrobe');
            }, 100);
          },
        },
      ]
    );
  };

  const isLoading =
    selfieUpload.generating || mirrorUpload.generating;
  const loadingMessage =
    selfieUpload.loadingMessage || mirrorUpload.loadingMessage;
  const loadingTitle = loadingMessage?.toLowerCase().includes('studio model')
    ? 'Generating Studio Model'
    : 'Processing Photo';
  const errorMessage = localError || selfieUpload.error || mirrorUpload.error;
  const closeError = () => {
    setLocalError(null);
    selfieUpload.clearError();
    mirrorUpload.clearError();
  };

  return (
    <>
      {currentStep === 'account' && (
        <OnboardingAccountStep
          handle={handle}
          displayName={displayName}
          accountPrivacy={accountPrivacy}
          searchVisibility={searchVisibility}
          loading={loading}
          onHandleChange={setHandle}
          onDisplayNameChange={setDisplayName}
          onAccountPrivacyChange={setAccountPrivacy}
          onSearchVisibilityChange={setSearchVisibility}
          onComplete={completeAccount}
        />
      )}

      {currentStep === 'selfie' && (
        <OnboardingHeadshotStep
          onSkip={handleSelfieSkip}
          processing={selfieUpload.generating}
          uploadedUri={selfieUpload.uploadedUri}
          onPickCamera={() => selfieUpload.pickHeadshotCameraImage()}
          onPickLibrary={() => selfieUpload.pickImage(false)}
          onUndo={selfieUpload.clearImage}
          onAccept={handleSelfieAccept}
        />
      )}

      {currentStep === 'mirror' && (
        <OnboardingBodyShotStep
          onSkip={handleBodyShotSkip}
          processing={mirrorUpload.generating}
          uploadedUri={mirrorUpload.uploadedUri}
          onPickCamera={() => mirrorUpload.pickBodyShotCameraImage()}
          onPickLibrary={() => mirrorUpload.pickHeadshotLibraryImage()}
          onUndo={mirrorUpload.clearImage}
          onAccept={handleMirrorAccept}
        />
      )}

      <LoadingOverlay
        visible={isLoading}
        title={loadingTitle}
        message={loadingMessage}
      />

      <ErrorModal
        visible={Boolean(errorMessage)}
        title="Something Went Wrong"
        message={errorMessage || undefined}
        onClose={closeError}
      />

      <PolicyBlockModal
        visible={mirrorUpload.policyModalVisible}
        message={mirrorUpload.policyMessage}
        onClose={mirrorUpload.closePolicyModal}
      />
    </>
  );
}

