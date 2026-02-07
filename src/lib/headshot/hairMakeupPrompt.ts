import { hairPresets } from './hairPresets';
import { makeupPresets } from './makeupPresets';
import type { PresetCategory, PresetOption } from './presetTypes';

type PromptInput = {
  hairPresetIds: string[];
  makeupPresetIds: string[];
  customDescription?: string;
};

const collectOptions = (
  presets: PresetCategory[],
  ids: string[]
): PresetOption[] => {
  const idSet = new Set(ids);
  const options: PresetOption[] = [];

  presets.forEach((category) => {
    category.sections.forEach((section) => {
      section.options.forEach((option) => {
        if (idSet.has(option.id)) {
          options.push(option);
        }
      });
    });
  });

  return options;
};

const formatOptionLine = (option: PresetOption) =>
  `${option.title}: ${option.description}`;

export function buildHairMakeupPrompt({
  hairPresetIds,
  makeupPresetIds,
  customDescription,
}: PromptInput): string {
  const hairOptions = collectOptions(hairPresets, hairPresetIds);
  const makeupOptions = collectOptions(makeupPresets, makeupPresetIds);

  const lines: string[] = [];

  if (hairOptions.length > 0) {
    lines.push('HAIR:');
    hairOptions.forEach((option) => lines.push(`- ${formatOptionLine(option)}`));
  }

  if (makeupOptions.length > 0) {
    lines.push('MAKEUP:');
    makeupOptions.forEach((option) => lines.push(`- ${formatOptionLine(option)}`));
  }

  if (customDescription && customDescription.trim().length > 0) {
    lines.push('CUSTOM NOTES:');
    lines.push(customDescription.trim());
  }

  return lines.join('\n');
}
