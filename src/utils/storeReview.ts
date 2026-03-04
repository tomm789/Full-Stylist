/**
 * Store Review
 * Tracks user milestones and prompts for App Store / Play Store review at the right moments.
 */

import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MILESTONE_KEY = '@store_review_milestones';
const LAST_PROMPT_KEY = '@store_review_last_prompt';
const MIN_DAYS_BETWEEN_PROMPTS = 30;

interface Milestones {
  outfitsGenerated: number;
  lookbooksCreated: number;
  shareCount: number;
  hasBeenPrompted: boolean;
}

const defaultMilestones: Milestones = {
  outfitsGenerated: 0,
  lookbooksCreated: 0,
  shareCount: 0,
  hasBeenPrompted: false,
};

async function getMilestones(): Promise<Milestones> {
  try {
    const raw = await AsyncStorage.getItem(MILESTONE_KEY);
    return raw ? { ...defaultMilestones, ...JSON.parse(raw) } : defaultMilestones;
  } catch {
    return defaultMilestones;
  }
}

async function saveMilestones(milestones: Milestones): Promise<void> {
  await AsyncStorage.setItem(MILESTONE_KEY, JSON.stringify(milestones));
}

async function canPrompt(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return false;

  const lastPrompt = await AsyncStorage.getItem(LAST_PROMPT_KEY);
  if (lastPrompt) {
    const daysSince = (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24);
    if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return false;
  }

  return true;
}

async function promptIfEligible(milestones: Milestones): Promise<void> {
  const eligible =
    milestones.outfitsGenerated >= 5 ||
    milestones.lookbooksCreated >= 1 ||
    milestones.shareCount >= 1;

  if (!eligible || milestones.hasBeenPrompted) return;
  if (!(await canPrompt())) return;

  try {
    await StoreReview.requestReview();
    milestones.hasBeenPrompted = true;
    await saveMilestones(milestones);
    await AsyncStorage.setItem(LAST_PROMPT_KEY, Date.now().toString());
  } catch {
    // Silently fail — store review is non-critical
  }
}

/** Call after an outfit is generated. */
export async function trackOutfitGenerated(): Promise<void> {
  const m = await getMilestones();
  m.outfitsGenerated += 1;
  await saveMilestones(m);
  await promptIfEligible(m);
}

/** Call after a lookbook is created. */
export async function trackLookbookCreated(): Promise<void> {
  const m = await getMilestones();
  m.lookbooksCreated += 1;
  await saveMilestones(m);
  await promptIfEligible(m);
}

/** Call after the user shares content. */
export async function trackShare(): Promise<void> {
  const m = await getMilestones();
  m.shareCount += 1;
  await saveMilestones(m);
  await promptIfEligible(m);
}
