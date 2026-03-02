/**
 * useOutfitsTabState
 * Encapsulates all tab-switching state for OutfitsScreen:
 * - active tab + view mode per tab
 * - URL param sync
 * - derived values (coreTab, activeView, headerPillActiveId, isLookbooksActive)
 * - handleTabChange (respects pinned lookbooks)
 */

import React, { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

export type OutfitsTab = 'my_outfits' | 'explore' | 'following' | 'lookbooks' | `lookbook_${string}`;
export type ViewMode = 'grid' | 'feed';

interface PinnedLookbook {
  id: string;
  title?: string;
}

interface UseOutfitsTabStateOptions {
  pinnedLookbooks: PinnedLookbook[];
}

export function useOutfitsTabState({ pinnedLookbooks }: UseOutfitsTabStateOptions) {
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<OutfitsTab>('my_outfits');
  const [tabViews, setTabViews] = useState<Record<string, ViewMode>>({
    my_outfits: 'grid',
    explore: 'grid',
    following: 'grid',
    lookbooks: 'grid',
  });

  // Sync from URL search param (e.g. deep links to /outfits?tab=explore)
  React.useEffect(() => {
    if (!tab) return;
    const nextTab = Array.isArray(tab) ? tab[0] : tab;
    if (
      nextTab === 'my_outfits' ||
      nextTab === 'explore' ||
      nextTab === 'following' ||
      nextTab === 'lookbooks'
    ) {
      setActiveTab(nextTab as OutfitsTab);
    }
  }, [tab]);

  // Narrow the active tab to the three fixed tabs understood by most hooks.
  // Lookbook-specific tabs map to 'my_outfits' since they reuse that UI.
  const coreTab: 'my_outfits' | 'explore' | 'following' =
    activeTab.startsWith('lookbook_') || activeTab === 'lookbooks'
      ? 'my_outfits'
      : (activeTab as 'my_outfits' | 'explore' | 'following');

  const activeView: ViewMode = tabViews[coreTab] ?? 'grid';

  const setActiveView = useCallback(
    (view: ViewMode) => {
      setTabViews((prev) => ({ ...prev, [activeTab]: view }));
    },
    [activeTab]
  );

  const headerPillActiveId = activeTab.startsWith('lookbook_') ? 'lookbooks' : activeTab;
  const isLookbooksActive = activeTab === 'lookbooks' || activeTab.startsWith('lookbook_');

  const handleTabChange = useCallback(
    (tab: OutfitsTab) => {
      setActiveTab(tab);
      setTabViews((prev) => ({ ...prev, [tab]: 'grid' }));
    },
    []
  );

  return {
    activeTab,
    setActiveTab,
    coreTab,
    activeView,
    setActiveView,
    headerPillActiveId,
    isLookbooksActive,
    handleTabChange,
  };
}
