/**
 * useActiveHeadshotActions
 * Handles setting a headshot as active and syncing the associated body shot.
 * Preserves the void (async () => { ... })() fire-and-forget pattern for body shot sync
 * so the UI responds immediately to the active headshot confirmation.
 */

import { showSuccessToast, showErrorToast } from '@/utils/toast';
import { useCallback } from 'react';
import { setActiveHeadshot } from '@/lib/headshot/generation';
import { waitForAIJobCompletion, syncBodyshotAfterActiveHeadshotSet } from '@/lib/ai-jobs';

export type UseActiveHeadshotActionsParams = {
  userId: string | null;
  previewImageId: string | null;
};

export function useActiveHeadshotActions({
  userId,
  previewImageId,
}: UseActiveHeadshotActionsParams) {
  const handleSetAsActiveHeadshot = useCallback(async () => {
    if (!userId || !previewImageId) return;
    try {
      const { error } = await setActiveHeadshot(userId, previewImageId);
      if (error) throw error;
      showSuccessToast('Headshot set as active');

      // Fire-and-forget bodyshot sync so the user is not blocked waiting for it.
      void (async () => {
        try {
          const syncResult = await syncBodyshotAfterActiveHeadshotSet(userId, previewImageId);
          if (syncResult.status === 'error') {
                        if (__DEV__) console.warn('Bodyshot sync failed after active headshot update:', syncResult.message);
            showErrorToast('Headshot is active, but we could not sync your body shot.');
            return;
          }
          if (syncResult.status === 'generation_started' && syncResult.jobId) {
            const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
              syncResult.jobId,
              60,
              2000,
              '[BodyShotSync]'
            );
            if (pollError || !completedJob || completedJob.status === 'failed') {
                            if (__DEV__) console.warn('Bodyshot generation failed after active headshot update', {
                jobId: syncResult.jobId,
                pollError,
                status: completedJob?.status,
                error: completedJob?.error,
              });
              showErrorToast('Headshot is active, but generating a matching body shot failed.');
            }
          }
        } catch (syncError: any) {
                    if (__DEV__) console.warn('Unexpected bodyshot sync error after active headshot update:', syncError);
          showErrorToast('Headshot is active, but we could not sync your body shot.');
        }
      })();
    } catch (err) {
      console.error('Failed to set active headshot:', err);
      showErrorToast('Could not set headshot as active');
    }
  }, [userId, previewImageId]);

  return { handleSetAsActiveHeadshot };
}
