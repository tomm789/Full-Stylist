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
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
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

  // Headshot state
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');
  const [headshotImageId, setHeadshotImageId] = useState<string | null>(null);

  // Image generation hooks
  const headshotGeneration = useImageGeneration();
  const bodyShotGeneration = useImageGeneration();

  const handleHeadshotComplete = async () => {
    if (!user) return;

    // Get headshot ID from user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('headshot_image_id')
      .eq('user_id', user.id)
      .single();

    if (settings?.headshot_image_id) {
      setHeadshotImageId(settings.headshot_image_id);
    }

    goToStep('bodyshot');
  };

  const handleHeadshotSkip = () => {
    Alert.alert(
      'Skip Headshot?',
      'You can add your headshot later from your profile. Without it, you won\'t be able to create a studio model for outfit rendering.',
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

  const handleBodyShotSkip = () => {
    Alert.alert(
      'Skip Studio Model?',
      'You can add your studio model later from your profile. Without it, you won\'t be able to render outfits on yourself.',
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
    headshotGeneration.generating || bodyShotGeneration.generating;
  const loadingMessage =
    headshotGeneration.loadingMessage || bodyShotGeneration.loadingMessage;

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

      {currentStep === 'headshot' && (
        <OnboardingHeadshotStep
          onComplete={handleHeadshotComplete}
          onSkip={handleHeadshotSkip}
          generating={headshotGeneration.generating}
          loadingMessage={headshotGeneration.loadingMessage}
          uploadedUri={headshotGeneration.uploadedUri}
          hairStyle={hairStyle}
          makeupStyle={makeupStyle}
          onPickImage={() => headshotGeneration.pickImage(false)}
          onGenerate={async () => {
            if (!user) return;
            const imageId = await headshotGeneration.generateHeadshot(
              user.id,
              hairStyle || undefined,
              makeupStyle || undefined
            );
            if (imageId) {
              handleHeadshotComplete();
            }
          }}
          onHairStyleChange={setHairStyle}
          onMakeupStyleChange={setMakeupStyle}
        />
      )}

      {currentStep === 'bodyshot' && (
        <OnboardingBodyShotStep
          onComplete={handleBodyShotComplete}
          onSkip={handleBodyShotSkip}
          generating={bodyShotGeneration.generating}
          loadingMessage={bodyShotGeneration.loadingMessage}
          uploadedUri={bodyShotGeneration.uploadedUri}
          onPickImage={() => bodyShotGeneration.pickImage(false)}
          onGenerate={async () => {
            if (!user) return;

            let finalHeadshotId = headshotImageId;
            if (!finalHeadshotId) {
              const { data: settings } = await supabase
                .from('user_settings')
                .select('headshot_image_id')
                .eq('user_id', user.id)
                .single();

              if (!settings?.headshot_image_id) {
                Alert.alert('Error', 'Headshot is required to generate studio model');
                return;
              }
              finalHeadshotId = settings.headshot_image_id;
            }

            const imageId = await bodyShotGeneration.generateBodyShot(
              user.id,
              finalHeadshotId
            );
            if (imageId) {
              handleBodyShotComplete();
            }
          }}
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
              {headshotGeneration.generating
                ? 'Generating Headshot'
                : 'Generating Studio Model'}
            </Text>
            {loadingMessage && (
              <Text style={styles.loadingMessage}>{loadingMessage}</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
