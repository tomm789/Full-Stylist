/**
 * useWardrobeTutorial
 * Manages first-time tutorial visibility for the Wardrobe screen.
 * Checks AsyncStorage on mount (when wardrobe has finished loading with no items)
 * and exposes a dismissal handler that persists the flag.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccessToast } from '@/utils/toast';

export type UseWardrobeTutorialParams = {
  userId: string | undefined;
  hasLoaded: boolean;
  loading: boolean;
  wardrobeLoading: boolean;
  hasItems: boolean;
};

export function useWardrobeTutorial({
  userId,
  hasLoaded,
  loading,
  wardrobeLoading,
  hasItems,
}: UseWardrobeTutorialParams) {
  const [showFirstTimeTutorial, setShowFirstTimeTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [showOutfitTipOnClose, setShowOutfitTipOnClose] = useState(false);

  // Check whether the tutorial should be shown.
  useEffect(() => {
    let isMounted = true;
    const checkTutorial = async () => {
      if (!userId) return;
      if (!hasLoaded || loading || wardrobeLoading) return;
      if (hasItems) {
        if (isMounted) { setShowFirstTimeTutorial(false); setTutorialChecked(true); }
        return;
      }
      try {
        const key = `wardrobe_first_time_dismissed:${userId}`;
        const dismissed = await AsyncStorage.getItem(key);
        if (isMounted) { setShowFirstTimeTutorial(!dismissed); setTutorialChecked(true); }
      } catch (error) {
                if (__DEV__) console.warn('Failed to read wardrobe tutorial flag:', error);
        if (isMounted) { setShowFirstTimeTutorial(true); setTutorialChecked(true); }
      }
    };
    checkTutorial();
    return () => { isMounted = false; };
  }, [userId, hasLoaded, loading, wardrobeLoading, hasItems]);

  // Show outfit tip alert once the tutorial is dismissed.
  useEffect(() => {
    if (!showOutfitTipOnClose) return;
    if (showFirstTimeTutorial) return;
    showSuccessToast('Tip: Long hold an item to add it to your outfit.');
    setShowOutfitTipOnClose(false);
  }, [showOutfitTipOnClose, showFirstTimeTutorial]);

  const dismissFirstTimeTutorial = async () => {
    if (!userId) {
      setShowFirstTimeTutorial(false);
      setTutorialChecked(true);
      setShowOutfitTipOnClose(true);
      return;
    }
    const key = `wardrobe_first_time_dismissed:${userId}`;
    try {
      await AsyncStorage.setItem(key, 'true');
    } catch (error) {
            if (__DEV__) console.warn('Failed to persist wardrobe tutorial flag:', error);
    }
    setShowFirstTimeTutorial(false);
    setTutorialChecked(true);
    setShowOutfitTipOnClose(true);
  };

  return {
    showFirstTimeTutorial,
    tutorialChecked,
    dismissFirstTimeTutorial,
  };
}
