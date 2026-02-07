import React from 'react';
import { CalendarDatePickerModal, CalendarDayEntryForm, CreatePresetModal } from '@/components/calendar';
import type { useCalendarDayForm } from '@/hooks/calendar';

export type OutfitsCalendarModalsProps = {
  showDatePickerModal: boolean;
  onCloseDatePicker: () => void;
  onSelectDate: (date: Date) => void;
  form: ReturnType<typeof useCalendarDayForm>;
  presets: any[];
  loadingEntriesForDate: boolean;
  createPreset: (name: string) => Promise<{ data: any; error: any }>;
};

export function OutfitsCalendarModals({
  showDatePickerModal,
  onCloseDatePicker,
  onSelectDate,
  form,
  presets,
  loadingEntriesForDate,
  createPreset,
}: OutfitsCalendarModalsProps) {
  return (
    <>
      <CalendarDatePickerModal
        visible={showDatePickerModal}
        onClose={onCloseDatePicker}
        onSelectDate={onSelectDate}
      />

      <CalendarDayEntryForm
        visible={form.showAddModal}
        editingEntry={form.editingEntry}
        presets={presets}
        outfits={[]}
        outfitImages={new Map()}
        showOutfitPicker={false}
        selectedPreset={form.selectedPreset}
        selectedOutfit={form.selectedOutfit}
        entryStatus={form.entryStatus}
        editNotes={form.editNotes}
        saving={form.saving || loadingEntriesForDate}
        onClose={form.handleCloseModal}
        onSelectPreset={form.setSelectedPreset}
        onSelectOutfit={form.setSelectedOutfit}
        onStatusChange={form.setEntryStatus}
        onNotesChange={form.setEditNotes}
        onSubmit={form.editingEntry ? form.handleUpdateEntry : form.handleAddEntry}
        onCreatePreset={() => form.setShowCreatePresetModal(true)}
      />

      <CreatePresetModal
        visible={form.showCreatePresetModal}
        presetName={form.newPresetName}
        onPresetNameChange={form.setNewPresetName}
        onCreate={() => form.handleCreatePreset(createPreset)}
        onClose={() => {
          form.setShowCreatePresetModal(false);
          form.setNewPresetName('');
        }}
      />
    </>
  );
}
