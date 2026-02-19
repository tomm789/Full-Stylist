import { hairPresets } from './hairPresets';
import { makeupPresets } from './makeupPresets';
import type { PresetCategory } from './presetTypes';

export type ResolvedPresetLabel = {
  id: string;
  label: string;
  type: 'hair' | 'makeup';
};

function searchPresets(
  presets: PresetCategory[],
  optionId: string
): string | null {
  for (const category of presets) {
    for (const section of category.sections) {
      const found = section.options.find((o) => o.id === optionId);
      if (found) return found.title;
    }
  }
  return null;
}

/**
 * Resolves an array of preset option IDs to human-readable labels
 * by searching both hair and makeup preset banks.
 */
export function resolvePresetLabels(
  presetIds: string[]
): ResolvedPresetLabel[] {
  return presetIds
    .map((id) => {
      const hairLabel = searchPresets(hairPresets, id);
      if (hairLabel) return { id, label: hairLabel, type: 'hair' as const };

      const makeupLabel = searchPresets(makeupPresets, id);
      if (makeupLabel) return { id, label: makeupLabel, type: 'makeup' as const };

      return null;
    })
    .filter((item): item is ResolvedPresetLabel => item !== null);
}
