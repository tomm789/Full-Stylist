/**
 * Onboarding Screen (Refactored)
 * Multi-step onboarding flow for new users
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
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
import ErrorModal from '@/components/ErrorModal';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

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
          onPickCamera={() => selfieUpload.pickImage(true)}
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
          onPickCamera={() => mirrorUpload.pickImage(true)}
          onPickLibrary={() => mirrorUpload.pickImage(false)}
          onUndo={mirrorUpload.clearImage}
          onAccept={handleMirrorAccept}
        />
      )}

      {/* Loading Overlay */}
      <Modal
        visible={isLoading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>
              {loadingTitle}
            </Text>
            {loadingMessage && (
              <Text style={styles.loadingMessage}>{loadingMessage}</Text>
            )}
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  loadingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
  },
});
