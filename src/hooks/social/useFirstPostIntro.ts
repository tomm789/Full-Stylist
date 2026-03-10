/**
 * useFirstPostIntro Hook
 * Manages the first-time visibility intro modal for each entity type.
 * Shows the modal when a first post is created, saves the user's preferences.
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import {
  updatePostVisibility,
  resolveVisibility,
  type EntityType,
  type Visibility,
} from '@/lib/posts';

type VisibilityIntroKey =
  | 'has_seen_visibility_intro_outfit'
  | 'has_seen_visibility_intro_lookbook'
  | 'has_seen_visibility_intro_headshot'
  | 'has_seen_visibility_intro_wardrobe';

type VisibilityDefaultKey =
  | 'default_visibility_outfit'
  | 'default_visibility_lookbook'
  | 'default_visibility_headshot'
  | 'default_visibility_wardrobe';

const INTRO_KEY_MAP: Record<EntityType, VisibilityIntroKey> = {
  outfit: 'has_seen_visibility_intro_outfit',
  lookbook: 'has_seen_visibility_intro_lookbook',
  headshot: 'has_seen_visibility_intro_headshot',
  wardrobe: 'has_seen_visibility_intro_wardrobe',
};

const DEFAULT_KEY_MAP: Record<EntityType, VisibilityDefaultKey> = {
  outfit: 'default_visibility_outfit',
  lookbook: 'default_visibility_lookbook',
  headshot: 'default_visibility_headshot',
  wardrobe: 'default_visibility_wardrobe',
};

interface UseFirstPostIntroReturn {
  /** Whether the intro modal should be shown */
  showIntro: boolean;
  /** The resolved visibility for the current post */
  currentVisibility: Exclude<Visibility, 'inherit'>;
  /** The resolved default visibility for this entity type */
  defaultVisibility: Exclude<Visibility, 'inherit'>;
  /** Call after a save flow returns isFirstPost: true. Checks the flag and shows modal if needed. */
  triggerIntroIfNeeded: (entityType: EntityType, postId: string) => Promise<void>;
  /** Called when user dismisses the modal with their choices */
  handleIntroDone: (
    postVisibility: Exclude<Visibility, 'inherit'>,
    newDefault: Exclude<Visibility, 'inherit'>
  ) => Promise<void>;
  /** The entity type currently being introduced */
  introEntityType: EntityType | null;
}

export function useFirstPostIntro(): UseFirstPostIntroReturn {
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [introEntityType, setIntroEntityType] = useState<EntityType | null>(null);
  const [currentVisibility, setCurrentVisibility] = useState<Exclude<Visibility, 'inherit'>>('followers');
  const [defaultVisibility, setDefaultVisibility] = useState<Exclude<Visibility, 'inherit'>>('followers');
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  const triggerInProgressRef = useRef(false);

  const triggerIntroIfNeeded = useCallback(
    async (entityType: EntityType, postId: string) => {
      if (!user?.id || triggerInProgressRef.current) return;
      triggerInProgressRef.current = true;
      try {

      const { data: settings } = await getUserSettings(user.id);
      if (!settings) return;

      const introKey = INTRO_KEY_MAP[entityType];
      if (settings[introKey]) return; // Already seen

      // Resolve current defaults
      const resolved = resolveVisibility(undefined, settings, entityType) as Exclude<Visibility, 'inherit'>;
      const typeDefault = (settings[DEFAULT_KEY_MAP[entityType]] || resolved) as Exclude<Visibility, 'inherit'>;
      const effectiveDefault = (typeDefault as string) === 'inherit' ? resolved : typeDefault;

      setIntroEntityType(entityType);
      setCurrentVisibility(resolved);
      setDefaultVisibility(effectiveDefault);
      setPendingPostId(postId);
      setShowIntro(true);
      } finally {
        triggerInProgressRef.current = false;
      }
    },
    [user?.id]
  );

  const handleIntroDone = useCallback(
    async (
      postVisibility: Exclude<Visibility, 'inherit'>,
      newDefault: Exclude<Visibility, 'inherit'>
    ) => {
      setShowIntro(false);

      if (!user?.id || !introEntityType) return;

      const introKey = INTRO_KEY_MAP[introEntityType];
      const defaultKey = DEFAULT_KEY_MAP[introEntityType];

      // Update settings: mark intro as seen + save new default
      await updateUserSettings(user.id, {
        [introKey]: true,
        [defaultKey]: newDefault,
      });

      // Update this post's visibility if user changed it
      if (pendingPostId && postVisibility !== currentVisibility) {
        await updatePostVisibility(pendingPostId, user.id, postVisibility);
      }

      setIntroEntityType(null);
      setPendingPostId(null);
    },
    [user?.id, introEntityType, pendingPostId, currentVisibility]
  );

  return {
    showIntro,
    currentVisibility,
    defaultVisibility,
    triggerIntroIfNeeded,
    handleIntroDone,
    introEntityType,
  };
}
