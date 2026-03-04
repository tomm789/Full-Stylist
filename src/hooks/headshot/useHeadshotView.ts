/**
 * useHeadshotView
 * Data loading and actions for the Headshot View page.
 *
 * Navigation between headshots is LOCAL-STATE-DRIVEN: the URL param `id` is
 * used only for the initial load. Swipes and thumbnail taps update
 * `currentHeadshotId` without calling router.replace, so the page never
 * remounts and the edit page never flashes during transitions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Share, Platform } from 'react-native';
import { showErrorToast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/contexts/AuthContext';
import { resolveImageUrls } from '@/lib/outfits/sessions';
import { deleteImage } from '@/lib/utils/image-helpers';
import { getVariationByImageId } from '@/lib/headshot/generation';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import { useActiveHeadshotActions } from './useActiveHeadshotActions';

interface UseHeadshotViewParams {
  headshotId: string | undefined;
  headshotIds: string | undefined;
}

export function useHeadshotView({ headshotId, headshotIds }: UseHeadshotViewParams) {
  const router = useRouter();
  const { user } = useAuth();

  // ── Local current-headshot state (source of truth after initial load) ───────
  const [currentHeadshotId, setCurrentHeadshotId] = useState<string | null>(
    headshotId ?? null,
  );

  // Sync from URL param on first load (handles async param arrival)
  useEffect(() => {
    if (headshotId && currentHeadshotId === null) {
      setCurrentHeadshotId(headshotId);
    }
  }, [headshotId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation items ───────────────────────────────────────────────────────
  const [navigationItems, setNavigationItems] = useState<
    Array<{ id: string; title: string; imageUrl: string | null }>
  >([]);

  // Flat list of {id, url} for EdgePeekSlider
  const headshots = useMemo(
    () => navigationItems.map((item) => ({ id: item.id, url: item.imageUrl })),
    [navigationItems],
  );

  // Current index derived from local state
  const currentIndex = useMemo(() => {
    if (!currentHeadshotId || headshots.length === 0) return 0;
    const idx = headshots.findIndex((h) => h.id === currentHeadshotId);
    return idx >= 0 ? idx : 0;
  }, [currentHeadshotId, headshots]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── Variation data for HeadshotPromptSettings ──────────────────────────────
  const [activeVariation, setActiveVariation] = useState<HeadshotGenerationVariation | null>(null);

  useEffect(() => {
    if (!currentHeadshotId) {
      setActiveVariation(null);
      return;
    }
    getVariationByImageId(currentHeadshotId).then((v) => setActiveVariation(v));
  }, [currentHeadshotId]);

  // ── Active headshot action ─────────────────────────────────────────────────
  const { handleSetAsActiveHeadshot } = useActiveHeadshotActions({
    userId: user?.id ?? null,
    previewImageId: currentHeadshotId,
  });

  // ── Load headshot image URLs from the headshotIds param ────────────────────
  const loadHeadshotData = useCallback(async () => {
    if (!headshotIds) return;

    try {
      const idsArray = headshotIds.split(',').filter(Boolean);
      if (idsArray.length === 0) return;

      const urlMap = await resolveImageUrls(idsArray);

      const navItems = idsArray
        .map((id) => ({
          id,
          title: '',
          imageUrl: urlMap.get(id) ?? null,
        }))
        .filter((item) => item.imageUrl !== null);

      setNavigationItems(navItems);
    } catch (error) {
      console.error('Error loading headshot navigation data:', error);
    }
  }, [headshotIds]);

  useEffect(() => {
    loadHeadshotData();
  }, [loadHeadshotData]);

  // ── Navigation handlers (local state only — no router.replace) ─────────────

  // Called by NavigationSlider thumbnail tap
  const navigateToHeadshot = useCallback(
    (targetId: string) => setCurrentHeadshotId(targetId),
    [],
  );

  // Called by EdgePeekSlider after swipe momentum ends
  const handleSliderIndexChange = useCallback(
    (nextIndex: number) => {
      const next = headshots[nextIndex];
      if (next) setCurrentHeadshotId(next.id);
    },
    [headshots],
  );

  // ── Page-level navigation (these DO use the router) ────────────────────────

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/hair-and-make-up' as any);
    }
  }, [router]);

  const handleOpenInMirror = useCallback(() => {
    if (!currentHeadshotId) return;
    router.push(`/hair-and-make-up?baseHeadshotId=${currentHeadshotId}` as any);
  }, [currentHeadshotId, router]);

  const handleEdit = useCallback(() => {
    if (!currentHeadshotId) return;
    router.push(`/headshot/${currentHeadshotId}` as any);
  }, [currentHeadshotId, router]);

  // ── Image actions ──────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    const current = headshots.find((h) => h.id === currentHeadshotId);
    if (!current?.url) return;

    let localUri: string | null = null;
    try {
      if (Platform.OS === 'web') {
        await Share.share({ url: current.url });
        return;
      }
      const extension = current.url.split('.').pop()?.split('?')[0] || 'jpg';
      const targetDir = FileSystem.cacheDirectory;
      if (!targetDir) return;
      const targetUri = `${targetDir}headshot-share-${Date.now()}.${extension}`;
      const download = await FileSystem.downloadAsync(current.url, targetUri);
      localUri = download?.uri ?? null;
      if (localUri) {
        await Share.share({ url: localUri });
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Share error:', error);
      }
    } finally {
      if (localUri && localUri.startsWith('file://')) {
        await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      }
    }
  }, [headshots, currentHeadshotId]);

  const handleDelete = useCallback(() => {
    if (!user?.id || !currentHeadshotId) return;

    Alert.alert('Delete image?', 'This will permanently delete the image.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteImage(currentHeadshotId, user.id);
          if (error) {
            showErrorToast(error.message || 'Failed to delete image.');
            return;
          }

          // Remove from local navigation items
          setNavigationItems((prev) =>
            prev.filter((item) => item.id !== currentHeadshotId),
          );

          // Advance to next sibling or go back
          const remaining = headshots.filter((h) => h.id !== currentHeadshotId);
          if (remaining.length > 0) {
            const idx = headshots.findIndex((h) => h.id === currentHeadshotId);
            const nextId = remaining[Math.min(idx, remaining.length - 1)].id;
            setCurrentHeadshotId(nextId);
          } else {
            handleBackPress();
          }
        },
      },
    ]);
  }, [user?.id, currentHeadshotId, headshots, handleBackPress]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const canShare = useMemo(() => {
    const current = headshots.find((h) => h.id === currentHeadshotId);
    return !!current?.url;
  }, [headshots, currentHeadshotId]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // Data
    headshots,
    navigationItems,
    currentIndex,
    currentHeadshotId,
    canShare,
    activeVariation,

    // UI state
    showMenu,
    setShowMenu,
    lightboxVisible,
    setLightboxVisible,
    lightboxUrl,
    setLightboxUrl,

    // Handlers
    navigateToHeadshot,
    handleSliderIndexChange,
    handleBackPress,
    handleOpenInMirror,
    handleEdit,
    handleSetAsActiveHeadshot,
    handleShare,
    handleDelete,
  };
}
