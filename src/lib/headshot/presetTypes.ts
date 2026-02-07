export type PresetOption = {
  id: string;
  title: string;
  description: string;
};

export type PresetSection = {
  id: string;
  title: string;
  options: PresetOption[];
};

export type PresetCategory = {
  id: string;
  title: string;
  sections: PresetSection[];
};
