export type OutfitScheduleStatus = 'planned' | 'worn' | 'skipped';

export type ScheduleInfo = {
  overlayLabel: string;
  statusLabel: string;
  status: OutfitScheduleStatus | null;
};
