/**
 * useApplyLook Hook
 * Navigate to Hair & Make-Up screen with another user's look pre-populated.
 * The input snapshot is stored in a module-level variable to survive navigation.
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/** Module-level store: survives navigation, cleared after reading. */
let pendingApplyLookSnapshot: any = null;

export function getPendingApplyLookSnapshot(): any {
  const snapshot = pendingApplyLookSnapshot;
  pendingApplyLookSnapshot = null;
  return snapshot;
}

export function useApplyLook() {
  const router = useRouter();

  const applyLook = useCallback(
    (variationId: string, inputSnapshotJson: any) => {
      pendingApplyLookSnapshot = inputSnapshotJson;
      router.push(`/hair-and-make-up?variationId=${variationId}` as any);
    },
    [router]
  );

  return { applyLook };
}
