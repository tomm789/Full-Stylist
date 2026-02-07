/**
 * LookbookPickerModal Component
 * Modal for creating a new lookbook or adding outfits to an existing one.
 */

import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

type VisibilityOption = 'public' | 'followers' | 'private_link';

type LookbookItem = {
  id: string;
  title?: string | null;
};

type LookbookPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  lookbookTitle: string;
  onChangeTitle: (value: string) => void;
  lookbookDescription: string;
  onChangeDescription: (value: string) => void;
  lookbookVisibility: VisibilityOption;
  onChangeVisibility: (value: VisibilityOption) => void;
  lookbookSaving: boolean;
  selectedOutfitCount: number;
  onCreate: () => Promise<void> | void;
  userLookbooks: LookbookItem[];
  loadingLookbooks: boolean;
  selectedLookbookId: string | null;
  onSelectLookbook: (lookbookId: string) => void;
  onAddToExisting: () => Promise<void> | void;
};

export default function LookbookPickerModal({
  visible,
  onClose,
  lookbookTitle,
  onChangeTitle,
  lookbookDescription,
  onChangeDescription,
  lookbookVisibility,
  onChangeVisibility,
  lookbookSaving,
  selectedOutfitCount,
  onCreate,
  userLookbooks,
  loadingLookbooks,
  selectedLookbookId,
  onSelectLookbook,
  onAddToExisting,
}: LookbookPickerModalProps) {
  const disableCreate =
    lookbookSaving || selectedOutfitCount === 0 || !lookbookTitle.trim();
  const disableAddExisting =
    lookbookSaving || selectedOutfitCount === 0 || !selectedLookbookId;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.lookbookPickerOverlay}>
        <View style={styles.lookbookPickerModal}>
          <View style={styles.lookbookPickerHeader}>
            <Text style={styles.lookbookPickerTitle}>Add to Lookbook</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.lookbookPickerClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.lookbookPickerContent}>
            <Text style={styles.lookbookSectionTitle}>Create New</Text>
            <Text style={styles.lookbookLabel}>Title *</Text>
            <TextInput
              style={styles.lookbookInput}
              placeholder="Enter lookbook title"
              value={lookbookTitle}
              onChangeText={onChangeTitle}
              maxLength={100}
            />
            <Text style={styles.lookbookLabel}>Description</Text>
            <TextInput
              style={[styles.lookbookInput, styles.lookbookTextArea]}
              placeholder="Enter description (optional)"
              value={lookbookDescription}
              onChangeText={onChangeDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.lookbookLabel}>Visibility</Text>
            <View style={styles.visibilitySelector}>
              {(['public', 'followers', 'private_link'] as VisibilityOption[]).map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.visibilityOption,
                      lookbookVisibility === option && styles.visibilityOptionActive,
                    ]}
                    onPress={() => onChangeVisibility(option)}
                  >
                    <Text
                      style={[
                        styles.visibilityOptionText,
                        lookbookVisibility === option &&
                          styles.visibilityOptionTextActive,
                      ]}
                    >
                      {option === 'private_link'
                        ? 'Private Link'
                        : option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.lookbookPrimaryButton,
                disableCreate && styles.lookbookPrimaryButtonDisabled,
              ]}
              disabled={disableCreate}
              onPress={onCreate}
            >
              <Text style={styles.lookbookPrimaryButtonText}>
                {lookbookSaving ? 'Saving...' : `Create Lookbook (${selectedOutfitCount})`}
              </Text>
            </TouchableOpacity>

            <View style={styles.lookbookDivider} />

            <Text style={styles.lookbookSectionTitle}>Add to Existing</Text>
            {loadingLookbooks ? (
              <View style={styles.lookbookPickerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={userLookbooks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.lookbookPickerItem,
                      selectedLookbookId === item.id &&
                        styles.lookbookPickerItemActive,
                    ]}
                    onPress={() => onSelectLookbook(item.id)}
                  >
                    <Text
                      style={[
                        styles.lookbookPickerItemText,
                        selectedLookbookId === item.id &&
                          styles.lookbookPickerItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title || 'Untitled lookbook'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.lookbookPickerEmpty}>
                    <Text style={styles.lookbookPickerEmptyText}>
                      No manual lookbooks yet
                    </Text>
                  </View>
                }
                style={styles.lookbookPickerList}
              />
            )}
            <TouchableOpacity
              style={[
                styles.lookbookSecondaryButton,
                disableAddExisting && styles.lookbookSecondaryButtonDisabled,
              ]}
              disabled={disableAddExisting}
              onPress={onAddToExisting}
            >
              <Text style={styles.lookbookSecondaryButtonText}>
                {lookbookSaving ? 'Saving...' : `Add Outfits (${selectedOutfitCount})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  lookbookPickerContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  lookbookSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  lookbookLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  lookbookInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
  },
  lookbookTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  visibilitySelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  visibilityOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  visibilityOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  visibilityOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  lookbookPrimaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  lookbookPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  lookbookPrimaryButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  lookbookDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },
  lookbookSecondaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  lookbookSecondaryButtonDisabled: {
    opacity: 0.5,
  },
  lookbookSecondaryButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  lookbookPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookbookPickerModal: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  lookbookPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lookbookPickerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  lookbookPickerClose: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  lookbookPickerItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  lookbookPickerItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  lookbookPickerItemText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  lookbookPickerItemTextActive: {
    fontWeight: typography.fontWeight.semibold,
  },
  lookbookPickerEmpty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  lookbookPickerEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  lookbookPickerLoading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  lookbookPickerList: {
    maxHeight: 240,
  },
});
