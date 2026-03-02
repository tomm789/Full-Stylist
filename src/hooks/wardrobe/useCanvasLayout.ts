/**
 * useCanvasLayout
 * Manages outfit canvas layout, trim, and z-order state for the wardrobe creator.
 * Owns: outfitCanvasLayouts, outfitCanvasTrims, outfitCanvasTrimStatuses.
 * Handles: lifecycle effects that sync state when selectedOutfitItems changes,
 *          trim metadata fetching, and layout/z-order handlers.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchWardrobeItemImageKeys } from '@/lib/wardrobe/images';
import {
  getDefaultOutfitCanvasLayout,
  type OutfitCanvasItemLayout,
  type OutfitCanvasLayoutMap,
  type OutfitCanvasTrimMap,
  type OutfitCanvasTrimStatusMap,
} from '@/lib/outfits/canvasLayout';
import { fetchCanvasTrimMetadata } from '@/lib/outfits/canvasTrim';

export type UseCanvasLayoutParams = {
  userId: string | null | undefined;
  selectedOutfitItems: string[];
  isCreatorExpanded: boolean;
};

export function useCanvasLayout({
  userId,
  selectedOutfitItems,
  isCreatorExpanded,
}: UseCanvasLayoutParams) {
  const [outfitCanvasLayouts, setOutfitCanvasLayouts] = useState<OutfitCanvasLayoutMap>({});
  const [outfitCanvasTrims, setOutfitCanvasTrims] = useState<OutfitCanvasTrimMap>({});
  const [outfitCanvasTrimStatuses, setOutfitCanvasTrimStatuses] =
    useState<OutfitCanvasTrimStatusMap>({});
  const trimInFlightIdsRef = useRef<Set<string>>(new Set());
  // Mirror of outfitCanvasTrimStatuses read inside the fetch effect without causing a dep loop (O-13)
  const trimStatusesRef = useRef<OutfitCanvasTrimStatusMap>({});

  // ── Initialise default layouts when the creator expands ────────────────────

  useEffect(() => {
    if (!isCreatorExpanded || selectedOutfitItems.length === 0) return;
    setOutfitCanvasLayouts((prev) => {
      let changed = false;
      const next = { ...prev };
      selectedOutfitItems.forEach((itemId, index) => {
        if (next[itemId]) return;
        next[itemId] = getDefaultOutfitCanvasLayout(index, selectedOutfitItems.length);
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [isCreatorExpanded, selectedOutfitItems]);

  // ── Prune layout/trim state when items are removed from the selection ───────
  // O-09: merged into one effect (one Set construction, one render)
  // O-02: also clears trimInFlightIdsRef so re-added items can fetch again

  useEffect(() => {
    const selectedSet = new Set(selectedOutfitItems);

    // Clear in-flight guard for any deselected items (O-02)
    for (const id of trimInFlightIdsRef.current) {
      if (!selectedSet.has(id)) trimInFlightIdsRef.current.delete(id);
    }

    setOutfitCanvasLayouts((prev) => {
      let changed = false;
      const next: OutfitCanvasLayoutMap = {};
      for (const [itemId, layout] of Object.entries(prev)) {
        if (!selectedSet.has(itemId)) { changed = true; continue; }
        next[itemId] = layout;
      }
      return changed ? next : prev;
    });

    setOutfitCanvasTrims((prev) => {
      let changed = false;
      const next: OutfitCanvasTrimMap = {};
      for (const [itemId, trim] of Object.entries(prev)) {
        if (!selectedSet.has(itemId)) { changed = true; continue; }
        next[itemId] = trim;
      }
      return changed ? next : prev;
    });

    setOutfitCanvasTrimStatuses((prev) => {
      let changed = false;
      const next: OutfitCanvasTrimStatusMap = {};
      for (const [itemId, status] of Object.entries(prev)) {
        if (!selectedSet.has(itemId)) { changed = true; continue; }
        next[itemId] = status;
      }
      return changed ? next : prev;
    });
  }, [selectedOutfitItems]);

  // ── Mark items pending when creator expands ─────────────────────────────────

  useEffect(() => {
    if (!isCreatorExpanded || selectedOutfitItems.length === 0) return;
    setOutfitCanvasTrimStatuses((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const itemId of selectedOutfitItems) {
        if (outfitCanvasTrims[itemId]) continue;
        if (!next[itemId] || next[itemId] === 'idle') {
          next[itemId] = 'pending';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isCreatorExpanded, outfitCanvasTrims, selectedOutfitItems]);

  // ── Mark items success once trim data arrives ───────────────────────────────

  useEffect(() => {
    if (selectedOutfitItems.length === 0) return;
    setOutfitCanvasTrimStatuses((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const itemId of selectedOutfitItems) {
        if (!outfitCanvasTrims[itemId]) continue;
        if (next[itemId] === 'success') continue;
        next[itemId] = 'success';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [outfitCanvasTrims, selectedOutfitItems]);

  // Keep trimStatusesRef in sync so the fetch effect can read current statuses (O-13)
  useEffect(() => { trimStatusesRef.current = outfitCanvasTrimStatuses; }, [outfitCanvasTrimStatuses]);

  // ── Fetch canvas trim metadata ──────────────────────────────────────────────

  useEffect(() => {
    if (!isCreatorExpanded || !userId) return;
    if (selectedOutfitItems.length === 0) return;

    const requestIds = selectedOutfitItems.filter(
      (itemId) =>
        !outfitCanvasTrims[itemId] &&
        (!trimStatusesRef.current[itemId] ||
          trimStatusesRef.current[itemId] === 'idle' ||
          trimStatusesRef.current[itemId] === 'pending') &&
        !trimInFlightIdsRef.current.has(itemId)
    );
    if (requestIds.length === 0) return;

    requestIds.forEach((itemId) => trimInFlightIdsRef.current.add(itemId));
    setOutfitCanvasTrimStatuses((prev) => {
      const next = { ...prev };
      requestIds.forEach((itemId) => { next[itemId] = 'pending'; });
      return next;
    });

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      try {
        const { data: imageLinks, error } = await fetchWardrobeItemImageKeys(requestIds);

        if (error || !imageLinks) {
          setOutfitCanvasTrimStatuses((prev) => {
            const next = { ...prev };
            requestIds.forEach((itemId) => { next[itemId] = 'failed'; });
            return next;
          });
          return;
        }

        const linksByItem = new Map<string, any[]>();
        for (const link of imageLinks as any[]) {
          const itemId = link.wardrobe_item_id as string;
          if (!linksByItem.has(itemId)) linksByItem.set(itemId, []);
          linksByItem.get(itemId)!.push(link);
        }

        const trimItems: Array<{ itemId: string; storageKey: string }> = [];
        for (const itemId of requestIds) {
          const links = linksByItem.get(itemId) ?? [];
          if (!links.length) continue;
          links.sort((a, b) => {
            if (a.type === 'product_shot' && b.type !== 'product_shot') return -1;
            if (b.type === 'product_shot' && a.type !== 'product_shot') return 1;
            return (a.sort_order || 999) - (b.sort_order || 999);
          });
          const storageKey = links[0]?.images?.storage_key;
          if (!storageKey) continue;
          trimItems.push({ itemId, storageKey });
        }

        if (trimItems.length === 0) {
          setOutfitCanvasTrimStatuses((prev) => {
            const next = { ...prev };
            requestIds.forEach((itemId) => { next[itemId] = 'failed'; });
            return next;
          });
          return;
        }

        const trims = await fetchCanvasTrimMetadata(trimItems, {
          signal: controller.signal,
          timeoutMs: 12000,
        });
        if (cancelled) return;
        const resolvedTrims = trims ?? {};
        const successIds = new Set(Object.keys(resolvedTrims));
        if (successIds.size > 0) {
          setOutfitCanvasTrims((prev) => ({ ...prev, ...resolvedTrims }));
        }
        setOutfitCanvasTrimStatuses((prev) => {
          const next = { ...prev };
          requestIds.forEach((itemId) => {
            next[itemId] = successIds.has(itemId) ? 'success' : 'failed';
          });
          return next;
        });
      } catch (trimError) {
                if (__DEV__) console.warn('[Wardrobe] Failed to fetch canvas trim metadata', trimError);
        if (cancelled) return;
        setOutfitCanvasTrimStatuses((prev) => {
          const next = { ...prev };
          requestIds.forEach((itemId) => { next[itemId] = 'failed'; });
          return next;
        });
      } finally {
        requestIds.forEach((itemId) => trimInFlightIdsRef.current.delete(itemId));
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
      requestIds.forEach((itemId) => trimInFlightIdsRef.current.delete(itemId));
    };
  }, [isCreatorExpanded, outfitCanvasTrims, selectedOutfitItems, userId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCanvasLayoutChange = useCallback(
    (itemId: string, nextLayout: OutfitCanvasItemLayout) => {
      setOutfitCanvasLayouts((prev) => {
        const current = prev[itemId];
        if (
          current &&
          current.centerX === nextLayout.centerX &&
          current.centerY === nextLayout.centerY &&
          current.scale === nextLayout.scale &&
          current.zIndex === nextLayout.zIndex
        ) {
          return prev;
        }
        return { ...prev, [itemId]: nextLayout };
      });
    },
    []
  );

  const handleBringForward = useCallback(
    (itemId: string) => {
      setOutfitCanvasLayouts((prev) => {
        const index = selectedOutfitItems.findIndex((id) => id === itemId);
        if (index === -1) return prev;
        const current =
          prev[itemId] ?? getDefaultOutfitCanvasLayout(index, selectedOutfitItems.length);
        const maxZ = Math.max(...Object.values(prev).map((l) => l.zIndex), current.zIndex);
        return { ...prev, [itemId]: { ...current, zIndex: maxZ + 1 } };
      });
    },
    [selectedOutfitItems]
  );

  const handleSendBackward = useCallback(
    (itemId: string) => {
      setOutfitCanvasLayouts((prev) => {
        const index = selectedOutfitItems.findIndex((id) => id === itemId);
        if (index === -1) return prev;
        const current =
          prev[itemId] ?? getDefaultOutfitCanvasLayout(index, selectedOutfitItems.length);
        const minZ = Math.min(...Object.values(prev).map((l) => l.zIndex), current.zIndex);
        return { ...prev, [itemId]: { ...current, zIndex: minZ - 1 } };
      });
    },
    [selectedOutfitItems]
  );

  // ── Active-item derived maps (keyed only by currently-selected items) ────────

  const activeOutfitCanvasLayouts = useMemo(() => {
    if (selectedOutfitItems.length === 0) return {} as OutfitCanvasLayoutMap;
    const next: OutfitCanvasLayoutMap = {};
    for (const itemId of selectedOutfitItems) {
      const layout = outfitCanvasLayouts[itemId];
      if (layout) next[itemId] = layout;
    }
    return next;
  }, [outfitCanvasLayouts, selectedOutfitItems]);

  const activeOutfitCanvasTrims = useMemo(() => {
    if (selectedOutfitItems.length === 0) return {} as OutfitCanvasTrimMap;
    const next: OutfitCanvasTrimMap = {};
    for (const itemId of selectedOutfitItems) {
      const trim = outfitCanvasTrims[itemId];
      if (trim) next[itemId] = trim;
    }
    return next;
  }, [outfitCanvasTrims, selectedOutfitItems]);

  const activeOutfitCanvasTrimStatuses = useMemo(() => {
    if (selectedOutfitItems.length === 0) return {} as OutfitCanvasTrimStatusMap;
    const next: OutfitCanvasTrimStatusMap = {};
    for (const itemId of selectedOutfitItems) {
      if (outfitCanvasTrims[itemId]) {
        next[itemId] = 'success';
        continue;
      }
      next[itemId] =
        outfitCanvasTrimStatuses[itemId] ?? (isCreatorExpanded ? 'pending' : 'idle');
    }
    return next;
  }, [isCreatorExpanded, outfitCanvasTrimStatuses, outfitCanvasTrims, selectedOutfitItems]);

  const hasCustomCreatorLayout = useMemo(
    () =>
      Object.keys(activeOutfitCanvasLayouts).length > 0 ||
      Object.keys(activeOutfitCanvasTrims).length > 0,
    [activeOutfitCanvasLayouts, activeOutfitCanvasTrims]
  );

  const unresolvedTrimCount = useMemo(
    () =>
      selectedOutfitItems.filter((itemId) => {
        const status = activeOutfitCanvasTrimStatuses[itemId];
        return status === 'idle' || status === 'pending';
      }).length,
    [selectedOutfitItems, activeOutfitCanvasTrimStatuses]
  );

  const successTrimCount = useMemo(
    () =>
      selectedOutfitItems.filter(
        (itemId) => activeOutfitCanvasTrimStatuses[itemId] === 'success'
      ).length,
    [selectedOutfitItems, activeOutfitCanvasTrimStatuses]
  );
  const isCanvasPreparing =
    isCreatorExpanded &&
    selectedOutfitItems.length > 0 &&
    successTrimCount === 0 &&
    unresolvedTrimCount > 0;

  return {
    outfitCanvasLayouts,
    setOutfitCanvasLayouts,
    outfitCanvasTrims,
    setOutfitCanvasTrims,
    outfitCanvasTrimStatuses,
    setOutfitCanvasTrimStatuses,
    handleCanvasLayoutChange,
    handleBringForward,
    handleSendBackward,
    // Derived active-item maps
    activeOutfitCanvasLayouts,
    activeOutfitCanvasTrims,
    activeOutfitCanvasTrimStatuses,
    hasCustomCreatorLayout,
    isCanvasPreparing,
  };
}
