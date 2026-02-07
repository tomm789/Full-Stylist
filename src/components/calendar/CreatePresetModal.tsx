/**
 * CreatePresetModal Component
 * Modal for creating a new slot preset
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Input, PrimaryButton } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius } = theme;

interface CreatePresetModalProps {
  visible: boolean;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onCreate: () => Promise<void>;
  onClose: () => void;
}

export function CreatePresetModal({
  visible,
  presetName,
  onPresetNameChange,
  onCreate,
  onClose,
}: CreatePresetModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Slot Preset</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.label}>Preset Name *</Text>
            <Input
              value={presetName}
              onChangeText={onPresetNameChange}
              placeholder="e.g. Gym, Date Night, Casual"
            />
            <PrimaryButton
              title="Create"
              onPress={onCreate}
              disabled={!presetName.trim()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
