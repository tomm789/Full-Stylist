/**
 * EditProfileModal Component
 * Modal for editing profile (handle, display name, avatar)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  modalBody: {
    padding: spacing.xl,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  avatarEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  sectionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.relaxed,
    marginBottom: spacing.sm,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  clearButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
  },
  headshotRow: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  headshotCard: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  headshotCardSelected: {
    borderColor: colors.primary,
  },
  headshotImage: {
    width: '100%',
    height: '100%',
  },
  newHeadshotCard: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  newHeadshotText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.backgroundSecondary,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  handle: string;
  displayName: string;
  headshotUrl: string | null;
  headshotOptions: Array<{ id: string; url: string }>;
  selectedAvatarUrl: string | null;
  onHandleChange: (text: string) => void;
  onDisplayNameChange: (text: string) => void;
  onSelectAvatar: (url: string) => void;
  onClearAvatar: () => void;
  onCreateHeadshot: () => void;
  onSave: () => void;
  saving: boolean;
}

export function EditProfileModal({
  visible,
  onClose,
  handle,
  displayName,
  headshotUrl,
  headshotOptions,
  selectedAvatarUrl,
  onHandleChange,
  onDisplayNameChange,
  onSelectAvatar,
  onClearAvatar,
  onCreateHeadshot,
  onSave,
  saving,
}: EditProfileModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const avatarUrl = selectedAvatarUrl || headshotUrl;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.avatarPreview}>
              {avatarUrl ? (
                <ExpoImage
                  source={{ uri: avatarUrl }}
                  style={styles.avatarEdit}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person-circle-outline" size={100} color={colors.textTertiary} />
              )}
            </View>

            <Text style={styles.sectionLabel}>Profile Photo</Text>
            {avatarUrl && (
              <TouchableOpacity style={styles.clearButton} onPress={onClearAvatar}>
                <Text style={styles.clearButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.headshotRow}
            >
              {headshotOptions.map((headshot) => {
                const isSelected = headshot.url === avatarUrl;
                return (
                  <TouchableOpacity
                    key={headshot.id}
                    style={[styles.headshotCard, isSelected && styles.headshotCardSelected]}
                    onPress={() => onSelectAvatar(headshot.url)}
                  >
                    <ExpoImage
                      source={{ uri: headshot.url }}
                      style={styles.headshotImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.newHeadshotCard} onPress={onCreateHeadshot}>
                <Ionicons name="add" size={24} color={colors.primary} />
                <Text style={styles.newHeadshotText}>New</Text>
              </TouchableOpacity>
            </ScrollView>

            <Text style={styles.label}>Handle (username)</Text>
            <TextInput
              style={styles.input}
              placeholder="yourhandle"
              value={handle}
              onChangeText={onHandleChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
            <Text style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              value={displayName}
              onChangeText={onDisplayNameChange}
              editable={!saving}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
