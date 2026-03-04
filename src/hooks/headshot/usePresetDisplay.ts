/**
 * usePresetDisplay
 * Derives preset category lists and display values from the current tab state.
 * Inputs:  editTab, activeTab, activeCategoryId
 * Outputs: presets, categoryPills, quickTab*, hairColorCategory, activeCategory, handleInfoPress
 */

import React, { useMemo } from 'react';
import { showSuccessToast } from '@/utils/toast';
import { hairPresets } from '@/lib/headshot/hairPresets';
import { makeupPresets } from '@/lib/headshot/makeupPresets';
import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';
import {
  DEFAULT_HAIR_CATEGORY_ID,
  type EditTab,
  type TabId,
} from '@/lib/headshot/hairAndMakeupTypes';

type UsePresetDisplayParams = {
  editTab: EditTab;
  activeTab: TabId;
  activeCategoryId: string | null;
};

export function usePresetDisplay({ editTab, activeTab, activeCategoryId }: UsePresetDisplayParams) {
  const presets = useMemo<PresetCategory[]>(
    () => (activeTab === 'hair' ? hairPresets : makeupPresets),
    [activeTab]
  );

  const categoryPills = useMemo<PresetCategory[]>(() => {
    if (editTab !== 'hair' && editTab !== 'makeup') return [];
    const excludeIds =
      editTab === 'hair' ? ['hair-length', 'hair-color'] : ['major-aesthetics'];
    const filtered = presets.filter((c) => !excludeIds.includes(c.id));

    if (editTab !== 'hair') return filtered;
    const preferredOrder = [DEFAULT_HAIR_CATEGORY_ID, 'medium-hairstyles', 'short-hairstyles'];
    const preferred = preferredOrder
      .map((id) => filtered.find((c) => c.id === id))
      .filter((c): c is PresetCategory => Boolean(c));
    const remaining = filtered.filter((c) => !preferredOrder.includes(c.id));
    return [...preferred, ...remaining];
  }, [editTab, presets]);

  const quickTabHairPresets = useMemo<PresetCategory | null>(
    () => hairPresets.find((c) => c.id === 'hair-length') || null,
    []
  );

  const quickTabMakeupPresets = useMemo<PresetCategory | null>(
    () => makeupPresets.find((c) => c.id === 'major-aesthetics') || null,
    []
  );

  const quickTabPresets = useMemo<PresetCategory | null>(() => {
    if (editTab !== 'quick') {
      const targetId = editTab === 'hair' ? 'hair-length' : 'major-aesthetics';
      return presets.find((c) => c.id === targetId) || null;
    }
    return null;
  }, [editTab, presets]);

  const hairColorCategory = useMemo<PresetCategory | null>(() => {
    if (editTab !== 'haircolors') return null;
    return hairPresets.find((c) => c.id === 'hair-color') || null;
  }, [editTab]);

  const activeCategory = useMemo(() => {
    if (editTab !== 'hair' && editTab !== 'makeup') return null;
    if (presets.length === 0) return null;
    if (activeCategoryId === 'custom') return null;
    const found = presets.find((c) => c.id === activeCategoryId);
    return found || presets[0];
  }, [editTab, presets, activeCategoryId]);

  const handleInfoPress = React.useCallback((option: PresetOption) => {
    showSuccessToast(`${option.title}: ${option.description}`);
  }, []);

  return {
    presets,
    categoryPills,
    quickTabHairPresets,
    quickTabMakeupPresets,
    quickTabPresets,
    hairColorCategory,
    activeCategory,
    handleInfoPress,
  };
}
