/**
 * useHeadshotImageActions
 * File I/O and sharing actions for the Hair & Make-Up screen.
 * Owns: handleDeletePreviewImage, handleSharePreview.
 */

import { Alert, Platform, Share } from 'react-native';
import { showErrorToast } from '@/utils/toast';
import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { deleteImage } from '@/lib/images/helpers';
import { updateHeadshotGenerationVariation } from '@/lib/headshot/generation';

export type UseHeadshotImageActionsParams = {
  userId: string | null;
  previewImageId: string | null;
  previewVariationId: string | null;
  previewImageUrl: string | null;
  canShare: boolean;
  selfieImageId: string | null;
  selfieImageUrl: string | null;
  sessionId: string | null;
  loadVariations: (sessionId: string) => Promise<void>;
  refreshImages: () => Promise<void>;
  setPreviewVariationId: (id: string | null) => void;
  setPreviewImageId: (id: string | null) => void;
  setPreviewImageUrl: (url: string | null) => void;
  setPreviewSource: (source: 'none' | 'selfie' | 'headshot' | 'variation' | 'upload') => void;
  setHiddenVariationIds: React.Dispatch<React.SetStateAction<string[]>>;
  setVariationUrls: React.Dispatch<React.SetStateAction<Map<string, string>>>;
};

export function useHeadshotImageActions({
  userId,
  previewImageId,
  previewVariationId,
  previewImageUrl,
  canShare,
  selfieImageId,
  selfieImageUrl,
  sessionId,
  loadVariations,
  refreshImages,
  setPreviewVariationId,
  setPreviewImageId,
  setPreviewImageUrl,
  setPreviewSource,
  setHiddenVariationIds,
  setVariationUrls,
}: UseHeadshotImageActionsParams) {
  const getShareableUri = useCallback(async (remoteUrl: string): Promise<string> => {
    if (Platform.OS === 'web') return remoteUrl;
    if (remoteUrl.startsWith('file://')) return remoteUrl;
    const extension = remoteUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const targetDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!targetDirectory) return remoteUrl;
    const targetUri = `${targetDirectory}hair-makeup-share-${Date.now()}.${extension}`;
    const download = await FileSystem.downloadAsync(remoteUrl, targetUri);
    return download?.uri || remoteUrl;
  }, []);

  const handleSharePreview = useCallback(async () => {
    if (!canShare || !previewImageUrl) return;
    let shareUri: string | null = null;
    let shouldCleanup = false;
    try {
      shareUri = await getShareableUri(previewImageUrl);
      shouldCleanup =
        Platform.OS !== 'web' &&
        shareUri.startsWith('file://') &&
        shareUri !== previewImageUrl;
      await Share.share({ url: shareUri, message: shareUri });
    } catch (shareError) {
      console.error('Share error:', shareError);
    } finally {
      if (shouldCleanup && shareUri) {
        try {
          await FileSystem.deleteAsync(shareUri, { idempotent: true });
        } catch (cleanupError) {
          if (__DEV__) {
            console.warn('Failed to clean up shared temp file:', cleanupError);
          }
        }
      }
    }
  }, [canShare, previewImageUrl, getShareableUri]);

  const handleDeletePreviewImage = useCallback(() => {
    if (!userId || !previewImageId) return;
    Alert.alert(
      'Delete image?',
      'This will permanently delete the image.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const imageId = previewImageId;
            const variationId = previewVariationId;
            const { error: deleteError } = await deleteImage(imageId, userId);
            if (deleteError) {
              showErrorToast(deleteError.message || 'Failed to delete image.');
              return;
            }
            if (variationId) {
              await updateHeadshotGenerationVariation(variationId, {
                image_id: null,
                is_saved: false,
              });
              setHiddenVariationIds((prev) =>
                prev.includes(variationId) ? prev : [...prev, variationId]
              );
            }
            setVariationUrls((prev) => {
              const next = new Map(prev);
              next.delete(imageId);
              return next;
            });
            setPreviewVariationId(null);
            setPreviewImageId(selfieImageId);
            setPreviewImageUrl(selfieImageUrl);
            setPreviewSource(selfieImageId ? 'selfie' : 'none');
            if (sessionId) await loadVariations(sessionId);
            await refreshImages();
          },
        },
      ],
      { cancelable: true }
    );
  }, [
    userId,
    previewImageId,
    previewVariationId,
    selfieImageId,
    selfieImageUrl,
    sessionId,
    loadVariations,
    refreshImages,
    setPreviewVariationId,
    setPreviewImageId,
    setPreviewImageUrl,
    setPreviewSource,
    setHiddenVariationIds,
    setVariationUrls,
  ]);

  return { handleSharePreview, handleDeletePreviewImage };
}
