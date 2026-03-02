/**
 * useItemRevealAnimation
 * Shared hook that drives the 500ms-per-item reveal animation shown inside
 * GenerationProgressModal while outfit items are being "checked" before AI
 * generation starts. Manages its own count state and transitions the caller's
 * phase to 'analysis' after the last item is revealed.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

type GenerationPhase = 'items' | 'analysis' | 'finalizing';

interface RevealItem {
  id: string;
  title: string;
  orderIndex: number;
}

interface UseItemRevealAnimationOptions {
  /** Called to update the generation phase in the parent hook/screen. */
  setPhase: (phase: GenerationPhase) => void;
}

export function useItemRevealAnimation({ setPhase }: UseItemRevealAnimationOptions) {
  const [revealedItemsCount, setRevealedItemsCount] = useState(-1);
  const [completedItemsCount, setCompletedItemsCount] = useState(-1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setRevealedItemsCount(-1);
    setCompletedItemsCount(-1);
  }, [stop]);

  const start = useCallback(
    (items: RevealItem[]) => {
      stop();
      setRevealedItemsCount(-1);
      setCompletedItemsCount(-1);
      setPhase('items');

      let currentRevealed = -1;
      let currentCompleted = -1;

      intervalRef.current = setInterval(() => {
        if (currentRevealed < items.length - 1) {
          currentRevealed++;
          setRevealedItemsCount(currentRevealed);

          if (currentRevealed > 0) {
            currentCompleted = currentRevealed - 1;
            setCompletedItemsCount(currentCompleted);
          }
        } else {
          currentCompleted = items.length - 1;
          setCompletedItemsCount(currentCompleted);

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          phaseTimeoutRef.current = setTimeout(() => {
            phaseTimeoutRef.current = null;
            setPhase('analysis');
          }, 500);
        }
      }, 500);
    },
    [setPhase, stop]
  );

  return { revealedItemsCount, completedItemsCount, start, stop, reset };
}
