/**
 * DeleteAccountModal Component
 * Confirmation modal for permanently deleting an account
 * Requires typing "DELETE" to confirm
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const isConfirmed = confirmText === 'DELETE';

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={40} color={colors.error} />
            </View>
            <Text style={styles.title}>Delete Account Permanently</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.warningText}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.description}>
              Permanently deleting your account will remove:
            </Text>

            <View style={styles.infoItem}>
              <Ionicons name="close-circle" size={18} color={colors.error} />
              <Text style={styles.infoText}>Your profile and settings</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="close-circle" size={18} color={colors.error} />
              <Text style={styles.infoText}>All outfits, lookbooks, and images</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="close-circle" size={18} color={colors.error} />
              <Text style={styles.infoText}>Posts, comments, likes, and saves</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="close-circle" size={18} color={colors.error} />
              <Text style={styles.infoText}>All followers and following connections</Text>
            </View>
          </View>

          {/* Confirmation Input */}
          <View style={styles.confirmSection}>
            <Text style={styles.confirmLabel}>
              Type <Text style={styles.confirmKeyword}>DELETE</Text> to confirm:
            </Text>
            <TextInput
              style={[
                styles.confirmInput,
                isConfirmed && styles.confirmInputValid,
              ]}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type DELETE"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                (!isConfirmed || loading) && styles.deleteButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isConfirmed || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textLight} />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Permanently</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    padding: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#fff0f0',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  confirmSection: {
    marginBottom: spacing.xxl,
  },
  confirmLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  confirmKeyword: {
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  confirmInputValid: {
    borderColor: colors.error,
    backgroundColor: '#fff0f0',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  deleteButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
});
