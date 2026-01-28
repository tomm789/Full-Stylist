/**
 * useOnboarding Hook
 * Manage onboarding flow state and navigation
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { initializeUserProfile } from '@/lib/user';

type OnboardingStep = 'account' | 'headshot' | 'bodyshot';

interface UseOnboardingProps {
  userId: string | undefined;
}

interface UseOnboardingReturn {
  currentStep: OnboardingStep;
  handle: string;
  displayName: string;
  accountPrivacy: 'public' | 'private';
  searchVisibility: 'visible' | 'hidden';
  loading: boolean;
  setHandle: (handle: string) => void;
  setDisplayName: (displayName: string) => void;
  setAccountPrivacy: (privacy: 'public' | 'private') => void;
  setSearchVisibility: (visibility: 'visible' | 'hidden') => void;
  completeAccount: () => Promise<void>;
  goToStep: (step: OnboardingStep) => void;
}

export function useOnboarding({
  userId,
}: UseOnboardingProps): UseOnboardingReturn {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('account');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountPrivacy, setAccountPrivacy] = useState<'public' | 'private'>('public');
  const [searchVisibility, setSearchVisibility] = useState<'visible' | 'hidden'>('visible');
  const [loading, setLoading] = useState(false);

  const validateHandle = (h: string): boolean => {
    const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return handleRegex.test(h);
  };

  const completeAccount = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be signed in to complete onboarding');
      return;
    }

    if (!handle.trim()) {
      Alert.alert('Error', 'Please enter a handle');
      return;
    }

    if (!validateHandle(handle.trim())) {
      Alert.alert(
        'Invalid Handle',
        'Handle must be 3-20 characters and contain only letters, numbers, and underscores'
      );
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setLoading(true);

    try {
      const { error } = await initializeUserProfile(
        userId,
        handle.trim(),
        displayName.trim(),
        {
          account_privacy: accountPrivacy,
          search_visibility: searchVisibility,
          default_visibility: 'followers',
          allow_external_sharing: true,
        }
      );

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'This handle is already taken. Please choose another.');
        } else {
          Alert.alert('Error', error.message || 'Failed to create profile');
        }
      } else {
        setCurrentStep('headshot');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step);
  };

  return {
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
  };
}
