/**
 * AccountDangerZone Component
 * Sign out, deactivate, and delete account actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/styles';

interface AccountDangerZoneProps {
  onSignOut: () => Promise<void>;
  onDeactivate: () => void;
  onDelete: () => void;
}

export function AccountDangerZone({ onSignOut, onDeactivate, onDelete }: AccountDangerZoneProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Account</Text>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.textLight} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      <Text style={styles.dangerTitle}>Danger Zone</Text>

      {/* Deactivate Account */}
      <TouchableOpacity style={styles.deactivateButton} onPress={onDeactivate}>
        <Ionicons name="pause-circle-outline" size={20} color={colors.warning} />
        <View style={styles.buttonTextContainer}>
          <Text style={styles.deactivateText}>Deactivate Account</Text>
          <Text style={styles.buttonDescription}>
            Temporarily hide your profile. Data preserved for 90 days.
          </Text>
        </View>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={20} color={colors.error} />
        <View style={styles.buttonTextContainer}>
          <Text style={styles.deleteText}>Delete Account Permanently</Text>
          <Text style={styles.buttonDescription}>
            Permanently remove all data. This cannot be undone.
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  signOutText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xxl,
  },
  dangerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.md,
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  deactivateText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
  },
  deleteText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.tight,
  },
});
