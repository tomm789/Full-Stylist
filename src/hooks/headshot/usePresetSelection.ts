/**
 * usePresetSelection
 * Manages hair/makeup preset selection state and derived values.
 * Self-contained: no external hook dependencies.
 */

import { useState, useMemo } from 'react';
import { hairPresets } from '@/lib/headshot/hairPresets';
import { makeupPresets } from '@/lib/headshot/makeupPresets';
import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';
import type { SelectionPill } from '@/components/headshots/HeadshotCreatorContainer';
import {
  ADVANCED_FIELDS,
  ACCESSORY_SUBCATEGORIES,
  JEWELLERY_SUBCATEGORIES,
  type EditTab,
  type TabId,
} from './useHairAndMakeup';

// ── Internal preset utility functions ────────────────────────────────────────

function findPresetOptionById(presets: PresetCategory[], optionId: string): PresetOption | null {
  for (const category of presets) {
    for (const section of category.sections) {
      const found = section.options.find((o) => o.id === optionId);
      if (found) return found;
    }
  }
  return null;
}

function findCategoryIdForOption(presets: PresetCategory[], optionId: string): string | null {
  for (const category of presets) {
    for (const section of category.sections) {
      if (section.options.some((o) => o.id === optionId)) return category.id;
    }
  }
  return null;
}

function findSectionIdForOption(presets: PresetCategory[], optionId: string): string | null {
  for (const category of presets) {
    for (const section of category.sections) {
      if (section.options.some((o) => o.id === optionId)) return section.id;
    }
  }
  return null;
}

function getOptionIdsForSection(presets: PresetCategory[], sectionId: string): string[] {
  for (const category of presets) {
    const section = category.sections.find((s) => s.id === sectionId);
    if (section) return section.options.map((o) => o.id);
  }
  return [];
}

const HAIR_COLOR_CATEGORY_ID = 'hair-color';
const MAX_HAIR_COLORS = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

type BaselineInput = {
  hairPresetIds: string[];
  makeupPresetIds: string[];
  customDescription: string;
};

export type UsePresetSelectionParams = {
  editTab: EditTab;
  activeTab: TabId;
  /** Active category ID from main hook — needed to compute isCustomCategory. */
  activeCategoryId: string | null;
};

const CUSTOM_CATEGORY_ID_LOCAL = 'custom';

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePresetSelection({ editTab, activeTab, activeCategoryId }: UsePresetSelectionParams) {
  const emptyAdvanced = Object.fromEntries(ADVANCED_FIELDS.map((f) => [f.id, '']));

  const [selectedHair, setSelectedHair] = useState<string[]>([]);
  const [selectedMakeup, setSelectedMakeup] = useState<string[]>([]);
  const [customDescription, setCustomDescription] = useState('');
  const [accessorySubcategory, setAccessorySubcategory] = useState<string | null>(null);
  const [jewellerySubcategory, setJewellerySubcategory] = useState<string | null>(null);
  const [advancedFields, setAdvancedFields] = useState<Record<string, string>>(emptyAdvanced);
  const [baselineInput, setBaselineInput] = useState<BaselineInput>({
    hairPresetIds: [],
    makeupPresetIds: [],
    customDescription: '',
  });

  const setAdvancedField = (key: string, value: string) =>
    setAdvancedFields((prev) => ({ ...prev, [key]: value }));

  // ── Toggle handlers ─────────────────────────────────────────────────────────

  const toggleHairSelection = (optionId: string) => {
    const isColor = findCategoryIdForOption(hairPresets, optionId) === HAIR_COLOR_CATEGORY_ID;

    setSelectedHair((prev) => {
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);

      if (isColor) {
        const colorIds = prev.filter(
          (id) => findCategoryIdForOption(hairPresets, id) === HAIR_COLOR_CATEGORY_ID
        );
        const nonColorIds = prev.filter(
          (id) => findCategoryIdForOption(hairPresets, id) !== HAIR_COLOR_CATEGORY_ID
        );
        const nextColors =
          colorIds.length >= MAX_HAIR_COLORS
            ? [...colorIds.slice(1), optionId]
            : [...colorIds, optionId];
        return [...nonColorIds, ...nextColors];
      }

      const colorIds = prev.filter(
        (id) => findCategoryIdForOption(hairPresets, id) === HAIR_COLOR_CATEGORY_ID
      );
      return [...colorIds, optionId];
    });
  };

  const toggleMakeupSelection = (optionId: string) => {
    const sectionId = findSectionIdForOption(makeupPresets, optionId);

    setSelectedMakeup((prev) => {
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);
      if (!sectionId) return [...prev, optionId];
      const sameSectionIds = getOptionIdsForSection(makeupPresets, sectionId);
      const filtered = prev.filter((id) => !sameSectionIds.includes(id));
      return [...filtered, optionId];
    });
  };

  const toggleSelection = (optionId: string) => {
    if (editTab === 'quick') {
      if (findPresetOptionById(hairPresets, optionId)) {
        toggleHairSelection(optionId);
      } else {
        toggleMakeupSelection(optionId);
      }
    } else if (activeTab === 'hair') {
      toggleHairSelection(optionId);
    } else {
      toggleMakeupSelection(optionId);
    }
  };

  const handleRemoveCreatorSelection = (id: string) => {
    if (id === 'custom') { setCustomDescription(''); return; }
    if (id.startsWith('acc-')) { setAccessorySubcategory(null); return; }
    if (id.startsWith('jew-')) { setJewellerySubcategory(null); return; }
    if (id.startsWith('adv-')) { setAdvancedField(id.slice(4), ''); return; }
    if (selectedHair.includes(id)) { setSelectedHair((prev) => prev.filter((i) => i !== id)); return; }
    setSelectedMakeup((prev) => prev.filter((i) => i !== id));
  };

  // ── Derived values ──────────────────────────────────────────────────────────

  const selectedIds =
    editTab === 'quick'
      ? [...selectedHair, ...selectedMakeup]
      : activeTab === 'hair' ? selectedHair : selectedMakeup;

  const isCustomCategory =
    editTab === 'quick' ||
    ((editTab === 'hair' || editTab === 'makeup') && activeCategoryId === CUSTOM_CATEGORY_ID_LOCAL);

  const advancedHasValues = useMemo(
    () => Object.values(advancedFields).some((v) => v.trim().length > 0),
    [advancedFields],
  );

  const hasSelections = useMemo(
    () =>
      selectedHair.length > 0 ||
      selectedMakeup.length > 0 ||
      customDescription.trim().length > 0 ||
      accessorySubcategory !== null ||
      jewellerySubcategory !== null ||
      advancedHasValues,
    [selectedHair, selectedMakeup, customDescription, accessorySubcategory, jewellerySubcategory, advancedHasValues],
  );

  const creatorSelections = useMemo((): SelectionPill[] => {
    const pills: SelectionPill[] = [];
    for (const id of selectedHair) {
      const option = findPresetOptionById(hairPresets, id);
      if (option) pills.push({ id, label: option.title, type: 'hair' });
    }
    for (const id of selectedMakeup) {
      const option = findPresetOptionById(makeupPresets, id);
      if (option) pills.push({ id, label: option.title, type: 'makeup' });
    }
    if (customDescription.trim()) {
      const trimmed = customDescription.trim();
      const label = trimmed.length > 30 ? trimmed.slice(0, 30) + '...' : trimmed;
      pills.push({ id: 'custom', label: `Custom: ${label}`, type: 'custom' });
    }
    if (accessorySubcategory) {
      const sub = ACCESSORY_SUBCATEGORIES.find((s) => s.id === accessorySubcategory);
      if (sub) pills.push({ id: `acc-${sub.id}`, label: sub.name, type: 'custom' });
    }
    if (jewellerySubcategory) {
      const sub = JEWELLERY_SUBCATEGORIES.find((s) => s.id === jewellerySubcategory);
      if (sub) pills.push({ id: `jew-${sub.id}`, label: sub.name, type: 'custom' });
    }
    for (const field of ADVANCED_FIELDS) {
      const val = advancedFields[field.id]?.trim();
      if (val) {
        const label = val.length > 25 ? val.slice(0, 25) + '...' : val;
        pills.push({ id: `adv-${field.id}`, label: `${field.label}: ${label}`, type: 'custom' });
      }
    }
    return pills;
  }, [selectedHair, selectedMakeup, customDescription, accessorySubcategory, jewellerySubcategory, advancedFields]);

  const isDirty = useMemo(() => {
    const sortIds = (ids: string[]) => [...ids].sort().join(',');
    return (
      sortIds(selectedHair) !== sortIds(baselineInput.hairPresetIds) ||
      sortIds(selectedMakeup) !== sortIds(baselineInput.makeupPresetIds) ||
      (customDescription || '') !== (baselineInput.customDescription || '') ||
      accessorySubcategory !== null ||
      jewellerySubcategory !== null ||
      advancedHasValues
    );
  }, [selectedHair, selectedMakeup, customDescription, baselineInput, accessorySubcategory, jewellerySubcategory, advancedHasValues]);

  // ── Display helpers ─────────────────────────────────────────────────────────

  const formatCategoryLabel = (label: string) => {
    if (activeTab !== 'hair') return label;
    const cleaned = label.replace(/\bhairstyles?\b/gi, '').replace(/\s+/g, ' ').trim();
    return cleaned || label;
  };

  const customDescriptionCopy =
    editTab === 'quick'
      ? 'Describe your look or combine with presets for additional refinements.'
      : activeTab === 'hair'
      ? 'Describe your hairstyle or combine it with a preset for additional refinements.'
      : 'Describe your makeup or combine it with a preset for additional refinements.';

  const customPlaceholder =
    activeTab === 'hair'
      ? 'e.g., long wavy hair with soft layers, curtain bangs'
      : 'e.g., soft glam with glossy lips, warm brown smoky eye';

  return {
    // State
    selectedHair,
    setSelectedHair,
    selectedMakeup,
    setSelectedMakeup,
    customDescription,
    setCustomDescription,
    accessorySubcategory,
    setAccessorySubcategory,
    jewellerySubcategory,
    setJewellerySubcategory,
    advancedFields,
    setAdvancedField,
    setAdvancedFields,
    baselineInput,
    setBaselineInput,
    // Derived
    selectedIds,
    isCustomCategory,
    advancedHasValues,
    hasSelections,
    creatorSelections,
    isDirty,
    // Handlers
    toggleSelection,
    toggleHairSelection,
    toggleMakeupSelection,
    handleRemoveCreatorSelection,
    // Display
    formatCategoryLabel,
    customDescriptionCopy,
    customPlaceholder,
  };
}
